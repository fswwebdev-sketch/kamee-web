/**
 * Handler MSW untuk seluruh endpoint publik & pelanggan (bagian 8).
 * Aturan harga, promo, poin, dan ongkir mengikuti PricingService kamee-api.
 */
import { delay, http, HttpResponse, type PathParams } from "msw";
import type {
  Customer,
  LoyaltyTransaction,
  Order,
  OrderPayload,
  OrderStatus,
  Payment,
  PaymentMethod,
  ProductDetail,
  Promotion,
  QuoteResult,
} from "@/types/api";
import { banners, blogCategories, blogs, categories, outlets, productGroups, products, promotions, reviews, tiers } from "./data";
import { db, nextId, persist } from "./db";

const API = "*/api/v1";
export const MOCK_OTP = "123456";
/** Pembayaran online di mock otomatis lunas setelah jeda ini (simulasi pelanggan membayar). */
export const MOCK_PAY_DELAY_MS = 6000;

type Json = Record<string, unknown>;

const ok = (data: unknown, init?: number | ResponseInit) =>
  HttpResponse.json(data as Json, typeof init === "number" ? { status: init } : init);

const fail = (status: number, message: string, errors?: Record<string, string[]>) =>
  HttpResponse.json({ message, ...(errors ? { errors } : {}) }, { status });

const invalid = (field: string, message: string) => fail(422, message, { [field]: [message] });

class MockError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>) {
    super(message);
  }
}
const reject = (field: string, message: string): never => {
  throw new MockError(422, message, { [field]: [message] });
};

function paginate<T>(list: T[], url: URL, defaultPer = 15) {
  const per = Math.min(50, Math.max(1, Number(url.searchParams.get("per_page") ?? defaultPer)));
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const total = list.length;
  return {
    data: list.slice((page - 1) * per, page * per),
    meta: { page, per_page: per, total, last_page: Math.max(1, Math.ceil(total / per)) },
  };
}

const rupiah = (n: number) => `Rp${new Intl.NumberFormat("id-ID").format(n)}`;
const normalizePhone = (p: string) => {
  const d = String(p).replace(/\D/g, "");
  return d.startsWith("62") ? d : d.startsWith("0") ? `62${d.slice(1)}` : d.startsWith("8") ? `62${d}` : d;
};
const nowIso = () => new Date().toISOString();

function customerFrom(request: Request): Customer | null {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  const id = token ? db().tokens[token] : undefined;
  return id ? db().customers.find((c) => c.id === id) ?? null : null;
}

function requireCustomer(request: Request): Customer {
  const c = customerFrom(request);
  if (!c) throw new MockError(401, "Sesi tidak valid atau Anda belum masuk.");
  return c;
}

function listProduct(p: ProductDetail, withOptions = false) {
  const { description: _d, composition: _c, calories: _k, rating_summary: _r, images: _i, option_groups, ...rest } = p;
  return withOptions ? { ...rest, option_groups } : rest;
}

/* ------------------------------------------------------------------ Harga */

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

function deliveryQuote(outletId: number, lat: number, lng: number) {
  const outlet = outlets.find((o) => o.id === outletId) ?? reject("outlet_id", "Outlet tidak ditemukan.");
  const distance = haversine(outlet.lat, outlet.lng, lat, lng);
  const fee = 8000 + Math.ceil(Math.max(0, distance - 2)) * 2500;
  return { outlet, distance, fee, within: distance <= outlet.delivery_radius_km };
}

function promoDiscount(promo: Promotion, subtotal: number, lines: { qty: number; unit: number }[], deliveryFee: number) {
  let d = 0;
  if (promo.type === "percent") d = Math.floor((subtotal * promo.value) / 100);
  if (promo.type === "fixed") d = promo.value;
  if (promo.type === "bogo") d = lines.reduce((s, l) => s + Math.floor(l.qty / 2) * l.unit, 0);
  if (promo.type === "free_delivery") d = deliveryFee;
  if (promo.max_discount != null) d = Math.min(d, promo.max_discount);
  return Math.max(0, Math.min(d, promo.type === "free_delivery" ? deliveryFee : subtotal));
}

function evaluatePromo(code: string, subtotal: number, outletId: number | null, phone: string | null, field: string) {
  const promo = promotions.find((p) => p.code === code.trim().toUpperCase());
  if (!promo) reject(field, "Kode voucher tidak ditemukan atau sudah tidak berlaku.");
  if (promo!.outlet_id && outletId && promo!.outlet_id !== outletId) reject(field, "Voucher ini tidak berlaku di outlet yang dipilih.");
  if (subtotal < promo!.min_spend) reject(field, `Minimal belanja ${rupiah(promo!.min_spend)} untuk memakai voucher ini.`);
  const used = (db().promoUsage[promo!.code!] ?? []).filter((u) => phone && u.phone === phone).length;
  if (promo!.per_customer_limit && phone && used >= promo!.per_customer_limit) reject(field, "Anda sudah mencapai batas pemakaian voucher ini.");
  return promo!;
}

function quote(payload: OrderPayload, customer: Customer | null): QuoteResult {
  const outlet = outlets.find((o) => o.id === payload.outlet_id) ?? reject("outlet_id", "Outlet tidak ditemukan.");
  if (!payload.items?.length) reject("items", "Keranjang masih kosong.");
  const errors: Record<string, string[]> = {};

  const lines = payload.items.map((item, i) => {
    const p = products.find((x) => x.id === item.product_id);
    if (!p) {
      errors[`items.${i}.product_id`] = ["Produk tidak ditemukan atau sudah tidak dijual."];
      return null;
    }
    const groups = productGroups[p.id] ?? [];
    const allowed = new Map(groups.flatMap((g) => g.options.map((o) => [o.id, { ...o, group: g }] as const)));
    const chosen = (item.option_ids ?? []).map((id) => allowed.get(id));
    const optErrors: string[] = [];
    (item.option_ids ?? []).forEach((id, k) => !chosen[k] && optErrors.push(`Opsi #${id} tidak tersedia untuk ${p.name}.`));
    for (const g of groups) {
      const n = chosen.filter((o) => o?.group.id === g.id).length;
      if (g.type === "single" && n > 1) optErrors.push(`Pilih hanya satu opsi ${g.name}.`);
      if (g.is_required && n === 0) optErrors.push(`Opsi ${g.name} wajib dipilih.`);
    }
    if (optErrors.length) {
      errors[`items.${i}.option_ids`] = optErrors;
      return null;
    }
    const opts = chosen.filter(Boolean) as NonNullable<(typeof chosen)[number]>[];
    const unit = p.base_price + opts.reduce((s, o) => s + o.price_delta, 0);
    return { p, qty: item.qty, unit, opts, note: item.note ?? null };
  });
  if (Object.keys(errors).length) throw new MockError(422, "Beberapa item di keranjang tidak valid.", errors);

  const valid = lines.filter(Boolean) as NonNullable<(typeof lines)[number]>[];
  const subtotal = valid.reduce((s, l) => s + l.unit * l.qty, 0);

  let deliveryFee = 0;
  let distance: number | null = null;
  if (payload.fulfillment === "delivery") {
    if (payload.address?.lat == null || payload.address?.lng == null) reject("address", "Titik lokasi pengantaran wajib diisi.");
    const q = deliveryQuote(outlet.id, payload.address!.lat, payload.address!.lng);
    if (!q.within) reject("address", `Alamat berjarak ${q.distance} km, di luar jangkauan pengantaran ${outlet.name} (maks ${outlet.delivery_radius_km} km).`);
    deliveryFee = q.fee;
    distance = q.distance;
  }

  const phone = payload.customer?.phone ? normalizePhone(payload.customer.phone) : customer?.phone_wa ?? null;
  let discount = 0;
  let promotion: QuoteResult["promotion"] = null;
  if (payload.promo_code) {
    const promo = evaluatePromo(payload.promo_code, subtotal, outlet.id, phone, "promo_code");
    discount = promoDiscount(promo, subtotal, valid.map((l) => ({ qty: l.qty, unit: l.unit })), deliveryFee);
    promotion = { id: promo.id, code: promo.code, name: promo.name };
  }

  let pointsValue = 0;
  const points = payload.redeem_points ?? 0;
  if (points > 0) {
    if (!customer) reject("redeem_points", "Masuk sebagai member untuk menukarkan poin.");
    if (points < 10) reject("redeem_points", "Minimal penukaran 10 poin.");
    if (points > customer!.points_balance) reject("redeem_points", `Poin tidak mencukupi. Saldo Anda ${customer!.points_balance} poin.`);
    const max = Math.min(customer!.points_balance, Math.floor(Math.floor(((subtotal - Math.min(discount, subtotal)) * 50) / 100) / 100));
    if (points > max) reject("redeem_points", `Maksimal ${max} poin dapat ditukar untuk pesanan ini.`);
    pointsValue = points * 100;
  }

  return {
    items: valid.map((l) => ({
      product_id: l.p.id,
      product_name: l.p.name,
      qty: l.qty,
      base_price: l.p.base_price,
      unit_price: l.unit,
      subtotal: l.unit * l.qty,
      options: l.opts.map((o) => ({ id: o.id, name: o.name, group: o.group.name, price_delta: o.price_delta })),
      note: l.note,
    })),
    subtotal,
    discount,
    promotion,
    points_redeemed: points,
    points_value: pointsValue,
    delivery_fee: deliveryFee,
    delivery_distance_km: distance,
    service_fee: 0,
    total: Math.max(0, subtotal + deliveryFee - discount - pointsValue),
  };
}

/* ------------------------------------------------------------------ Pesanan */

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Menunggu pembayaran", paid: "Sudah dibayar", processing: "Sedang diproses",
  shipped: "Dalam pengantaran", completed: "Selesai", cancelled: "Dibatalkan",
};
const FULFILLMENT_LABEL = { pickup: "Ambil di outlet", delivery: "Diantar", dine_in: "Makan di tempat" } as const;
const METHOD_LABEL: Record<PaymentMethod, string> = { qris: "QRIS", ewallet: "E-Wallet", bank_transfer: "Transfer Bank (VA)", cash: "Tunai" };

function orderCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `KM${ymd}${Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")}`;
}

function setStatus(order: Order, status: OrderStatus, note: string) {
  order.status = status;
  order.status_label = STATUS_LABEL[status];
  order.timeline = [...(order.timeline ?? []), { status, note, at: nowIso() }];
  if (status === "paid") order.paid_at = nowIso();
  if (status === "completed") order.completed_at = nowIso();
}

function createOrder(payload: OrderPayload, customer: Customer | null, channel: Order["channel"]): Order {
  const q = quote(payload, customer);
  const outlet = outlets.find((o) => o.id === payload.outlet_id)!;
  const phone = normalizePhone(payload.customer.phone);
  const linked = customer ?? db().customers.find((c) => c.phone_wa === phone) ?? null;
  const order: Order = {
    id: nextId(),
    code: orderCode(),
    status: "pending",
    status_label: STATUS_LABEL.pending,
    channel,
    fulfillment: payload.fulfillment,
    fulfillment_label: FULFILLMENT_LABEL[payload.fulfillment],
    outlet: { id: outlet.id, name: outlet.name, phone_wa: outlet.phone_wa },
    customer_name: payload.customer.name.trim(),
    customer_phone: phone,
    address: payload.fulfillment === "delivery" ? `${payload.address!.text}${payload.address!.note ? ` (${payload.address!.note})` : ""}` : null,
    lat: payload.fulfillment === "delivery" ? payload.address!.lat : null,
    lng: payload.fulfillment === "delivery" ? payload.address!.lng : null,
    scheduled_at: payload.scheduled_at ?? null,
    subtotal: q.subtotal,
    discount: q.discount,
    points_redeemed: q.points_redeemed,
    points_discount: q.points_value,
    delivery_fee: q.delivery_fee,
    service_fee: q.service_fee,
    total: q.total,
    note: payload.note ?? null,
    cancelled_reason: null,
    items: q.items.map((it, i) => ({
      id: nextId() * 10 + i,
      product_id: it.product_id,
      product_name: it.product_name,
      unit_price: it.unit_price,
      qty: it.qty,
      subtotal: it.subtotal,
      note: it.note,
      options: it.options.map((o) => ({ name: `${o.group}: ${o.name}`, price_delta: o.price_delta })),
    })),
    payment: null,
    timeline: [{ status: "pending", note: `Pesanan dibuat via ${channel === "whatsapp" ? "WhatsApp" : "Website"}`, at: nowIso() }],
    paid_at: null,
    completed_at: null,
    created_at: nowIso(),
    ...(linked ? { customer_id: linked.id } : {}),
  } as Order;

  if (q.promotion?.code) (db().promoUsage[q.promotion.code] ??= []).push({ code: q.promotion.code, phone });
  if (q.points_redeemed && customer) addLoyalty(customer, "redeem", -q.points_redeemed, order.code, `Tukar poin untuk pesanan ${order.code}`);
  db().orders.unshift(order);
  persist();
  return order;
}

function addLoyalty(customer: Customer, type: LoyaltyTransaction["type"], points: number, orderCode: string | null, note: string) {
  customer.points_balance += points;
  const list = (db().loyalty[customer.id] ??= []);
  list.unshift({
    id: nextId(),
    type,
    type_label: { earn: "Poin didapat", redeem: "Poin ditukar", expire: "Poin kedaluwarsa", adjust: "Penyesuaian poin" }[type],
    points,
    balance_after: customer.points_balance,
    order_code: orderCode,
    note,
    expires_at: points > 0 ? new Date(Date.now() + 365 * 86400000).toISOString() : null,
    created_at: nowIso(),
  });
}

/** Simulasi alur pesanan di mock: lunas → diproses → (dikirim) → selesai. */
function advance(order: Order) {
  const s = db();
  const payment = s.payments.find((p) => p.order_code === order.code && p.status === "pending");
  if (payment && payment.method !== "cash" && Date.now() - payment.created_ms > MOCK_PAY_DELAY_MS) {
    payment.status = "paid";
    payment.status_label = "Berhasil";
    payment.paid_at = nowIso();
    setStatus(order, "paid", `Pembayaran ${payment.method_label} diterima`);
    order.payment = { ...payment };
    persist();
  }
  // Simulasi dapur & kurir agar halaman lacak pesanan terlihat hidup.
  const last = order.timeline?.at(-1);
  const since = last ? Date.now() - new Date(last.at).getTime() : 0;
  if (order.status === "paid" && since > 15000) setStatus(order, "processing", "Pesanan mulai disiapkan barista");
  else if (order.status === "processing" && since > 45000) {
    if (order.fulfillment === "delivery") setStatus(order, "shipped", "Kurir berangkat ke alamat Anda");
    else completeOrder(order);
  } else if (order.status === "shipped" && since > 45000) completeOrder(order);

  const deadline = new Date(order.created_at).getTime() + 15 * 60000;
  if (order.status === "pending" && !s.payments.some((p) => p.order_code === order.code && p.method === "cash") && Date.now() > deadline) {
    setStatus(order, "cancelled", "Dibatalkan otomatis: pembayaran melewati batas 15 menit.");
    order.cancelled_reason = "Dibatalkan otomatis: pembayaran melewati batas 15 menit.";
    persist();
  }
}

function completeOrder(order: Order) {
  setStatus(order, "completed", "Pesanan selesai");
  const customer = db().customers.find((c) => c.phone_wa === order.customer_phone);
  if (customer) {
    const points = Math.floor((order.total - order.delivery_fee) / 10000) * (customer.tier?.point_multiplier ?? 1);
    customer.lifetime_spend += order.total;
    if (points > 0) addLoyalty(customer, "earn", Math.floor(points), order.code, `Poin dari pesanan ${order.code}`);
  }
  persist();
}

function findOrder(code: string) {
  const order = db().orders.find((o) => o.code === code);
  if (!order) throw new MockError(404, "Data tidak ditemukan.");
  advance(order);
  return order;
}

function pay(order: Order, method: PaymentMethod, channel: string | null): Payment {
  if (order.status !== "pending") reject("order", "Pesanan tidak dalam status menunggu pembayaran.");
  const s = db();
  const deadline = new Date(new Date(order.created_at).getTime() + 15 * 60000).toISOString();
  const existing = s.payments.find((p) => p.order_code === order.code && p.status === "pending" && p.method === method);
  if (existing) return existing;
  s.payments.filter((p) => p.order_code === order.code && p.status === "pending").forEach((p) => (p.status = "expired"));
  const attempt = s.payments.filter((p) => p.order_code === order.code).length + 1;
  const payment = {
    id: nextId(),
    order_code: order.code,
    created_ms: Date.now(),
    method,
    method_label: METHOD_LABEL[method],
    provider: method === "cash" ? "cash" : "midtrans",
    reference: method === "cash" ? null : `${order.code}-${attempt}`,
    amount: order.total,
    status: "pending" as const,
    status_label: "Menunggu pembayaran",
    qr_string: method === "qris" ? `00020101021126610014COM.GO-JEK.WWW01189360091434${order.code}5204581253033605405${order.total}5802ID5913KAMEE COFFEE6009TANGERANG6304ABCD` : null,
    va_number: method === "bank_transfer" ? `${channel === "bni" ? "988" : channel === "bri" ? "262" : "127"}${String(order.id).padStart(10, "0")}` : null,
    bank: method === "bank_transfer" ? channel ?? "bca" : null,
    deeplink: method === "ewallet" ? `https://simulator.sandbox.midtrans.com/${channel ?? "gopay"}/ui/checkout?ref=${order.code}` : null,
    expires_at: method === "cash" ? null : deadline,
    paid_at: null,
  };
  s.payments.push(payment);
  order.payment = { ...payment };
  if (method === "cash") setStatus(order, "processing", "Bayar tunai di outlet");
  persist();
  return payment;
}

/** Idempotency-Key: kunci + isi sama → respons pertama diputar ulang. */
async function idempotent(request: Request, run: (body: unknown) => Promise<Response> | Response) {
  const key = request.headers.get("Idempotency-Key");
  if (!key) return invalid("Idempotency-Key", "Header Idempotency-Key wajib diisi.");
  const raw = await request.text();
  const cacheKey = `${new URL(request.url).pathname}|${key}`;
  const cached = db().idempotency[cacheKey] as { status: number; body: unknown; raw: string } | undefined;
  if (cached) {
    if (cached.raw !== raw) return invalid("Idempotency-Key", "Idempotency-Key sudah dipakai untuk permintaan dengan isi berbeda.");
    return HttpResponse.json(cached.body as Json, { status: cached.status, headers: { "Idempotent-Replayed": "true" } });
  }
  const response = await run(raw ? JSON.parse(raw) : {});
  const body = await response.clone().json();
  if (response.status < 500) {
    (db().idempotency as Record<string, unknown>)[cacheKey] = { status: response.status, body, raw };
    persist();
  }
  return response;
}

/** Bungkus handler: MockError → respons JSON error, plus jeda jaringan realistis. */
function route<P extends Record<string, string> = Record<string, string>>(fn: (ctx: { request: Request; params: P; url: URL }) => Promise<Response> | Response) {
  return async ({ request, params }: { request: Request; params: PathParams }) => {
    await delay(typeof window === "undefined" ? 0 : 180);
    try {
      return await fn({ request, params: params as unknown as P, url: new URL(request.url) });
    } catch (e) {
      if (e instanceof MockError) return fail(e.status, e.message, e.errors);
      throw e;
    }
  };
}

function validateOrderPayload(body: OrderPayload) {
  const errors: Record<string, string[]> = {};
  if (!body.outlet_id) errors.outlet_id = ["Outlet wajib diisi."];
  if (!body.customer?.name?.trim()) errors["customer.name"] = ["Nama pelanggan wajib diisi."];
  if (!/^628\d{7,12}$/.test(normalizePhone(body.customer?.phone ?? ""))) errors["customer.phone"] = ["Nomor WhatsApp tidak valid. Gunakan format 08xx atau 628xx."];
  if (!["pickup", "delivery", "dine_in"].includes(body.fulfillment)) errors.fulfillment = ["Jenis layanan yang dipilih tidak valid."];
  if (body.fulfillment === "delivery" && !body.address?.text) errors["address.text"] = ["Alamat wajib diisi."];
  if (!body.items?.length) errors.items = ["Item pesanan wajib diisi."];
  if (Object.keys(errors).length) throw new MockError(422, Object.values(errors)[0]![0]!, errors);
}

/* ------------------------------------------------------------------ Handlers */

export const handlers = [
  // Katalog
  http.get(`${API}/categories`, route(() => ok({
    data: categories.map((c) => ({ ...c, products_count: products.filter((p) => p.category?.id === c.id).length })),
  }))),

  http.get(`${API}/products`, route(({ url }) => {
    const sp = url.searchParams;
    let list = [...products];
    const cat = sp.get("filter[category]");
    if (cat) list = list.filter((p) => cat.split(",").includes(p.category!.slug));
    const search = (sp.get("search") ?? sp.get("filter[search]") ?? "").toLowerCase().trim();
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search));
    if (sp.get("filter[featured]") === "1" || sp.get("filter[featured]") === "true") list = list.filter((p) => p.is_featured);
    if (sp.get("filter[best_seller]") === "1" || sp.get("filter[best_seller]") === "true") list = list.filter((p) => p.is_best_seller);
    const sort = sp.get("sort") ?? "-sold_count";
    const dir = sort.startsWith("-") ? -1 : 1;
    const field = sort.replace("-", "");
    const key = (p: ProductDetail) => (field === "price" ? p.base_price : field === "rating" ? p.rating_avg : field === "name" ? p.name : p.sold_count);
    list.sort((a, b) => (key(a) > key(b) ? dir : key(a) < key(b) ? -dir : 0));
    const withOptions = (sp.get("include") ?? "").includes("options");
    const page = paginate(list, url, 12);
    return ok({ ...page, data: page.data.map((p) => listProduct(p, withOptions)) });
  })),

  http.get(`${API}/products/:slug`, route<{ slug: string }>(({ params }) => {
    const p = products.find((x) => x.slug === params.slug);
    return p ? ok({ data: p }) : fail(404, "Data tidak ditemukan.");
  })),

  http.get(`${API}/products/:slug/reviews`, route<{ slug: string }>(({ params, url }) => {
    const p = products.find((x) => x.slug === params.slug);
    if (!p) return fail(404, "Data tidak ditemukan.");
    const rating = Number(url.searchParams.get("rating") ?? 0);
    const list = (reviews[p.id] ?? []).filter((r) => !rating || r.rating === rating).map(({ product: _p, ...r }) => r);
    return ok(paginate(list, url, 10));
  })),

  http.get(`${API}/products/:slug/related`, route<{ slug: string }>(({ params }) => {
    const p = products.find((x) => x.slug === params.slug);
    if (!p) return fail(404, "Data tidak ditemukan.");
    const related = products.filter((x) => x.category?.id === p.category?.id && x.id !== p.id).sort((a, b) => b.sold_count - a.sold_count).slice(0, 8);
    return ok({ data: related.map((x) => listProduct(x, true)) });
  })),

  // Konten & promo
  http.get(`${API}/banners`, route(() => ok({ data: banners }))),
  http.get(`${API}/promotions`, route(() => ok({ data: promotions }))),

  http.post(`${API}/promotions/validate`, route(async ({ request }) => {
    const body = (await request.json()) as { code?: string; subtotal?: number; outlet_id?: number; delivery_fee?: number };
    if (!body.code) return invalid("code", "Kode wajib diisi.");
    const customer = customerFrom(request);
    const promo = evaluatePromo(body.code, body.subtotal ?? 0, body.outlet_id ?? null, customer?.phone_wa ?? null, "code");
    const discount = promoDiscount(promo, body.subtotal ?? 0, [], body.delivery_fee ?? 0);
    const message = discount === 0 && promo.type === "bogo"
      ? "Voucher valid. Potongan beli 1 gratis 1 dihitung saat checkout."
      : discount === 0 && promo.type === "free_delivery"
        ? "Voucher valid. Gratis ongkir berlaku untuk pesanan antar."
        : `Voucher berhasil dipakai. Hemat ${rupiah(discount)}.`;
    return ok({ message, data: { valid: true, discount, subtotal_after: Math.max(0, (body.subtotal ?? 0) - discount), promotion: promo } });
  })),

  http.get(`${API}/outlets`, route(() => ok({ data: outlets }))),

  http.post(`${API}/delivery/quote`, route(async ({ request }) => {
    const body = (await request.json()) as { outlet_id: number; lat: number; lng: number };
    const q = deliveryQuote(body.outlet_id, body.lat, body.lng);
    if (!q.within) return invalid("address", `Alamat berjarak ${q.distance} km, di luar jangkauan pengantaran ${q.outlet.name} (maks ${q.outlet.delivery_radius_km} km).`);
    return ok({ data: { distance_km: q.distance, fee: q.fee, radius_km: q.outlet.delivery_radius_km, within_radius: true, outlet_id: q.outlet.id } });
  })),

  http.get(`${API}/blogs`, route(({ url }) => {
    const sp = url.searchParams;
    let list = [...blogs];
    const cat = sp.get("filter[category]");
    if (cat) list = list.filter((b) => b.category?.slug === cat);
    const search = (sp.get("search") ?? "").toLowerCase();
    if (search) list = list.filter((b) => b.title.toLowerCase().includes(search));
    list.sort((a, b) => (sp.get("sort") === "-views" ? b.views - a.views : b.published_at!.localeCompare(a.published_at!)));
    const page = paginate(list, url, 9);
    return ok({ ...page, data: page.data.map(({ content: _c, meta_title: _t, meta_description: _m, ...b }) => b) });
  })),

  http.get(`${API}/blogs/:slug`, route<{ slug: string }>(({ params }) => {
    const blog = blogs.find((b) => b.slug === params.slug);
    if (!blog) return fail(404, "Data tidak ditemukan.");
    const related = blogs.filter((b) => b.id !== blog.id && b.category?.id === blog.category?.id).slice(0, 3);
    return ok({ data: blog, related: related.map(({ content: _c, ...b }) => b) });
  })),

  http.get(`${API}/blog-categories`, route(() => ok({
    data: blogCategories.map((c) => ({ ...c, blogs_count: blogs.filter((b) => b.category?.id === c.id).length })),
  }))),

  http.post(`${API}/contacts`, route(async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    const errors: Record<string, string[]> = {};
    if (!body.name) errors.name = ["Nama wajib diisi."];
    if (!/^\S+@\S+\.\S+$/.test(body.email ?? "")) errors.email = ["Email harus berupa alamat email yang valid."];
    if (!body.subject) errors.subject = ["Subjek wajib diisi."];
    if (!body.message) errors.message = ["Pesan wajib diisi."];
    if (Object.keys(errors).length) return fail(422, Object.values(errors)[0]![0]!, errors);
    return ok({ message: "Terima kasih, pesan Anda sudah kami terima. Tim Kamee akan segera menghubungi Anda." }, 201);
  })),

  http.get(`${API}/testimonials`, route(() => ok({
    data: Object.values(reviews).flat().filter((r) => r.rating >= 4 && r.comment).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10),
  }))),

  // Pesanan & pembayaran
  http.post(`${API}/orders/quote`, route(async ({ request }) => {
    const body = (await request.json()) as OrderPayload;
    return ok({ data: quote(body, customerFrom(request)) });
  })),

  http.post(`${API}/orders`, route(({ request }) => idempotent(request, (body) => {
    validateOrderPayload(body as OrderPayload);
    const order = createOrder(body as OrderPayload, customerFrom(request), "web");
    return ok({ data: order, message: "Pesanan berhasil dibuat. Silakan lanjutkan pembayaran." }, 201);
  }))),

  http.post(`${API}/orders/whatsapp`, route(({ request }) => idempotent(request, (body) => {
    validateOrderPayload(body as OrderPayload);
    const order = createOrder(body as OrderPayload, customerFrom(request), "whatsapp");
    const lines = [
      `Halo ${order.outlet!.name}, saya mau pesan:`, "", `*Kode:* ${order.code}`,
      ...order.items!.map((it, i) => `${i + 1}. ${it.product_name} x${it.qty} — ${rupiah(it.subtotal)}${it.options?.length ? ` (${it.options.map((o) => o.name).join(", ")})` : ""}`),
      "", `*Total: ${rupiah(order.total)}*`, "", `Nama: ${order.customer_name}`, `Layanan: ${order.fulfillment_label}`,
      ...(order.address ? [`Alamat: ${order.address}`] : []), ...(order.note ? [`Catatan: ${order.note}`] : []),
    ];
    return ok({
      data: order,
      message: "Pesanan tersimpan. Lanjutkan konfirmasi melalui WhatsApp.",
      whatsapp_url: `https://wa.me/${order.outlet!.phone_wa}?text=${encodeURIComponent(lines.join("\n"))}`,
    }, 201);
  }))),

  http.get(`${API}/orders/:code`, route<{ code: string }>(({ params, url }) => {
    const phone = (url.searchParams.get("phone") ?? "").replace(/\D/g, "");
    if (phone.length < 4) return invalid("phone", "Masukkan minimal 4 digit terakhir nomor WhatsApp.");
    const order = findOrder(params.code);
    if (!order.customer_phone.endsWith(phone.slice(-4))) return fail(404, "Data tidak ditemukan.");
    return ok({ data: order });
  })),

  http.post(`${API}/orders/:code/pay`, route<{ code: string }>(({ request, params }) => idempotent(request, (body) => {
    const { method, channel } = body as { method: PaymentMethod; channel?: string };
    if (!["qris", "ewallet", "bank_transfer", "cash"].includes(method)) return invalid("method", "Metode pembayaran yang dipilih tidak valid.");
    const order = findOrder(params.code);
    const payment = pay(order, method, channel ?? null);
    const { order_code: _o, created_ms: _c, ...data } = payment as typeof payment & { order_code: string; created_ms: number };
    return ok({
      data,
      message: method === "cash" ? "Pesanan diteruskan ke barista. Silakan bayar tunai di kasir." : "Transaksi pembayaran dibuat. Selesaikan sebelum batas waktu.",
      order_status: order.status,
    }, 201);
  }))),

  http.get(`${API}/orders/:code/payment-status`, route<{ code: string }>(({ params }) => {
    const order = findOrder(params.code);
    const payment = [...db().payments].reverse().find((p) => p.order_code === order.code);
    const { order_code: _o, created_ms: _c, ...data } = (payment ?? {}) as NonNullable<typeof payment>;
    return ok({
      data: {
        order_code: order.code,
        order_status: order.status,
        order_status_label: order.status_label,
        total: order.total,
        payment_deadline: new Date(new Date(order.created_at).getTime() + 15 * 60000).toISOString(),
        payment: payment ? data : null,
      },
    });
  })),

  // Pelanggan: auth
  http.post(`${API}/auth/otp/request`, route(async ({ request }) => {
    const { phone } = (await request.json()) as { phone: string };
    const p = normalizePhone(phone ?? "");
    if (!/^628\d{7,12}$/.test(p)) return invalid("phone", "Nomor WhatsApp tidak valid. Gunakan format 08xx atau 628xx.");
    return ok({ message: "Kode OTP sudah dikirim ke WhatsApp Anda.", data: { phone: `${p.slice(0, 5)}*****${p.slice(-3)}`, expires_in: 300 } });
  })),

  http.post(`${API}/auth/otp/verify`, route(async ({ request }) => {
    const { phone, code, name } = (await request.json()) as { phone: string; code: string; name?: string };
    if (code !== MOCK_OTP) return invalid("code", "Kode OTP salah.");
    const p = normalizePhone(phone);
    const s = db();
    let customer = s.customers.find((c) => c.phone_wa === p);
    const isNew = !customer;
    if (!customer) {
      customer = {
        id: nextId(), name: name || "Sahabat Kamee", phone_wa: p, email: null, birth_date: null,
        points_balance: 0, lifetime_spend: 0, tier: tiers[0]!, referral_code: `KM${Math.random().toString(36).slice(2, 8).toUpperCase()}`, created_at: nowIso(),
      };
      s.customers.push(customer);
    }
    const token = `mock-${customer.id}-${Math.random().toString(36).slice(2)}`;
    s.tokens[token] = customer.id;
    persist();
    return ok({ message: isNew ? "Selamat datang di Kamee Coffee!" : "Berhasil masuk.", data: { token, token_type: "Bearer", is_new: isNew, customer } });
  })),

  http.post(`${API}/auth/logout`, route(({ request }) => {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) delete db().tokens[token];
    persist();
    return ok({ message: "Berhasil keluar." });
  })),

  // Pelanggan: profil & data
  http.get(`${API}/me`, route(({ request }) => ok({ data: requireCustomer(request) }))),

  http.patch(`${API}/me`, route(async ({ request }) => {
    const c = requireCustomer(request);
    const body = (await request.json()) as Partial<Customer>;
    if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) return invalid("email", "Email harus berupa alamat email yang valid.");
    Object.assign(c, { name: body.name ?? c.name, email: body.email ?? c.email, birth_date: body.birth_date ?? c.birth_date });
    persist();
    return ok({ data: c, message: "Profil berhasil diperbarui." });
  })),

  http.get(`${API}/me/orders`, route(({ request, url }) => {
    const c = requireCustomer(request);
    const list = db().orders.filter((o) => (o as Order & { customer_id?: number }).customer_id === c.id || o.customer_phone === c.phone_wa);
    list.forEach(advance);
    const status = url.searchParams.get("status");
    return ok(paginate(status ? list.filter((o) => o.status === status) : list, url, 10));
  })),

  http.get(`${API}/me/orders/:code`, route<{ code: string }>(({ request, params }) => {
    const c = requireCustomer(request);
    const order = findOrder(params.code);
    if (order.customer_phone !== c.phone_wa) return fail(404, "Data tidak ditemukan.");
    return ok({ data: order });
  })),

  http.post(`${API}/me/orders/:code/reorder`, route<{ code: string }>(({ request, params }) => {
    const c = requireCustomer(request);
    const order = findOrder(params.code);
    if (order.customer_phone !== c.phone_wa) return fail(404, "Data tidak ditemukan.");
    const items = order.items!.map((it) => {
      const p = products.find((x) => x.id === it.product_id)!;
      const groups = productGroups[p.id] ?? [];
      const ids = (it.options ?? []).map((o) => groups.flatMap((g) => g.options.map((x) => ({ key: `${g.name}: ${x.name}`, x }))).find((m) => m.key === o.name)?.x.id).filter(Boolean) as number[];
      return {
        product_id: p.id, product_name: p.name, qty: it.qty, option_ids: ids, note: it.note,
        unit_price_now: p.base_price + groups.flatMap((g) => g.options).filter((o) => ids.includes(o.id)).reduce((s, o) => s + o.price_delta, 0),
        missing_options: [],
      };
    });
    return ok({ message: "Item berhasil disalin ke keranjang.", data: { outlet_id: order.outlet!.id, items, unavailable: [] } });
  })),

  http.get(`${API}/me/points`, route(({ request, url }) => {
    const c = requireCustomer(request);
    const next = tiers.find((t) => t.min_spend > c.lifetime_spend) ?? null;
    return ok({
      ...paginate(db().loyalty[c.id] ?? [], url, 15),
      summary: {
        balance: c.points_balance, point_value: 100, balance_value: c.points_balance * 100, expiring_in_30_days: 0,
        lifetime_spend: c.lifetime_spend, tier: c.tier ?? null,
        next_tier: next ? { name: next.name, min_spend: next.min_spend, remaining_spend: next.min_spend - c.lifetime_spend } : null,
      },
    });
  })),

  http.post(`${API}/me/points/redeem-preview`, route(async ({ request }) => {
    const c = requireCustomer(request);
    const { points, subtotal } = (await request.json()) as { points: number; subtotal: number };
    const max = Math.max(0, Math.min(c.points_balance, Math.floor(Math.floor((subtotal * 50) / 100) / 100)));
    const applied = Math.min(Math.max(0, points), max);
    return ok({
      data: {
        requested_points: points, applicable_points: applied, max_points: max, point_value: 100, discount: applied * 100,
        subtotal_after: Math.max(0, subtotal - applied * 100), balance: c.points_balance, balance_after: c.points_balance - applied,
        message: applied < points ? `Hanya ${applied} poin yang dapat ditukar untuk belanja ini.` : `Tukar ${applied} poin untuk potongan ${rupiah(applied * 100)}.`,
      },
    });
  })),

  http.get(`${API}/me/favorites`, route(({ request, url }) => {
    const c = requireCustomer(request);
    const ids = db().favorites[c.id] ?? [];
    return ok(paginate(products.filter((p) => ids.includes(p.id)).map((p) => listProduct(p, true)), url, 20));
  })),

  http.post(`${API}/me/favorites`, route(async ({ request }) => {
    const c = requireCustomer(request);
    const { product_id } = (await request.json()) as { product_id: number };
    const list = (db().favorites[c.id] ??= []);
    if (!list.includes(product_id)) list.push(product_id);
    persist();
    return ok({ message: "Produk ditambahkan ke favorit." }, 201);
  })),

  http.delete(`${API}/me/favorites/:id`, route<{ id: string }>(({ request, params }) => {
    const c = requireCustomer(request);
    db().favorites[c.id] = (db().favorites[c.id] ?? []).filter((x) => x !== Number(params.id));
    persist();
    return ok({ message: "Produk dihapus dari favorit." });
  })),

  http.get(`${API}/me/addresses`, route(({ request }) => {
    const c = requireCustomer(request);
    return ok({ data: [...(db().addresses[c.id] ?? [])].sort((a, b) => Number(b.is_default) - Number(a.is_default)) });
  })),

  http.post(`${API}/me/addresses`, route(async ({ request }) => {
    const c = requireCustomer(request);
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.label) return invalid("label", "Label wajib diisi.");
    if (!body.address) return invalid("address", "Alamat wajib diisi.");
    const list = (db().addresses[c.id] ??= []);
    const isDefault = Boolean(body.is_default) || list.length === 0;
    if (isDefault) list.forEach((a) => (a.is_default = false));
    const address = { id: nextId(), label: String(body.label), address: String(body.address), lat: (body.lat as number) ?? null, lng: (body.lng as number) ?? null, note: (body.note as string) ?? null, is_default: isDefault };
    list.push(address);
    persist();
    return ok({ data: address, message: "Alamat berhasil disimpan." }, 201);
  })),

  http.patch(`${API}/me/addresses/:id`, route<{ id: string }>(async ({ request, params }) => {
    const c = requireCustomer(request);
    const list = db().addresses[c.id] ?? [];
    const address = list.find((a) => a.id === Number(params.id));
    if (!address) return fail(404, "Data tidak ditemukan.");
    const body = (await request.json()) as Record<string, unknown>;
    if (body.is_default) list.forEach((a) => (a.is_default = false));
    Object.assign(address, body);
    persist();
    return ok({ data: address, message: "Alamat berhasil diperbarui." });
  })),

  http.delete(`${API}/me/addresses/:id`, route<{ id: string }>(({ request, params }) => {
    const c = requireCustomer(request);
    const list = (db().addresses[c.id] ?? []).filter((a) => a.id !== Number(params.id));
    if (list.length && !list.some((a) => a.is_default)) list[0]!.is_default = true;
    db().addresses[c.id] = list;
    persist();
    return ok({ message: "Alamat berhasil dihapus." });
  })),

  http.get(`${API}/me/vouchers`, route(({ request }) => {
    const c = requireCustomer(request);
    return ok({
      data: promotions.filter((p) => p.code).map((p) => {
        const used = (db().promoUsage[p.code!] ?? []).filter((u) => u.phone === c.phone_wa).length;
        return { ...p, used, remaining_uses: p.per_customer_limit != null ? Math.max(0, p.per_customer_limit - used) : null };
      }).filter((v) => v.remaining_uses === null || v.remaining_uses > 0),
    });
  })),

  http.post(`${API}/me/reviews`, route(async ({ request }) => {
    const c = requireCustomer(request);
    const body = (await request.json()) as { order_code: string; product_id: number; rating: number; comment?: string };
    const order = db().orders.find((o) => o.code === body.order_code && o.customer_phone === c.phone_wa);
    if (!order) return invalid("order_code", "Pesanan tidak ditemukan.");
    if (order.status !== "completed") return invalid("order_code", "Ulasan hanya dapat diberikan untuk pesanan yang sudah selesai.");
    return ok({ data: { id: nextId(), rating: body.rating, comment: body.comment ?? null, photo_url: null, reply: null, customer_name: c.name, created_at: nowIso() }, message: "Terima kasih atas ulasan Anda!" }, 201);
  })),
];
