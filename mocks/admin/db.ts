/**
 * "Database" mock panel admin (memori server, di-seed deterministik).
 * Dipakai handler MSW admin yang dijalankan di dalam proxy /api/admin saat NEXT_PUBLIC_API_MOCKING=enabled.
 * Data katalog memakai ulang mocks/data.ts agar konsisten dengan situs publik.
 */
import type { Fulfillment, OrderItem, OrderStatus, Payment, PaymentMethod } from "@/types/api";
import type {
  AdminBanner,
  AdminBlog,
  AdminCustomer,
  AdminOrder,
  AdminProduct,
  AdminPromotion,
  AdminUser,
  BlogCategory,
  Category,
  Contact,
  OptionGroup,
  Outlet,
  Settings,
  StatusLog,
} from "@/lib/admin/types";
import type { CustomerAddress, LoyaltyTransaction } from "@/types/api";
import {
  banners as seedBanners,
  blogCategories as seedBlogCategories,
  blogs as seedBlogs,
  categories as seedCategories,
  optionGroups as seedOptionGroups,
  outlets as seedOutlets,
  productGroups,
  products as seedProducts,
  promotions as seedPromotions,
  tiers,
} from "../data";
import { manualQrisFields } from "@/lib/payments";
import { seedFinance, type FinanceState } from "./finance";

/** Pesanan mock + penanda pemotongan stok (tidak dikirim ke klien). */
export type MockOrder = AdminOrder & {
  /** deducted = stok sudah dipotong; reversed = sudah dikembalikan; skipped = pesanan seed lama (tidak memotong stok). */
  stock_status?: "deducted" | "reversed" | "skipped";
};

export interface MockAdminState extends FinanceState {
  users: (AdminUser & { password: string; token: string })[];
  outlets: Outlet[];
  categories: Category[];
  optionGroups: OptionGroup[];
  products: AdminProduct[];
  /** outletId → set productId yang ditandai habis */
  unavailable: Record<number, number[]>;
  promotions: AdminPromotion[];
  banners: AdminBanner[];
  blogCategories: BlogCategory[];
  blogs: (AdminBlog & { content: string })[];
  customers: (AdminCustomer & { addresses: CustomerAddress[] })[];
  loyalty: Record<number, LoyaltyTransaction[]>;
  orders: MockOrder[];
  contacts: Contact[];
  settings: Settings;
  seq: number;
}

/* ------------------------------------------------------------------ util */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TZ_OFFSET = 7 * 60; // WIB
const DEMO_START = Date.parse("2026-10-01T00:00:00+07:00");
/** ISO dengan offset +07:00 (format backend). */
export function wib(d: Date): string {
  const local = new Date(d.getTime() + TZ_OFFSET * 60_000);
  return local.toISOString().replace(/\.\d{3}Z$/, "+07:00");
}

const FIRST = ["Dinda", "Rizky", "Salsa", "Bima", "Nadia", "Fajar", "Ayu", "Kevin", "Putri", "Dimas", "Intan", "Raka", "Citra", "Yoga", "Maya", "Arif", "Laras", "Gilang", "Tiara", "Hendra", "Wulan", "Farhan", "Sekar", "Andre"];
const LAST = ["Putri", "Pratama", "Wijaya", "Saputra", "Lestari", "Hidayat", "Anggraini", "Nugroho", "Permata", "Siregar", "Kusuma", "Maharani", "Setiawan", "Rahmawati"];
const STREETS = ["Jl. Cempaka Raya", "Jl. Flamboyan Raya", "Jl. Melati Raya", "Jl. Anggrek", "Jl. Kenanga", "Jl. Bougenville", "Jl. Mawar"];

function statusPath(final: OrderStatus, fulfillment: Fulfillment, method: PaymentMethod): OrderStatus[] {
  const start: OrderStatus[] = method === "cash" ? ["pending", "processing"] : ["pending", "paid", "processing"];
  switch (final) {
    case "pending":
      return ["pending"];
    case "paid":
      return ["pending", "paid"];
    case "processing":
      return start;
    case "shipped":
      return [...start, "shipped"];
    case "completed":
      return fulfillment === "delivery" ? [...start, "shipped", "completed"] : [...start, "completed"];
    case "cancelled":
      return ["pending", "cancelled"];
  }
}

const LOG_NOTE: Partial<Record<OrderStatus, string>> = {
  paid: "Pembayaran QRIS dikonfirmasi admin",
  processing: "Pesanan diproses barista",
  shipped: "Pesanan dalam pengantaran",
  completed: "Pesanan selesai",
  cancelled: "Dibatalkan otomatis: pembayaran melewati batas 60 menit.",
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = { qris: "QRIS", ewallet: "E-Wallet", bank_transfer: "Transfer Bank", cash: "Tunai" };


/* ------------------------------------------------------------------ seed */

function seed(): MockAdminState {
  const now = Date.now();
  const r = rng(20260930);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)]!;
  const created = (daysAgo: number) => wib(new Date(now - daysAgo * 86_400_000));

  const outlets = seedOutlets.map((o) => ({ ...o }));
  const categories = seedCategories.map((c) => ({ ...c }));
  const optionGroups = Object.values(seedOptionGroups).map((g) => ({ ...g, options: g.options.map((o) => ({ ...o })) }));

  const products: AdminProduct[] = seedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    base_price: p.base_price,
    image_url: p.image_url,
    rating_avg: p.rating_avg,
    review_count: p.review_count,
    sold_count: 0,
    is_featured: p.is_featured,
    is_best_seller: p.is_best_seller,
    is_active: true,
    category: p.category,
    category_id: p.category!.id,
    description: p.description,
    composition: p.composition,
    calories: p.calories,
    images: (p.images ?? []).map((i) => ({ ...i })),
    option_groups: productGroups[p.id] ?? [],
    option_group_ids: (productGroups[p.id] ?? []).map((g) => g.id),
    unavailable_outlet_ids: [],
    deleted_at: null,
  }));

  const users: MockAdminState["users"] = [
    { id: 1, name: "Super Admin Kamee", email: "superadmin@kamee.id", role: "super_admin", role_label: "Admin", outlet_id: null, outlet: null, is_active: true, last_login_at: created(1), created_at: created(200), password: "password", token: "mock-token-1" },
    { id: 2, name: "Admin Kamee Cibodas", email: "admin.cibodas@kamee.id", role: "outlet_admin", role_label: "Admin Outlet", outlet_id: 1, outlet: { id: 1, name: outlets[0]!.name }, is_active: true, last_login_at: created(2), created_at: created(180), password: "password", token: "mock-token-2" },
  ];

  // Pelanggan terdaftar
  const customers: MockAdminState["customers"] = Array.from({ length: 42 }, (_, i) => {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 5) % LAST.length]}`;
    const phone = `62812${String(30_000_000 + Math.floor(r() * 69_999_999)).padStart(8, "0")}`;
    const days = Math.floor(r() * 170) + (i < 6 ? 0 : 5);
    return {
      id: i + 1,
      name,
      phone_wa: phone,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      birth_date: `${1985 + (i % 20)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
      points_balance: 0,
      lifetime_spend: 0,
      tier: tiers[0]!,
      referral_code: `KM${(i * 7919).toString(36).toUpperCase().padStart(6, "X")}`,
      created_at: created(i < 6 ? r() * 12 : days),
      orders_count: 0,
      addresses: [{ id: i + 1, label: "Rumah", address: `${pick(STREETS)} No. ${1 + Math.floor(r() * 90)}, Taman Cibodas, Tangerang`, lat: -6.182 + (r() - 0.5) * 0.03, lng: 106.597 + (r() - 0.5) * 0.03, note: null, is_default: true }],
    };
  });

  // Pesanan 150 hari terakhir
  const orders: MockOrder[] = [];
  const loyalty: Record<number, LoyaltyTransaction[]> = {};
  let orderId = 1;
  let itemId = 1;
  let paymentId = 1;
  const active = products.filter((p) => p.is_active);
  const popularity = active.map((p, i) => ({ p, w: 1 + ((i * 37) % 11) + (p.is_best_seller ? 8 : 0) }));
  const totalW = popularity.reduce((s, x) => s + x.w, 0);
  const WEEKEND_ONLY = new Set(["mont-blanc", "cold-brew"]);
  const weightedProduct = (weekend: boolean): AdminProduct => {
    let x = r() * totalW;
    let chosen = popularity[0]!.p;
    for (const it of popularity) {
      x -= it.w;
      if (x <= 0) {
        chosen = it.p;
        break;
      }
    }
    // Mont Blanc & Cold Brew hanya dijual hari Sabtu
    return !weekend && WEEKEND_ONLY.has(chosen.slug) ? weightedProduct(weekend) : chosen;
  };

  // Slot waktu pesanan 150 hari terakhir, lalu beberapa pesanan "live" yang selalu ada
  // (terlepas dari jam saat mock dijalankan) agar Kanban & notifikasi bisa langsung dicoba.
  type Slot = { at: Date; outlet: Outlet; live?: { status: OrderStatus; fulfillment?: Fulfillment; method?: PaymentMethod } };
  const slots: Slot[] = [];
  for (let day = 150; day >= 0; day--) {
    const date = new Date(now - day * 86_400_000);
    // Pesanan demo hanya mulai 1 Okt 2026: periode 20–29 Sep berisi data asli dari buku catatan pemilik.
    if (date.getTime() < DEMO_START) continue;
    const dow = new Date(date.getTime() + TZ_OFFSET * 60_000).getUTCDay();
    const growth = 1 + (150 - day) / 300; // tren naik perlahan
    for (const outlet of outlets) {
      const base = 5 + (dow === 0 || dow === 6 ? 3 : 0);
      const count = Math.max(1, Math.round((base + r() * 3) * growth));
      for (let n = 0; n < count; n++) {
        const hour = 10 + Math.floor(r() * 7); // buka 10.00–17.00 WIB
        const minute = Math.floor(r() * 60);
        const at = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour - 7, minute));
        // Pesanan hari ini dari 3 jam terakhir digantikan set "live" di bawah
        if (at.getTime() > now - 180 * 60_000) continue;
        slots.push({ at, outlet });
      }
    }
  }
  const LIVE: NonNullable<Slot["live"]>[] = [
    { status: "pending", method: "cash", fulfillment: "dine_in" },
    { status: "pending", method: "qris" },
    { status: "paid", method: "qris", fulfillment: "pickup" },
    { status: "paid", method: "qris", fulfillment: "delivery" },
    { status: "processing", method: "cash", fulfillment: "pickup" },
    { status: "processing", method: "qris", fulfillment: "delivery" },
    { status: "processing", method: "qris", fulfillment: "dine_in" },
    { status: "shipped", method: "qris", fulfillment: "delivery" },
    { status: "completed", method: "cash", fulfillment: "pickup" },
    { status: "cancelled", method: "qris", fulfillment: "pickup" },
  ];
  LIVE.forEach((live, i) => {
    const minutesAgo = [2, 6, 9, 14, 21, 27, 33, 48, 70, 95][i]!;
    slots.push({ at: new Date(now - minutesAgo * 60_000), outlet: outlets[i % outlets.length]!, live });
  });
  slots.sort((a, b) => a.at.getTime() - b.at.getTime());

  for (const { at, outlet, live } of slots) {
    const fulfillment: Fulfillment = live?.fulfillment ?? pick(["pickup", "pickup", "dine_in", "dine_in", "delivery"] as const);
    const method: PaymentMethod = live?.method ?? pick(["qris", "qris", "qris", "cash", "cash"] as const);
    const weekend = [6].includes(new Date(at.getTime() + TZ_OFFSET * 60_000).getUTCDay());
    const channel = pick(["web", "web", "web", "web", "whatsapp", "whatsapp", "pos"] as const);
    const registered = r() < 0.72 ? customers[Math.floor(r() * customers.length)]! : null;
    const name = registered?.name ?? `${pick(FIRST)} ${pick(LAST)}`;
    const phone = registered?.phone_wa ?? `62813${String(Math.floor(r() * 99_999_999)).padStart(8, "0")}`;

    const lines = 1 + Math.floor(r() * 3);
    const items: OrderItem[] = [];
    for (let l = 0; l < lines; l++) {
      const p = weightedProduct(weekend);
      const groups = productGroups[p.id] ?? [];
      const opts: { name: string; price_delta: number }[] = [];
      for (const g of groups) {
        if (g.type === "single") {
          const o = g.name === "Ukuran" && r() < 0.35 ? g.options[1]! : g.options[Math.floor(r() * Math.min(2, g.options.length))]!;
          opts.push({ name: o.name, price_delta: o.price_delta });
        } else if (r() < 0.25) {
          const o = pick(g.options);
          opts.push({ name: o.name, price_delta: o.price_delta });
        }
      }
      const unit = p.base_price + opts.reduce((s, o) => s + o.price_delta, 0);
      const qty = r() < 0.75 ? 1 : 2;
      items.push({ id: itemId++, product_id: p.id, product_name: p.name, unit_price: unit, qty, subtotal: unit * qty, note: r() < 0.08 ? "Less ice ya" : null, options: opts });
    }
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const discount = r() < 0.12 && subtotal >= 40000 ? Math.min(15000, Math.round(subtotal * 0.2)) : 0;
    const delivery_fee = fulfillment === "delivery" ? 8000 + Math.floor(r() * 4) * 2500 : 0;
    const total = subtotal - discount + delivery_fee;

    let status: OrderStatus;
    const ageMin = (now - at.getTime()) / 60_000;
    if (live) status = live.status;
    else if (ageMin > 180) status = r() < 0.08 ? "cancelled" : "completed";
    else if (ageMin < 12) status = method === "cash" ? pick(["pending", "processing"] as const) : pick(["pending", "paid"] as const);
    else if (ageMin < 45) status = pick(["paid", "processing", "processing", fulfillment === "delivery" ? "shipped" : "processing"] as const);
    else status = pick(["completed", "completed", fulfillment === "delivery" ? "shipped" : "completed"] as const);
    if (status === "paid" && method === "cash") status = "processing";

    const path = statusPath(status, fulfillment, method);
    let t = at.getTime();
    const status_logs: StatusLog[] = path.map((s, i) => {
      if (i > 0) t += (s === "completed" ? 12 + r() * 25 : 1 + r() * 6) * 60_000;
      return {
        from_status: i === 0 ? null : path[i - 1]!,
        to_status: s,
        note: i === 0 ? `Pesanan dibuat via ${channel === "web" ? "Website" : channel === "whatsapp" ? "WhatsApp" : "Kasir"}` : LOG_NOTE[s] ?? null,
        changed_by: i === 0 || s === "paid" || s === "cancelled" ? null : users[outlet.id]?.name ?? "Barista",
        at: wib(new Date(Math.min(t, now))),
      };
    });
    const paidLog = status_logs.find((l) => l.to_status === "paid" || (method === "cash" && l.to_status === "processing"));
    const isPaid = !!paidLog && status !== "cancelled";
    const payment: Payment = {
      id: paymentId++,
      method,
      method_label: PAYMENT_LABEL[method],
      provider: method === "cash" ? "cash" : "manual",
      reference: method === "cash" ? null : `QR-${(orderId * 7919).toString(36).toUpperCase()}`,
      amount: total,
      status: status === "cancelled" ? "expired" : isPaid ? "paid" : "pending",
      status_label: status === "cancelled" ? "Kedaluwarsa" : isPaid ? "Berhasil" : "Menunggu",
      qr_string: null,
      va_number: null,
      bank: null,
      deeplink: null,
      expires_at: method === "cash" ? null : wib(new Date(at.getTime() + 60 * 60_000)),
      paid_at: isPaid ? paidLog!.at : null,
      ...manualQrisFields(method, isPaid || status === "cancelled" ? "done" : "pending"),
    };
    const code = `KM${wib(at).slice(2, 10).replace(/-/g, "")}${(orderId * 2654435761 >>> 0).toString(36).toUpperCase().slice(0, 5).padEnd(5, "X")}`;
    const order: MockOrder = {
      id: orderId++,
      code,
      status,
      status_label: "",
      channel,
      fulfillment,
      fulfillment_label: "",
      outlet: { id: outlet.id, name: outlet.name, phone_wa: outlet.phone_wa, address: outlet.address },
      outlet_id: outlet.id,
      customer_id: registered?.id ?? null,
      customer_name: name,
      customer_phone: phone,
      address: fulfillment === "delivery" ? registered?.addresses[0]?.address ?? `${pick(STREETS)} No. ${1 + Math.floor(r() * 90)}, Taman Cibodas, Tangerang` : null,
      lat: null,
      lng: null,
      scheduled_at: null,
      subtotal,
      discount,
      points_redeemed: 0,
      points_discount: 0,
      delivery_fee,
      service_fee: 0,
      total,
      note: r() < 0.1 ? "Tolong dibungkus rapi, untuk hadiah" : null,
      cancelled_reason: status === "cancelled" ? LOG_NOTE.cancelled! : null,
      items,
      payment,
      payments: [payment],
      status_logs,
      paid_at: payment.paid_at,
      completed_at: status === "completed" ? status_logs[status_logs.length - 1]!.at : null,
      created_at: wib(at),
      updated_at: status_logs[status_logs.length - 1]!.at,
      handled_by: null,
      // Pesanan demo yang sudah terbayar/dibatalkan tidak memotong stok secara retroaktif
      // (stok awal = jumlah belanja 20/9). Pesanan pending akan memotong stok saat dibayar.
      stock_status: status === "pending" ? undefined : "skipped",
    };
    orders.push(order);

    if (status !== "cancelled") for (const i of items) products.find((p) => p.id === i.product_id)!.sold_count += i.qty;
    if (registered && status === "completed") {
      registered.lifetime_spend += total;
      const earned = Math.floor(total / 10000);
      registered.points_balance += earned;
      (loyalty[registered.id] ??= []).unshift({
        id: orders.length,
        type: "earn",
        type_label: "Poin didapat",
        points: earned,
        balance_after: registered.points_balance,
        order_code: code,
        note: `Poin dari pesanan ${code}`,
        expires_at: wib(new Date(at.getTime() + 365 * 86_400_000)),
        created_at: order.completed_at!,
      });
    }
    if (registered) registered.orders_count = (registered.orders_count ?? 0) + 1;
  }
  orders.sort((a, b) => b.id - a.id);
  for (const c of customers) c.tier = [...tiers].reverse().find((t) => c.lifetime_spend >= t.min_spend) ?? tiers[0]!;

  const promotions: AdminPromotion[] = seedPromotions.map((p, i) => ({ ...p, quota: i === 2 ? 100 : null, used: 3 + i * 4, is_active: true }));
  const banners: AdminBanner[] = seedBanners.map((b) => ({ ...b, starts_at: created(30), ends_at: wib(new Date(now + 60 * 86_400_000)), is_active: true }));

  const contacts: Contact[] = [
    { id: 1, name: "Farah Handayani", email: "farah@example.com", phone: "6281390001122", subject: "Kerja sama", message: "Halo Kamee, kami dari komunitas lari Tangerang ingin mengajak kerja sama untuk event fun run bulan depan. Apakah bisa sponsor minuman untuk 150 peserta?", status: "new", created_at: created(0.2) },
    { id: 2, name: "Bagas Prakoso", email: "bagas@example.com", phone: "6281277701234", subject: "Pesanan", message: "Pesanan saya kemarin Aren Kame-nya kurang satu. Kode pesanan tertera di struk. Mohon dicek ya.", status: "new", created_at: created(0.9) },
    { id: 3, name: "Melati Kurnia", email: "melati@example.com", phone: null, subject: "Reservasi tempat", message: "Apakah bisa reservasi tempat untuk 8 orang hari Sabtu jam 3 sore?", status: "read", created_at: created(2.4) },
    { id: 4, name: "Yusuf Ramadhan", email: "yusuf@example.com", phone: "6285711122233", subject: "Saran", message: "Suka banget sama Pandan Latte Kame! Kapan ada menu baru lagi?", status: "replied", created_at: created(5) },
    { id: 5, name: "PT Sinar Kopi", email: "procurement@sinarkopi.co.id", phone: null, subject: "Kerja sama", message: "Kami supplier biji kopi arabika Jawa Barat, ingin menawarkan sampel gratis untuk dicoba.", status: "read", created_at: created(8) },
  ];

  const blogs = seedBlogs.map((b) => ({ ...b, content: b.content ?? "", blog_category_id: b.category?.id ?? null }));

  return {
    ...seedFinance({ products, outlets }),
    users,
    outlets,
    categories,
    optionGroups,
    products,
    unavailable: { 1: [] },
    promotions,
    banners,
    blogCategories: seedBlogCategories.map((c) => ({ ...c })),
    blogs,
    customers,
    loyalty,
    orders,
    contacts,
    settings: {
      payment_timeout_minutes: 60,
      service_fee: 0,
      delivery_base_fee: 8000,
      delivery_base_km: 2,
      delivery_per_km_fee: 2500,
      points_earn_per_amount: 10000,
      point_value: 100,
      points_max_redeem_percent: 50,
      points_min_redeem: 10,
      points_expiry_months: 12,
      whatsapp_number: "6281280871630",
      default_open_time: "10:00",
      default_close_time: "17:00",
    },
    seq: 100_000,
  };
}

const g = globalThis as unknown as { __kameeAdminDb?: MockAdminState };

/** Satu instance per proses server (bertahan antar hot-reload dev). */
export function adminDb(): MockAdminState {
  g.__kameeAdminDb ??= seed();
  // Instance lama (hot-reload sebelum fitur Keuangan) belum punya state keuangan
  if (!g.__kameeAdminDb.ingredients) Object.assign(g.__kameeAdminDb, seedFinance(g.__kameeAdminDb));
  return g.__kameeAdminDb;
}

export function nextAdminId(): number {
  return ++adminDb().seq;
}

export function resetAdminDb() {
  g.__kameeAdminDb = seed();
}

export { PAYMENT_LABEL, statusPath };
