/**
 * Handler MSW untuk /api/v1/admin (mode mock). Dijalankan di server lewat proxy /api/admin.
 * Meniru perilaku kamee-api: role (Super Admin / Admin Outlet), OutletScope, validasi utama,
 * transisi status pesanan, paginasi & filter Spatie QueryBuilder.
 */
import { http, HttpResponse, type PathParams } from "msw";
import type { OrderStatus, PaymentMethod } from "@/types/api";
import { allowedTransitions } from "@/lib/admin/permissions";
import {
  FULFILLMENT_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type AdminOrder,
  type AdminProduct,
  type AdminUser,
  type OrderEvent,
  type ReportGroup,
} from "@/lib/admin/types";
import { tiers } from "../data";
import { PAYMENT_LABEL, adminDb, nextAdminId, wib, type MockOrder } from "./db";
import { manualQrisFields } from "@/lib/payments";
import {
  Fail,
  adjustIngredient,
  createCashEntry,
  createIngredient,
  createPosOrder,
  createStockPurchase,
  deleteCashEntry,
  deleteIngredient,
  deleteStockPurchase,
  filterCashEntries,
  financeSummary,
  ingredientMovements,
  invalid,
  listIngredients,
  listRecipes,
  listStockPurchases,
  notFound,
  paymentLabel,
  saveRecipe,
  syncOrderStock,
  updateCashEntry,
  updateIngredient,
} from "./finance";
import type { BookMethod } from "@/lib/admin/finance-types";

const A = "*/api/v1/admin";
type Json = Record<string, unknown>;
type Body = Record<string, unknown> & { __files?: Record<string, File[]> };

const forbidden = () => new Fail(403, "Anda tidak memiliki akses untuk tindakan ini.");

const ok = (data: unknown, status = 200) => HttpResponse.json(data as Json, { status });

/** Bungkus handler: auth, error seragam. */
function route<P extends PathParams = PathParams>(
  fn: (ctx: { request: Request; params: P; url: URL; user: AdminUser & { token: string } }) => Promise<Response> | Response,
  opts: { auth?: boolean } = {},
) {
  return async ({ request, params }: { request: Request; params: PathParams }) => {
    try {
      const url = new URL(request.url);
      const user = opts.auth === false ? (null as never) : authUser(request);
      return await fn({ request, params: params as P, url, user });
    } catch (e) {
      if (e instanceof Fail) return HttpResponse.json({ message: e.message, ...(e.errors ? { errors: e.errors } : {}) }, { status: e.status });
      console.error("[mock admin]", e);
      return HttpResponse.json({ message: "Terjadi kesalahan pada server mock." }, { status: 500 });
    }
  };
}

function authUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const user = adminDb().users.find((u) => u.token === token && u.is_active);
  if (!user) throw new Fail(401, "Unauthenticated.");
  return user;
}

const isSuper = (u: AdminUser) => u.role === "super_admin";
function requireSuper(u: AdminUser) {
  if (!isSuper(u)) throw forbidden();
}
const publicUser = ({ password: _p, token: _t, ...u }: AdminUser & { password?: string; token?: string }) => u;

/* ------------------------------------------------------------------ body & query helpers */

async function body(request: Request): Promise<Body> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const out: Body = { __files: {} };
    for (const [key, value] of form.entries()) {
      if (typeof value !== "string") {
        const k = key.replace(/\[\]$/, "");
        (out.__files![k] ??= []).push(value);
      } else if (key.endsWith("[]")) {
        const k = key.slice(0, -2);
        ((out[k] as string[] | undefined) ??= (out[k] = [] as string[]) as string[]).push(value);
      } else out[key] = value;
    }
    return out;
  }
  const text = await request.text();
  return text ? (JSON.parse(text) as Body) : {};
}

const has = (b: Body, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const str = (v: unknown) => (v === undefined || v === null ? null : String(v).trim() || null);
const int = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : NaN);
const bool = (v: unknown) => v === true || v === 1 || v === "1" || v === "true";

function required(b: Body, fields: Record<string, string>, creating: boolean) {
  const errors: Record<string, string[]> = {};
  for (const [f, label] of Object.entries(fields)) {
    if ((creating || has(b, f)) && (b[f] === undefined || b[f] === null || String(b[f]).trim() === "")) errors[f] = [`${label} wajib diisi.`];
  }
  if (Object.keys(errors).length) throw new Fail(422, Object.values(errors)[0]![0]!, errors);
}

async function fileUrl(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/jpeg"};base64,${buf.toString("base64")}`;
}

function checkImage(file: File | undefined, field: string, maxMb: number) {
  if (!file) return;
  if (!file.type.startsWith("image/")) throw invalid(field, "Berkas harus berupa gambar.");
  if (file.size > maxMb * 1024 * 1024) throw invalid(field, `Ukuran gambar maksimal ${maxMb} MB.`);
}

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

function filter(url: URL, name: string) {
  return url.searchParams.get(`filter[${name}]`) ?? "";
}

function paginate<T>(list: T[], url: URL, dflt = 20) {
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page")) || dflt));
  const total = list.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(lastPage, Math.max(1, Number(url.searchParams.get("page")) || 1));
  return { data: list.slice((page - 1) * perPage, page * perPage), meta: { page, per_page: perPage, total, last_page: lastPage } };
}

function sortList<T>(list: T[], url: URL, allowed: string[], dflt: string) {
  const sort = url.searchParams.get("sort") || dflt;
  const desc = sort.startsWith("-");
  const key = sort.replace(/^-/, "");
  if (!allowed.includes(key)) throw new Fail(400, `Sort "${key}" tidak diizinkan.`);
  return [...list].sort((a, b) => {
    const x = (a as Record<string, unknown>)[key] as string | number;
    const y = (b as Record<string, unknown>)[key] as string | number;
    const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), "id");
    return desc ? -cmp : cmp;
  });
}

/* ------------------------------------------------------------------ tanggal (WIB) */

const DAY = 86_400_000;
function dayStart(ymd: string) {
  return new Date(`${ymd}T00:00:00+07:00`).getTime();
}
function wibYmd(ms: number) {
  return new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
}
function range(url: URL) {
  const today = wibYmd(Date.now());
  const to = url.searchParams.get("to") || today;
  const from = url.searchParams.get("from") || wibYmd(dayStart(to) - 29 * DAY);
  if (dayStart(to) < dayStart(from)) throw invalid("to", "Tanggal akhir harus sama atau setelah tanggal awal.");
  return { from, to, start: dayStart(from), end: dayStart(to) + DAY - 1 };
}

/* ------------------------------------------------------------------ pesanan */

function scopedOrders(user: AdminUser) {
  const all = adminDb().orders;
  return isSuper(user) ? all : all.filter((o) => o.outlet_id === user.outlet_id);
}

function outletFilter(user: AdminUser, url: URL): number | null {
  return isSuper(user) ? Number(url.searchParams.get("outlet_id")) || null : user.outlet_id;
}

function serializeOrder({ stock_status: _stock, ...o }: MockOrder, detail = false) {
  const base = {
    ...o,
    status_label: ORDER_STATUS_LABEL[o.status],
    fulfillment_label: FULFILLMENT_LABEL[o.fulfillment],
    payment: o.payments?.[o.payments.length - 1] ?? null,
    timeline: (o.status_logs ?? []).map((l) => ({ status: l.to_status, note: l.note, at: l.at })),
  };
  if (detail) return base;
  const { items: _i, payments: _p, status_logs: _s, timeline: _t, ...rest } = base;
  return rest;
}

const REVENUE: OrderStatus[] = ["paid", "processing", "shipped", "completed"];
const inRange = (o: AdminOrder, start: number, end: number) => {
  const t = new Date(o.created_at).getTime();
  return t >= start && t <= end;
};

function toEvent(o: AdminOrder): OrderEvent {
  return {
    id: o.id,
    code: o.code,
    outlet_id: o.outlet_id,
    status: o.status,
    status_label: ORDER_STATUS_LABEL[o.status],
    fulfillment: o.fulfillment,
    channel: o.channel,
    customer_name: o.customer_name,
    total: o.total,
    updated_at: o.updated_at ?? null,
  };
}

function transition(order: MockOrder, to: OrderStatus, user: AdminUser, note: string | null) {
  const method = order.payments?.at(-1)?.method;
  const allowed = allowedTransitions({
    status: order.status,
    fulfillment: order.fulfillment,
    isCash: method === "cash",
    paidOnline: Boolean(order.paid_at) && method !== "cash",
  });
  if (!allowed.includes(to)) {
    throw invalid("status", `Status pesanan tidak dapat diubah dari "${ORDER_STATUS_LABEL[order.status]}" menjadi "${ORDER_STATUS_LABEL[to]}".`);
  }
  if (to === "cancelled" && !note) throw invalid("note", "Alasan pembatalan wajib diisi.");
  const at = wib(new Date());
  (order.status_logs ??= []).push({ from_status: order.status, to_status: to, note: note ?? null, changed_by: user.name, at });
  if (to === "processing" && method === "cash" && order.payments?.at(-1)) {
    const p = order.payments.at(-1)!;
    p.status = "paid";
    p.status_label = "Berhasil";
    p.paid_at = at;
    order.paid_at = at;
  }
  if (to === "completed") order.completed_at = at;
  if (to === "cancelled") {
    order.cancelled_reason = note;
    const p = order.payments?.at(-1);
    if (p && p.status === "pending") {
      p.status = "expired";
      p.status_label = "Kedaluwarsa";
    }
  }
  order.status = to;
  order.updated_at = at;
  order.handled_by = { id: user.id, name: user.name };
  // Potong stok saat pertama kali terbayar / kembalikan saat dibatalkan (idempoten)
  syncOrderStock(adminDb(), order, user);
}

/* ------------------------------------------------------------------ produk */

function serializeProduct(p: AdminProduct, detail = false) {
  const db = adminDb();
  const unavailable = Object.entries(db.unavailable).filter(([, ids]) => ids.includes(p.id)).map(([o]) => Number(o));
  const category = db.categories.find((c) => c.id === p.category_id) ?? p.category;
  const groups = (p.option_group_ids ?? []).map((id) => db.optionGroups.find((g) => g.id === id)).filter(Boolean);
  const out = { ...p, category, unavailable_outlet_ids: unavailable, option_group_ids: p.option_group_ids ?? [] };
  if (detail) return { ...out, option_groups: groups, images: [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order) };
  const { images: _i, option_groups: _g, ...rest } = out;
  return rest;
}

function findProduct(id: unknown) {
  const p = adminDb().products.find((x) => x.id === Number(id) && !x.deleted_at);
  if (!p) throw notFound();
  return p;
}

async function applyProduct(p: AdminProduct, b: Body, creating: boolean) {
  const db = adminDb();
  required(b, { category_id: "Kategori", name: "Nama produk", base_price: "Harga" }, creating);
  if (has(b, "base_price")) {
    const price = int(b.base_price);
    if (price === null || Number.isNaN(price) || price < 0) throw invalid("base_price", "Harga harus berupa angka ≥ 0.");
    p.base_price = price;
  }
  if (has(b, "category_id")) {
    const cat = db.categories.find((c) => c.id === Number(b.category_id));
    if (!cat) throw invalid("category_id", "Kategori tidak ditemukan.");
    p.category_id = cat.id;
    p.category = cat;
  }
  if (has(b, "name")) p.name = String(b.name).trim();
  const slug = str(b.slug) ?? (creating ? slugify(p.name) : null);
  if (slug) {
    if (db.products.some((x) => x.slug === slug && x.id !== p.id)) throw invalid("slug", "Slug sudah digunakan.");
    p.slug = slug;
  }
  for (const k of ["short_description", "description", "composition"] as const) if (has(b, k)) p[k] = str(b[k]);
  if (has(b, "calories")) p.calories = int(b.calories);
  for (const k of ["is_featured", "is_best_seller", "is_active"] as const) if (has(b, k)) p[k] = bool(b[k]);
  if (has(b, "option_group_ids")) p.option_group_ids = ((b.option_group_ids as unknown[]) ?? []).map(Number).filter((id) => db.optionGroups.some((g) => g.id === id));
  const image = b.__files?.image?.[0];
  checkImage(image, "image", 3);
  if (image) p.image_url = await fileUrl(image);
}

/* ------------------------------------------------------------------ laporan */

function report(user: AdminUser, url: URL, group: ReportGroup) {
  const db = adminDb();
  const { from, to, start, end } = range(url);
  const outletId = outletFilter(user, url);
  const orders = scopedOrders(user).filter((o) => REVENUE.includes(o.status) && inRange(o, start, end) && (!outletId || o.outlet_id === outletId));
  type Row = { key: string; label: string; orders: number; qty: number | null; revenue: number };
  const map = new Map<string, Row>();
  const add = (key: string, label: string, revenue: number, qty: number | null = null, orderKey?: string) => {
    const row = map.get(key) ?? { key, label, orders: 0, qty: qty === null ? null : 0, revenue: 0 };
    row.revenue += revenue;
    if (qty !== null) row.qty = (row.qty ?? 0) + qty;
    if (orderKey !== "skip") row.orders += 1;
    map.set(key, row);
  };
  let rows: Row[];
  if (group === "day" || group === "month") {
    const cursor = new Date(`${from}T12:00:00Z`);
    const last = new Date(`${to}T12:00:00Z`);
    const keys: string[] = [];
    while (cursor <= last) {
      const k = group === "month" ? cursor.toISOString().slice(0, 7) : cursor.toISOString().slice(0, 10);
      if (!keys.includes(k)) keys.push(k);
      if (group === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
      else cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const fmt = (k: string) =>
      group === "month"
        ? new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${k}-01T12:00:00Z`))
        : new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${k}T12:00:00Z`));
    for (const k of keys) map.set(k, { key: k, label: fmt(k), orders: 0, qty: null, revenue: 0 });
    for (const o of orders) {
      const k = wibYmd(new Date(o.created_at).getTime()).slice(0, group === "month" ? 7 : 10);
      const row = map.get(k);
      if (row) {
        row.orders += 1;
        row.revenue += o.total;
      }
    }
    rows = keys.map((k) => map.get(k)!);
  } else {
    for (const o of orders) {
      if (group === "outlet") add(String(o.outlet_id), db.outlets.find((x) => x.id === o.outlet_id)?.name ?? `Outlet ${o.outlet_id}`, o.total);
      if (group === "payment_method") {
        const m = (o.payments?.at(-1)?.method ?? "cash") as PaymentMethod;
        add(m, PAYMENT_METHOD_LABEL[m], o.total);
      }
      if (group === "product") {
        const seen = new Set<number>();
        for (const i of o.items ?? []) {
          const key = String(i.product_id);
          const row = map.get(key) ?? { key, label: i.product_name, orders: 0, qty: 0, revenue: 0 };
          row.qty = (row.qty ?? 0) + i.qty;
          row.revenue += i.subtotal;
          if (!seen.has(i.product_id!)) row.orders += 1;
          seen.add(i.product_id!);
          map.set(key, row);
        }
      }
    }
    rows = [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }
  const sum = Math.max(1, rows.reduce((s, r) => s + r.revenue, 0));
  return {
    group_by: group,
    rows: rows.map((r) => ({ ...r, share: Math.round((r.revenue / sum) * 1000) / 10 })),
    totals: { orders: orders.length, revenue: orders.reduce((s, o) => s + o.total, 0) },
    period: { from, to },
  };
}

/* ------------------------------------------------------------------ handler */

export const adminHandlers = [
  /* ---------------- auth */
  http.post(`${A}/auth/login`, route(async ({ request }) => {
    const b = await body(request);
    const email = String(b.email ?? "").trim().toLowerCase();
    if (!email) throw invalid("email", "Email wajib diisi.");
    const user = adminDb().users.find((u) => u.email === email);
    if (!user || user.password !== b.password) throw invalid("email", "Email atau kata sandi salah.");
    if (!user.is_active) throw invalid("email", "Akun Anda dinonaktifkan. Hubungi Super Admin.");
    user.last_login_at = wib(new Date());
    return ok({ message: "Berhasil masuk.", data: { token: user.token, token_type: "Bearer", user: publicUser(user) } });
  }, { auth: false })),
  http.get(`${A}/auth/me`, route(({ user }) => ok({ data: publicUser(user) }))),
  http.post(`${A}/auth/logout`, route(() => ok({ message: "Berhasil keluar." }))),

  /* ---------------- dashboard */
  http.get(`${A}/dashboard/summary`, route(({ user, url }) => {
    const { start, end } = range(url);
    const outletId = outletFilter(user, url);
    const all = scopedOrders(user).filter((o) => inRange(o, start, end) && (!outletId || o.outlet_id === outletId));
    const paid = all.filter((o) => REVENUE.includes(o.status));
    const revenue = paid.reduce((s, o) => s + o.total, 0);
    const count = <K extends string>(key: (o: AdminOrder) => K) => all.reduce<Record<string, number>>((acc, o) => ((acc[key(o)] = (acc[key(o)] ?? 0) + 1), acc), {});
    return ok({
      data: {
        period: { from: wib(new Date(start)), to: wib(new Date(end)) },
        revenue,
        orders: all.length,
        paid_orders: paid.length,
        cancelled_orders: all.filter((o) => o.status === "cancelled").length,
        pending_orders: all.filter((o) => o.status === "pending").length,
        average_order_value: paid.length ? Math.floor(revenue / paid.length) : 0,
        new_customers: adminDb().customers.filter((c) => inRange({ created_at: c.created_at } as AdminOrder, start, end)).length,
        by_status: count((o) => o.status),
        by_channel: count((o) => o.channel),
      },
    });
  })),
  http.get(`${A}/dashboard/revenue`, route(({ user, url }) => {
    const interval = url.searchParams.get("interval") === "month" ? "month" : "day";
    const r = report(user, url, interval);
    return ok({ data: r.rows.map((row) => ({ period: row.key, revenue: row.revenue, orders: row.orders })) });
  })),
  http.get(`${A}/dashboard/top-products`, route(({ user, url }) => {
    const limit = Math.min(50, Number(url.searchParams.get("limit")) || 10);
    const r = report(user, url, "product");
    return ok({
      data: [...r.rows]
        .sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0))
        .slice(0, limit)
        .map((row) => ({ product_id: Number(row.key), product_name: row.label, qty: row.qty ?? 0, revenue: row.revenue })),
    });
  })),

  /* ---------------- laporan */
  http.get(`${A}/reports/sales`, route(({ user, url }) => {
    const group = (url.searchParams.get("group_by") || "day") as ReportGroup;
    if (!["day", "month", "product", "outlet", "payment_method"].includes(group)) throw invalid("group_by", "Pengelompokan laporan tidak valid.");
    const { period: _p, ...data } = report(user, url, group);
    return ok({ data });
  })),
  http.get(`${A}/reports/sales.xlsx`, route(({ user, url }) => {
    // Mode mock tidak membuat XLSX asli; CSV (UTF-8 BOM) bisa dibuka langsung di Excel.
    const group = url.searchParams.get("group_by") as ReportGroup | null;
    const { from, to } = range(url);
    let csv: string;
    if (group) {
      const r = report(user, url, group);
      csv = [["Kelompok", "Pesanan", "Qty", "Pendapatan", "Kontribusi (%)"], ...r.rows.map((x) => [x.label, x.orders, x.qty ?? "", x.revenue, x.share])]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
    } else {
      const outletId = outletFilter(user, url);
      const rows = scopedOrders(user).filter((o) => inRange(o, range(url).start, range(url).end) && (!outletId || o.outlet_id === outletId));
      csv = [["Kode", "Tanggal", "Outlet", "Pelanggan", "No. WA", "Layanan", "Kanal", "Status", "Subtotal", "Diskon", "Ongkir", "Total", "Metode Bayar"],
        ...rows.map((o) => [o.code, o.created_at.slice(0, 16).replace("T", " "), o.outlet?.name, o.customer_name, o.customer_phone, FULFILLMENT_LABEL[o.fulfillment], o.channel, ORDER_STATUS_LABEL[o.status], o.subtotal, o.discount, o.delivery_fee, o.total, PAYMENT_LABEL[o.payments?.at(-1)?.method ?? "cash"]])]
        .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
    }
    const name = `laporan-${group ? group.replace("_", "-") : "penjualan"}-${from.replace(/-/g, "")}_${to.replace(/-/g, "")}.csv`;
    return new HttpResponse(`﻿${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` } });
  })),

  /* ---------------- keuangan: bahan & stok */
  http.get(`${A}/ingredients`, route(({ user, url }) => ok({ data: listIngredients(adminDb(), user, url) }))),
  http.post(`${A}/ingredients`, route(async ({ user, url, request }) => ok({ data: createIngredient(adminDb(), user, await body(request), url), message: "Bahan berhasil ditambahkan." }, 201))),
  http.get(`${A}/ingredients/:id/movements`, route<{ id: string }>(({ user, params, url }) => ok(paginate(ingredientMovements(adminDb(), user, params.id), url)))),
  http.post(`${A}/ingredients/:id/adjust`, route<{ id: string }>(async ({ user, params, request }) => ok({ data: adjustIngredient(adminDb(), user, params.id, await body(request)), message: "Stok berhasil disesuaikan." }, 201))),
  http.put(`${A}/ingredients/:id`, route<{ id: string }>(async ({ user, params, request }) => ok({ data: updateIngredient(adminDb(), user, params.id, await body(request)), message: "Bahan berhasil diperbarui." }))),
  http.delete(`${A}/ingredients/:id`, route<{ id: string }>(({ user, params }) => {
    deleteIngredient(adminDb(), user, params.id);
    return ok({ message: "Bahan berhasil dihapus." });
  })),
  http.get(`${A}/stock-purchases`, route(({ user, url }) => ok(paginate(listStockPurchases(adminDb(), user, url), url)))),
  http.post(`${A}/stock-purchases`, route(async ({ user, url, request }) => ok({ data: createStockPurchase(adminDb(), user, await body(request), url), message: "Belanja stok berhasil dicatat." }, 201))),
  http.delete(`${A}/stock-purchases/:id`, route<{ id: string }>(({ user, params }) => {
    deleteStockPurchase(adminDb(), user, params.id);
    return ok({ message: "Belanja stok dibatalkan. Stok dan catatan kas terkait dihapus." });
  })),

  /* ---------------- keuangan: resep & HPP */
  http.get(`${A}/recipes`, route(() => ok({ data: listRecipes(adminDb()) }))),
  http.put(`${A}/recipes/:productId`, route<{ productId: string }>(async ({ params, request }) => ok({ data: saveRecipe(adminDb(), params.productId, await body(request)), message: "Resep berhasil disimpan." }))),

  /* ---------------- keuangan: buku kas */
  http.get(`${A}/cash-entries`, route(({ user, url }) => {
    const { list, summary } = filterCashEntries(adminDb(), user, url);
    return ok({ ...paginate(list, url), summary });
  })),
  http.post(`${A}/cash-entries`, route(async ({ user, url, request }) => ok({ data: createCashEntry(adminDb(), user, await body(request), url), message: "Catatan kas berhasil ditambahkan." }, 201))),
  http.put(`${A}/cash-entries/:id`, route<{ id: string }>(async ({ user, params, request }) => ok({ data: updateCashEntry(adminDb(), user, params.id, await body(request)), message: "Catatan kas berhasil diperbarui." }))),
  http.delete(`${A}/cash-entries/:id`, route<{ id: string }>(({ user, params }) => {
    deleteCashEntry(adminDb(), user, params.id);
    return ok({ message: "Catatan kas berhasil dihapus." });
  })),

  /* ---------------- keuangan: ringkasan */
  http.get(`${A}/finance/summary`, route(({ user, url }) => ok({ data: financeSummary(adminDb(), user, url) }))),

  /* ---------------- kasir (harus sebelum rute orders/:id) */
  http.post(`${A}/orders/pos`, route(async ({ user, url, request }) => {
    const { order, change } = createPosOrder(adminDb(), user, await body(request), url);
    return ok({ data: serializeOrder(order, true), message: "Pesanan kasir tersimpan.", change }, 201);
  })),

  /* ---------------- pesanan */
  http.post(`${A}/__mock/simulate`, route(({ user, url }) => {
    const db = adminDb();
    const outlet = isSuper(user) ? db.outlets[Math.floor(Math.random() * db.outlets.length)]! : db.outlets.find((o) => o.id === user.outlet_id)!;
    const template = db.orders.find((o) => o.items && o.items.length > 0 && o.outlet_id === outlet.id) ?? db.orders[0]!;
    const forced = url.searchParams.get("method");
    const method: PaymentMethod = forced === "qris" || forced === "cash" ? forced : Math.random() < 0.35 ? "cash" : "qris";
    const now = wib(new Date());
    const id = Math.max(...db.orders.map((o) => o.id)) + 1;
    const customer = db.customers[Math.floor(Math.random() * db.customers.length)]!;
    // Pesanan QRIS baru menunggu konfirmasi pembayaran manual oleh admin.
    const status: OrderStatus = "pending";
    const payment = { ...template.payments!.at(-1)!, id: nextAdminId(), method, method_label: PAYMENT_LABEL[method], provider: method === "cash" ? "cash" : "manual", status: "pending" as const, status_label: "Menunggu", paid_at: null, amount: template.total, ...manualQrisFields(method, "pending") };
    const order: MockOrder = {
      ...template,
      stock_status: undefined,
      id,
      code: `KM${now.slice(2, 10).replace(/-/g, "")}${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      status,
      fulfillment: Math.random() < 0.3 ? "delivery" : "pickup",
      outlet_id: outlet.id,
      outlet: { id: outlet.id, name: outlet.name, phone_wa: outlet.phone_wa },
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone_wa,
      channel: "web",
      created_at: now,
      updated_at: now,
      paid_at: payment.paid_at,
      completed_at: null,
      cancelled_reason: null,
      items: template.items!.map((i) => ({ ...i, id: nextAdminId() })),
      payments: [payment],
      status_logs: [
        { from_status: null, to_status: "pending", note: "Pesanan dibuat via Website", changed_by: null, at: now },
      ],
    };
    if (order.fulfillment === "delivery") order.address = customer.addresses[0]?.address ?? "Tangerang";
    db.orders.unshift(order);
    return ok({ data: toEvent(order) }, 201);
  })),
  http.get(`${A}/orders`, route(({ user, url }) => {
    let list = scopedOrders(user);
    const status = filter(url, "status");
    if (status) {
      const set = status.split(",");
      list = list.filter((o) => set.includes(o.status));
    }
    const outletId = Number(filter(url, "outlet_id"));
    if (outletId) list = list.filter((o) => o.outlet_id === outletId);
    for (const k of ["channel", "fulfillment"] as const) {
      const v = filter(url, k);
      if (v) list = list.filter((o) => o[k] === v);
    }
    const from = filter(url, "from");
    const to = filter(url, "to");
    if (from) list = list.filter((o) => new Date(o.created_at).getTime() >= dayStart(from));
    if (to) list = list.filter((o) => new Date(o.created_at).getTime() < dayStart(to) + DAY);
    const q = filter(url, "search").toLowerCase();
    if (q) list = list.filter((o) => o.code.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q) || o.customer_phone.includes(q));
    list = sortList(list, url, ["created_at", "total"], "-created_at");
    const page = paginate(list, url);
    return ok({ ...page, data: page.data.map((o) => serializeOrder(o)) });
  })),
  http.get(`${A}/orders/:id`, route<{ id: string }>(({ user, params }) => {
    const order = scopedOrders(user).find((o) => o.id === Number(params.id));
    if (!order) throw notFound();
    return ok({ data: serializeOrder(order, true) });
  })),
  http.patch(`${A}/orders/:id/status`, route<{ id: string }>(async ({ user, params, request }) => {
    const order = scopedOrders(user).find((o) => o.id === Number(params.id));
    if (!order) throw notFound();
    const b = await body(request);
    const to = String(b.status ?? "") as OrderStatus;
    if (!ORDER_STATUS_LABEL[to]) throw invalid("status", "Status tidak valid.");
    transition(order, to, user, str(b.note));
    return ok({ data: serializeOrder(order, true), message: `Status pesanan diperbarui menjadi "${ORDER_STATUS_LABEL[to]}".` });
  })),
  http.post(`${A}/orders/:id/confirm-payment`, route<{ id: string }>(async ({ user, params, request }) => {
    const order = scopedOrders(user).find((o) => o.id === Number(params.id));
    if (!order) throw notFound();
    if (order.status !== "pending") throw invalid("order", "Pesanan tidak dalam status menunggu pembayaran.");
    const b = await body(request);
    const note = str(b.note);
    const method = (b.method ?? "qris") as BookMethod;
    if (!["qris", "bank_transfer", "cash"].includes(method)) throw invalid("method", "Metode bayar harus QRIS, Transfer, atau Tunai.");
    const bank = method === "bank_transfer" ? str(b.bank) : null;
    const label = paymentLabel(method, bank);
    const at = wib(new Date());
    let p = [...(order.payments ?? [])].reverse().find((x) => x.status === "pending" || x.status === "expired");
    if (!p) {
      p = { id: nextAdminId(), method, method_label: label, provider: "manual", reference: null, amount: order.total, status: "pending", status_label: "Menunggu", qr_string: null, va_number: null, bank: null, deeplink: null, expires_at: null, paid_at: null, ...manualQrisFields(method, "pending") };
      (order.payments ??= []).push(p);
    }
    p.method = method;
    p.method_label = label;
    p.bank = bank;
    p.status = "paid";
    p.status_label = "Berhasil";
    p.paid_at = at;
    Object.assign(p, manualQrisFields(method, "done"));
    order.payment = p;
    order.paid_at = at;
    (order.status_logs ??= []).push({ from_status: "pending", to_status: "paid", note: `Pembayaran ${label} dikonfirmasi oleh ${user.name}${note ? ` — ${note}` : ""}`, changed_by: user.name, at });
    order.status = "paid";
    order.updated_at = at;
    order.handled_by = { id: user.id, name: user.name };
    syncOrderStock(adminDb(), order, user);
    return ok({ data: serializeOrder(order, true), message: 'Pembayaran dikonfirmasi. Pesanan berstatus "Sudah dibayar".' });
  })),
  http.post(`${A}/orders/:id/refund`, route<{ id: string }>(async ({ user, params, request }) => {
    requireSuper(user);
    const order = scopedOrders(user).find((o) => o.id === Number(params.id));
    if (!order) throw notFound();
    const b = await body(request);
    const reason = str(b.reason);
    if (!reason) throw invalid("reason", "Alasan refund wajib diisi.");
    const p = order.payments?.at(-1);
    if (!p || p.status !== "paid" || p.method === "cash") throw invalid("reason", "Hanya pembayaran online yang sudah lunas yang dapat di-refund.");
    if (order.status === "completed" || order.status === "cancelled") throw invalid("reason", "Pesanan ini tidak dapat di-refund.");
    const at = wib(new Date());
    p.status = "refunded";
    p.status_label = "Dikembalikan";
    (order.status_logs ??= []).push({ from_status: order.status, to_status: "cancelled", note: `Refund: ${reason}`, changed_by: user.name, at });
    order.status = "cancelled";
    order.cancelled_reason = `Refund: ${reason}`;
    order.updated_at = at;
    syncOrderStock(adminDb(), order, user);
    return ok({ data: serializeOrder(order, true), message: "Refund berhasil diproses dan pesanan dibatalkan." });
  })),

  /* ---------------- produk */
  http.post(`${A}/products/bulk`, route(async ({ user, request }) => {
    requireSuper(user);
    const b = await body(request);
    const ids = ((b.ids as unknown[]) ?? []).map(Number);
    const action = String(b.action ?? "");
    if (!ids.length) throw invalid("ids", "Pilih minimal satu produk.");
    const actions: Record<string, (p: AdminProduct) => void> = {
      activate: (p) => (p.is_active = true),
      deactivate: (p) => (p.is_active = false),
      feature: (p) => (p.is_featured = true),
      unfeature: (p) => (p.is_featured = false),
      best_seller: (p) => (p.is_best_seller = true),
      unbest_seller: (p) => (p.is_best_seller = false),
      delete: (p) => (p.deleted_at = wib(new Date())),
    };
    if (!actions[action]) throw invalid("action", "Aksi tidak dikenal.");
    const list = adminDb().products.filter((p) => ids.includes(p.id) && !p.deleted_at);
    list.forEach(actions[action]);
    return ok({ message: `${list.length} produk berhasil diperbarui.`, data: { action, affected: list.length } });
  })),
  http.get(`${A}/products`, route(({ url }) => {
    let list = adminDb().products.filter((p) => !p.deleted_at);
    const cat = Number(filter(url, "category_id"));
    if (cat) list = list.filter((p) => p.category_id === cat);
    const active = filter(url, "is_active");
    if (active !== "") list = list.filter((p) => p.is_active === bool(active));
    const q = filter(url, "search").toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    list = sortList(list, url, ["name", "base_price", "sold_count", "created_at", "id"], "name");
    const page = paginate(list, url);
    return ok({ ...page, data: page.data.map((p) => serializeProduct(p)) });
  })),
  http.post(`${A}/products`, route(async ({ user, request }) => {
    requireSuper(user);
    const b = await body(request);
    const p = { id: nextAdminId(), name: "", slug: "", short_description: null, base_price: 0, image_url: null, rating_avg: 0, review_count: 0, sold_count: 0, is_featured: false, is_best_seller: false, is_active: true, category_id: 0, description: null, composition: null, calories: null, images: [], option_group_ids: [], unavailable_outlet_ids: [], deleted_at: null } as unknown as AdminProduct;
    await applyProduct(p, b, true);
    adminDb().products.push(p);
    return ok({ data: serializeProduct(p, true), message: "Produk berhasil ditambahkan." }, 201);
  })),
  http.get(`${A}/products/:id`, route<{ id: string }>(({ params }) => ok({ data: serializeProduct(findProduct(params.id), true) }))),
  ...(["patch", "post"] as const).map((m) =>
    http[m](`${A}/products/:id`, route<{ id: string }>(async ({ user, params, request }) => {
      requireSuper(user);
      const p = findProduct(params.id);
      await applyProduct(p, await body(request), false);
      return ok({ data: serializeProduct(p, true), message: "Produk berhasil diperbarui." });
    })),
  ),
  http.delete(`${A}/products/:id`, route<{ id: string }>(({ user, params }) => {
    requireSuper(user);
    findProduct(params.id).deleted_at = wib(new Date());
    return ok({ message: "Produk berhasil dihapus." });
  })),
  http.post(`${A}/products/:id/images`, route<{ id: string }>(async ({ user, params, request }) => {
    requireSuper(user);
    const p = findProduct(params.id);
    const files = (await body(request)).__files?.images ?? [];
    if (!files.length) throw invalid("images", "Pilih minimal satu gambar.");
    if (files.length > 8) throw invalid("images", "Maksimal 8 gambar sekali unggah.");
    files.forEach((f) => checkImage(f, "images", 3));
    const start = Math.max(-1, ...(p.images ?? []).map((i) => i.sort_order)) + 1;
    const added = await Promise.all(files.map(async (f, i) => ({ id: nextAdminId(), url: await fileUrl(f), alt: p.name, sort_order: start + i })));
    p.images = [...(p.images ?? []), ...added];
    return ok({ message: `${added.length} gambar berhasil diunggah.`, data: added }, 201);
  })),
  http.put(`${A}/products/:id/images/order`, route<{ id: string }>(async ({ user, params, request }) => {
    requireSuper(user);
    const p = findProduct(params.id);
    const ids = ((await body(request)).ids as unknown[] ?? []).map(Number);
    const existing = (p.images ?? []).map((i) => i.id);
    if (ids.length !== existing.length || existing.some((id) => !ids.includes(id))) throw new Fail(422, "Daftar gambar tidak sesuai dengan galeri produk.");
    p.images = ids.map((id, i) => ({ ...p.images!.find((x) => x.id === id)!, sort_order: i }));
    return ok({ message: "Urutan gambar diperbarui.", data: p.images });
  })),
  http.delete(`${A}/products/:id/images/:imageId`, route<{ id: string; imageId: string }>(({ user, params }) => {
    requireSuper(user);
    const p = findProduct(params.id);
    if (!p.images?.some((i) => i.id === Number(params.imageId))) throw notFound();
    p.images = p.images.filter((i) => i.id !== Number(params.imageId));
    return ok({ message: "Gambar berhasil dihapus." });
  })),
  http.patch(`${A}/outlets/:outletId/products/:productId`, route<{ outletId: string; productId: string }>(async ({ user, params, request }) => {
    const db = adminDb();
    const outletId = Number(params.outletId);
    if (!isSuper(user) && user.outlet_id !== outletId) throw forbidden();
    const outlet = db.outlets.find((o) => o.id === outletId);
    if (!outlet) throw notFound();
    const p = findProduct(params.productId);
    const available = bool((await body(request)).is_available);
    const set = new Set(db.unavailable[outletId] ?? []);
    if (available) set.delete(p.id);
    else set.add(p.id);
    db.unavailable[outletId] = [...set];
    return ok({
      message: available ? `${p.name} tersedia kembali di ${outlet.name}.` : `${p.name} ditandai habis di ${outlet.name}.`,
      data: { outlet_id: outletId, product_id: p.id, is_available: available },
    });
  })),

  /* ---------------- kategori & opsi */
  http.get(`${A}/categories`, route(() => {
    const db = adminDb();
    return ok({ data: [...db.categories].sort((a, b) => a.sort_order - b.sort_order).map((c) => ({ ...c, products_count: db.products.filter((p) => p.category_id === c.id && !p.deleted_at).length })) });
  })),
  http.post(`${A}/categories`, route(async ({ user, request }) => {
    requireSuper(user);
    const b = await body(request);
    required(b, { name: "Nama kategori" }, true);
    const db = adminDb();
    const slug = str(b.slug) ?? slugify(String(b.name));
    if (db.categories.some((c) => c.slug === slug)) throw invalid("slug", "Slug sudah digunakan.");
    const c = { id: nextAdminId(), name: String(b.name).trim(), slug, icon: str(b.icon), sort_order: int(b.sort_order) ?? db.categories.length + 1, is_active: has(b, "is_active") ? bool(b.is_active) : true };
    db.categories.push(c);
    return ok({ data: c, message: "Kategori berhasil ditambahkan." }, 201);
  })),
  http.patch(`${A}/categories/:id`, route<{ id: string }>(async ({ user, params, request }) => {
    requireSuper(user);
    const c = adminDb().categories.find((x) => x.id === Number(params.id));
    if (!c) throw notFound();
    const b = await body(request);
    required(b, { name: "Nama kategori" }, false);
    if (has(b, "name")) c.name = String(b.name).trim();
    if (has(b, "slug") && str(b.slug)) c.slug = str(b.slug)!;
    if (has(b, "icon")) c.icon = str(b.icon);
    if (has(b, "sort_order")) c.sort_order = int(b.sort_order) ?? 0;
    if (has(b, "is_active")) c.is_active = bool(b.is_active);
    return ok({ data: c, message: "Kategori berhasil diperbarui." });
  })),
  http.delete(`${A}/categories/:id`, route<{ id: string }>(({ user, params }) => {
    requireSuper(user);
    const db = adminDb();
    const id = Number(params.id);
    if (db.products.some((p) => p.category_id === id && !p.deleted_at)) throw new Fail(422, "Kategori masih memiliki produk. Pindahkan produknya terlebih dahulu.");
    db.categories = db.categories.filter((c) => c.id !== id);
    return ok({ message: "Kategori berhasil dihapus." });
  })),
  http.get(`${A}/option-groups`, route(() => ok({ data: adminDb().optionGroups }))),
  ...(["post", "patch"] as const).map((m) =>
    http[m](m === "post" ? `${A}/option-groups` : `${A}/option-groups/:id`, route<{ id?: string }>(async ({ user, params, request }) => {
      requireSuper(user);
      const db = adminDb();
      const b = await body(request);
      const creating = m === "post";
      required(b, { name: "Nama grup", type: "Tipe" }, creating);
      const options = b.options as { id?: number | null; name: string; price_delta: number }[] | undefined;
      if (creating && (!options || options.length === 0)) throw invalid("options", "Tambahkan minimal satu opsi.");
      options?.forEach((o, i) => {
        if (!String(o.name ?? "").trim()) throw invalid(`options.${i}.name`, `Nama opsi ke-${i + 1} wajib diisi.`);
      });
      let g = creating ? undefined : db.optionGroups.find((x) => x.id === Number(params.id));
      if (!creating && !g) throw notFound();
      if (!g) {
        g = { id: nextAdminId(), name: "", type: "single", is_required: false, options: [] };
        db.optionGroups.push(g);
      }
      if (has(b, "name")) g.name = String(b.name).trim();
      if (has(b, "type")) g.type = b.type === "multi" ? "multi" : "single";
      if (has(b, "is_required")) g.is_required = bool(b.is_required);
      if (options) g.options = options.map((o, i) => ({ id: o.id ?? nextAdminId(), name: o.name.trim(), price_delta: Number(o.price_delta) || 0, sort_order: i }));
      return ok({ data: g, message: creating ? "Grup opsi berhasil ditambahkan." : "Grup opsi berhasil diperbarui." }, creating ? 201 : 200);
    })),
  ),
  http.delete(`${A}/option-groups/:id`, route<{ id: string }>(({ user, params }) => {
    requireSuper(user);
    const db = adminDb();
    const id = Number(params.id);
    db.optionGroups = db.optionGroups.filter((g) => g.id !== id);
    db.products.forEach((p) => (p.option_group_ids = (p.option_group_ids ?? []).filter((x) => x !== id)));
    return ok({ message: "Grup opsi berhasil dihapus." });
  })),

  /* ---------------- promo */
  http.get(`${A}/promotions`, route(({ url }) => {
    let list = adminDb().promotions;
    const type = filter(url, "type");
    if (type) list = list.filter((p) => p.type === type);
    const active = filter(url, "is_active");
    if (active !== "") list = list.filter((p) => p.is_active === bool(active));
    return ok(paginate(sortList(list, url, ["id", "starts_at", "ends_at"], "-id"), url));
  })),
  ...(["post", "patch"] as const).map((m) =>
    http[m](m === "post" ? `${A}/promotions` : `${A}/promotions/:id`, route<{ id?: string }>(async ({ user, params, request }) => {
      requireSuper(user);
      const db = adminDb();
      const b = await body(request);
      const creating = m === "post";
      required(b, { name: "Nama promo", type: "Tipe promo", value: "Nilai" }, creating);
      let p = creating ? undefined : db.promotions.find((x) => x.id === Number(params.id));
      if (!creating && !p) throw notFound();
      const code = has(b, "code") ? str(b.code)?.toUpperCase() ?? null : undefined;
      if (code && db.promotions.some((x) => x.code === code && x.id !== p?.id)) throw invalid("code", "Kode voucher sudah digunakan.");
      const type = String(b.type ?? p?.type ?? "");
      const value = has(b, "value") ? int(b.value) : p?.value;
      if (type === "percent" && (value! < 1 || value! > 100)) throw invalid("value", "Diskon persen harus 1–100.");
      if (b.starts_at && b.ends_at && new Date(String(b.ends_at)) <= new Date(String(b.starts_at))) throw invalid("ends_at", "Tanggal berakhir harus setelah tanggal mulai.");
      if (!p) {
        p = { id: nextAdminId(), code: null, name: "", type: "percent", type_label: "", value: 0, min_spend: 0, max_discount: null, per_customer_limit: null, outlet_id: null, starts_at: null, ends_at: null, is_automatic: false, quota: null, used: 0, is_active: true };
        db.promotions.unshift(p);
      }
      if (code !== undefined) p.code = code;
      if (has(b, "name")) p.name = String(b.name).trim();
      if (has(b, "type")) p.type = b.type as typeof p.type;
      p.type_label = { percent: "Diskon persen", fixed: "Potongan harga", bogo: "Beli 1 gratis 1", free_delivery: "Gratis ongkir" }[p.type];
      if (has(b, "value")) p.value = value ?? 0;
      for (const k of ["min_spend", "max_discount", "quota", "per_customer_limit", "outlet_id"] as const) if (has(b, k)) (p as unknown as Record<string, unknown>)[k] = k === "min_spend" ? int(b[k]) ?? 0 : int(b[k]);
      for (const k of ["starts_at", "ends_at"] as const) if (has(b, k)) p[k] = str(b[k]) ? wib(new Date(String(b[k]))) : null;
      if (has(b, "is_active")) p.is_active = bool(b.is_active);
      p.is_automatic = !p.code;
      return ok({ data: p, message: creating ? "Promo berhasil ditambahkan." : "Promo berhasil diperbarui." }, creating ? 201 : 200);
    })),
  ),
  http.delete(`${A}/promotions/:id`, route<{ id: string }>(({ user, params }) => {
    requireSuper(user);
    const db = adminDb();
    db.promotions = db.promotions.filter((p) => p.id !== Number(params.id));
    return ok({ message: "Promo berhasil dihapus." });
  })),

  /* ---------------- banner */
  http.get(`${A}/banners`, route(() => ok({ data: [...adminDb().banners].sort((a, b) => a.sort_order - b.sort_order) }))),
  ...(["post", "patch"] as const).flatMap((m) => {
    const handler = route<{ id?: string }>(async ({ user, params, request }) => {
      requireSuper(user);
      const db = adminDb();
      const b = await body(request);
      const creating = !params.id;
      required(b, { title: "Judul" }, creating);
      const desktop = b.__files?.image_desktop_file?.[0];
      const mobile = b.__files?.image_mobile_file?.[0];
      checkImage(desktop, "image_desktop_file", 4);
      checkImage(mobile, "image_mobile_file", 4);
      if (creating && !desktop && !str(b.image_desktop)) throw invalid("image_desktop_file", "Gambar desktop wajib diunggah.");
      if (b.starts_at && b.ends_at && new Date(String(b.ends_at)) <= new Date(String(b.starts_at))) throw invalid("ends_at", "Tanggal berakhir harus setelah tanggal mulai.");
      let banner = creating ? undefined : db.banners.find((x) => x.id === Number(params.id));
      if (!creating && !banner) throw notFound();
      if (!banner) {
        banner = { id: nextAdminId(), title: "", subtitle: null, image_desktop_url: "", image_mobile_url: "", link_url: null, placement: "home", sort_order: db.banners.length, starts_at: null, ends_at: null, is_active: true };
        db.banners.push(banner);
      }
      if (has(b, "title")) banner.title = String(b.title).trim();
      for (const k of ["subtitle", "link_url"] as const) if (has(b, k)) banner[k] = str(b[k]);
      if (has(b, "placement")) banner.placement = str(b.placement) ?? "home";
      if (has(b, "sort_order")) banner.sort_order = int(b.sort_order) ?? 0;
      for (const k of ["starts_at", "ends_at"] as const) if (has(b, k)) banner[k] = str(b[k]) ? wib(new Date(String(b[k]))) : null;
      if (has(b, "is_active")) banner.is_active = bool(b.is_active);
      if (desktop) banner.image_desktop_url = await fileUrl(desktop);
      if (mobile) banner.image_mobile_url = await fileUrl(mobile);
      if (!banner.image_mobile_url) banner.image_mobile_url = banner.image_desktop_url;
      return ok({ data: banner, message: creating ? "Banner berhasil ditambahkan." : "Banner berhasil diperbarui." }, creating ? 201 : 200);
    });
    return m === "post" ? [http.post(`${A}/banners`, handler), http.post(`${A}/banners/:id`, handler)] : [http.patch(`${A}/banners/:id`, handler)];
  }),
  http.delete(`${A}/banners/:id`, route<{ id: string }>(({ user, params }) => {
    requireSuper(user);
    const db = adminDb();
    db.banners = db.banners.filter((x) => x.id !== Number(params.id));
    return ok({ message: "Banner berhasil dihapus." });
  })),

  /* ---------------- pelanggan */
  http.get(`${A}/customers`, route(({ url }) => {
    let list = adminDb().customers;
    const tier = Number(filter(url, "tier_id"));
    if (tier) list = list.filter((c) => c.tier?.id === tier);
    const q = filter(url, "search").toLowerCase();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone_wa.includes(q) || (c.email ?? "").toLowerCase().includes(q));
    const page = paginate(sortList(list, url, ["lifetime_spend", "points_balance", "created_at", "name"], "-created_at"), url);
    return ok({ ...page, data: page.data.map(({ addresses: _a, ...c }) => c) });
  })),
  http.get(`${A}/customers/:id`, route<{ id: string }>(({ params }) => {
    const db = adminDb();
    const c = db.customers.find((x) => x.id === Number(params.id));
    if (!c) throw notFound();
    const orders = db.orders.filter((o) => o.customer_id === c.id);
    const done = orders.filter((o) => o.status === "completed");
    return ok({
      data: { ...c, stats: { orders_count: orders.length, completed_orders: done.length, total_spend: done.reduce((s, o) => s + o.total, 0), last_order_at: orders[0]?.created_at ?? null } },
      recent_orders: orders.slice(0, 10).map((o) => serializeOrder(o)),
      points_history: (db.loyalty[c.id] ?? []).slice(0, 20),
    });
  })),
  http.post(`${A}/customers/:id/points-adjust`, route<{ id: string }>(async ({ user, params, request }) => {
    requireSuper(user);
    const db = adminDb();
    const c = db.customers.find((x) => x.id === Number(params.id));
    if (!c) throw notFound();
    const b = await body(request);
    const points = int(b.points);
    if (!points || Number.isNaN(points)) throw invalid("points", "Jumlah poin wajib diisi dan tidak boleh 0.");
    if (Math.abs(points) > 100_000) throw invalid("points", "Koreksi maksimal 100.000 poin.");
    const note = str(b.note);
    if (!note) throw invalid("note", "Catatan wajib diisi.");
    if (c.points_balance + points < 0) throw invalid("points", "Saldo poin pelanggan tidak mencukupi untuk pengurangan ini.");
    c.points_balance += points;
    const tx = { id: nextAdminId(), type: "adjust" as const, type_label: "Koreksi admin", points, balance_after: c.points_balance, order_code: null, note, expires_at: null, created_at: wib(new Date()) };
    (db.loyalty[c.id] ??= []).unshift(tx);
    return ok({ message: "Poin pelanggan berhasil dikoreksi.", data: tx }, 201);
  })),

  /* ---------------- blog */
  http.get(`${A}/blogs`, route(({ url }) => {
    let list = adminDb().blogs;
    const status = filter(url, "status");
    if (status) list = list.filter((b) => b.status === status);
    const cat = Number(filter(url, "blog_category_id"));
    if (cat) list = list.filter((b) => b.category?.id === cat);
    const q = filter(url, "search").toLowerCase();
    if (q) list = list.filter((b) => b.title.toLowerCase().includes(q));
    const page = paginate(sortList(list, url, ["created_at", "published_at", "views", "id"], "-id"), url);
    return ok({ ...page, data: page.data.map(({ content: _c, meta_title: _t, meta_description: _d, ...b }) => b) });
  })),
  http.get(`${A}/blogs/:id`, route<{ id: string }>(({ params }) => {
    const b = adminDb().blogs.find((x) => x.id === Number(params.id));
    if (!b) throw notFound();
    return ok({ data: b });
  })),
  ...(["post", "patch"] as const).flatMap((m) => {
    const handler = route<{ id?: string }>(async ({ user, params, request }) => {
      requireSuper(user);
      const db = adminDb();
      const b = await body(request);
      const creating = !params.id;
      required(b, { title: "Judul", content: "Isi artikel" }, creating);
      const cover = b.__files?.cover?.[0];
      checkImage(cover, "cover", 4);
      let blog = creating ? undefined : db.blogs.find((x) => x.id === Number(params.id));
      if (!creating && !blog) throw notFound();
      const slug = str(b.slug) ?? (creating ? slugify(String(b.title)) : null);
      if (slug && db.blogs.some((x) => x.slug === slug && x.id !== blog?.id)) throw invalid("slug", "Slug sudah digunakan.");
      if (!blog) {
        blog = { id: nextAdminId(), title: "", slug: "", excerpt: null, cover_url: null, category: null, author: user.name, status: "draft", published_at: null, views: 0, content: "", blog_category_id: null };
        db.blogs.unshift(blog);
      }
      if (has(b, "title")) blog.title = String(b.title).trim();
      if (slug) blog.slug = slug;
      if (has(b, "excerpt")) blog.excerpt = str(b.excerpt);
      if (has(b, "content")) blog.content = String(b.content);
      if (has(b, "meta_title")) blog.meta_title = str(b.meta_title) ?? undefined;
      if (has(b, "meta_description")) blog.meta_description = str(b.meta_description) ?? undefined;
      if (has(b, "blog_category_id")) {
        blog.blog_category_id = int(b.blog_category_id);
        blog.category = db.blogCategories.find((c) => c.id === blog!.blog_category_id) ?? null;
      }
      if (has(b, "status")) blog.status = b.status === "published" ? "published" : "draft";
      if (has(b, "published_at")) blog.published_at = str(b.published_at) ? wib(new Date(String(b.published_at))) : null;
      if (blog.status === "published" && !blog.published_at) blog.published_at = wib(new Date());
      if (cover) blog.cover_url = await fileUrl(cover);
      return ok({ data: blog, message: creating ? "Artikel berhasil ditambahkan." : "Artikel berhasil diperbarui." }, creating ? 201 : 200);
    });
    return m === "post" ? [http.post(`${A}/blogs`, handler), http.post(`${A}/blogs/:id`, handler)] : [http.patch(`${A}/blogs/:id`, handler)];
  }),
  http.delete(`${A}/blogs/:id`, route<{ id: string }>(({ user, params }) => {
    requireSuper(user);
    const db = adminDb();
    db.blogs = db.blogs.filter((x) => x.id !== Number(params.id));
    return ok({ message: "Artikel berhasil dihapus." });
  })),
  http.get(`${A}/blog-categories`, route(() => {
    const db = adminDb();
    return ok({ data: db.blogCategories.map((c) => ({ ...c, blogs_count: db.blogs.filter((b) => b.category?.id === c.id).length })) });
  })),
  ...(["post", "patch"] as const).map((m) =>
    http[m](m === "post" ? `${A}/blog-categories` : `${A}/blog-categories/:id`, route<{ id?: string }>(async ({ user, params, request }) => {
      requireSuper(user);
      const db = adminDb();
      const b = await body(request);
      required(b, { name: "Nama kategori" }, m === "post");
      let c = m === "post" ? undefined : db.blogCategories.find((x) => x.id === Number(params.id));
      if (m === "patch" && !c) throw notFound();
      if (!c) {
        c = { id: nextAdminId(), name: "", slug: "" };
        db.blogCategories.push(c);
      }
      if (has(b, "name")) c.name = String(b.name).trim();
      c.slug = str(b.slug) ?? slugify(c.name);
      return ok({ data: c, message: "Kategori blog tersimpan." }, m === "post" ? 201 : 200);
    })),
  ),
  http.delete(`${A}/blog-categories/:id`, route<{ id: string }>(({ user, params }) => {
    requireSuper(user);
    const db = adminDb();
    const id = Number(params.id);
    if (db.blogs.some((b) => b.category?.id === id)) throw new Fail(422, "Kategori masih dipakai artikel.");
    db.blogCategories = db.blogCategories.filter((c) => c.id !== id);
    return ok({ message: "Kategori blog dihapus." });
  })),

  /* ---------------- pesan masuk */
  http.get(`${A}/contacts`, route(({ url }) => {
    let list = adminDb().contacts;
    const status = filter(url, "status");
    if (status) list = list.filter((c) => c.status === status);
    return ok(paginate(sortList(list, url, ["created_at"], "-created_at"), url));
  })),
  http.get(`${A}/contacts/:id`, route<{ id: string }>(({ params }) => {
    const c = adminDb().contacts.find((x) => x.id === Number(params.id));
    if (!c) throw notFound();
    return ok({ data: c });
  })),
  http.patch(`${A}/contacts/:id`, route<{ id: string }>(async ({ params, request }) => {
    const c = adminDb().contacts.find((x) => x.id === Number(params.id));
    if (!c) throw notFound();
    const s = String((await body(request)).status ?? "");
    if (!["new", "read", "replied"].includes(s)) throw invalid("status", "Status tidak valid.");
    c.status = s as typeof c.status;
    return ok({ data: c, message: "Status pesan diperbarui." });
  })),

  /* ---------------- outlet */
  http.get(`${A}/outlets`, route(({ user }) => {
    const list = adminDb().outlets;
    return ok({ data: isSuper(user) ? list : list.filter((o) => o.id === user.outlet_id) });
  })),
  http.get(`${A}/outlets/:id`, route<{ id: string }>(({ user, params }) => {
    const o = adminDb().outlets.find((x) => x.id === Number(params.id));
    if (!o) throw notFound();
    if (!isSuper(user) && user.outlet_id !== o.id) throw forbidden();
    return ok({ data: o });
  })),
  ...(["post", "patch"] as const).map((m) =>
    http[m](m === "post" ? `${A}/outlets` : `${A}/outlets/:id`, route<{ id?: string }>(async ({ user, params, request }) => {
      requireSuper(user);
      const db = adminDb();
      const b = await body(request);
      const creating = m === "post";
      required(b, { name: "Nama outlet", address: "Alamat", city: "Kota", lat: "Latitude", lng: "Longitude", phone_wa: "Nomor WhatsApp" }, creating);
      if (has(b, "phone_wa") && !/^62\d{8,13}$/.test(String(b.phone_wa).replace(/\D/g, "").replace(/^0/, "62"))) throw invalid("phone_wa", "Nomor WhatsApp tidak valid.");
      let o = creating ? undefined : db.outlets.find((x) => x.id === Number(params.id));
      if (!creating && !o) throw notFound();
      if (!o) {
        o = { id: nextAdminId(), name: "", slug: "", address: "", city: "", lat: 0, lng: 0, phone_wa: "", open_time: "10:00", close_time: "17:00", is_open: true, is_open_now: true, delivery_radius_km: 5 };
        db.outlets.push(o);
      }
      if (has(b, "name")) o.name = String(b.name).trim();
      o.slug = str(b.slug) ?? (creating ? `kamee-${slugify(o.name.replace(/^kamee coffee\s*/i, ""))}` : o.slug);
      for (const k of ["address", "city", "open_time", "close_time"] as const) if (has(b, k)) o[k] = String(b[k]);
      for (const k of ["lat", "lng", "delivery_radius_km"] as const) if (has(b, k)) o[k] = Number(b[k]);
      if (has(b, "phone_wa")) o.phone_wa = String(b.phone_wa).replace(/\D/g, "").replace(/^0/, "62");
      if (has(b, "is_open")) o.is_open = bool(b.is_open);
      return ok({ data: o, message: creating ? "Outlet berhasil ditambahkan." : "Outlet berhasil diperbarui." }, creating ? 201 : 200);
    })),
  ),
  http.delete(`${A}/outlets/:id`, route<{ id: string }>(({ user, params }) => {
    requireSuper(user);
    const db = adminDb();
    const id = Number(params.id);
    if (db.orders.some((o) => o.outlet_id === id)) throw new Fail(422, "Outlet sudah memiliki riwayat pesanan dan tidak dapat dihapus. Tandai sebagai tutup saja.");
    db.outlets = db.outlets.filter((o) => o.id !== id);
    return ok({ message: "Outlet berhasil dihapus." });
  })),

  /* ---------------- pengguna */
  http.get(`${A}/users`, route(({ user, url }) => {
    requireSuper(user);
    return ok(paginate(adminDb().users.map(publicUser), url));
  })),
  ...(["post", "patch"] as const).map((m) =>
    http[m](m === "post" ? `${A}/users` : `${A}/users/:id`, route<{ id?: string }>(async ({ user, params, request }) => {
      requireSuper(user);
      const db = adminDb();
      const b = await body(request);
      const creating = m === "post";
      required(b, { name: "Nama", email: "Email", role: "Peran", ...(creating ? { password: "Kata sandi" } : {}) }, creating);
      const email = has(b, "email") ? String(b.email).trim().toLowerCase() : undefined;
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalid("email", "Format email tidak valid.");
      let u = creating ? undefined : db.users.find((x) => x.id === Number(params.id));
      if (!creating && !u) throw notFound();
      if (email && db.users.some((x) => x.email === email && x.id !== u?.id)) throw invalid("email", "Email sudah digunakan.");
      if (str(b.password) && String(b.password).length < 8) throw invalid("password", "Kata sandi minimal 8 karakter.");
      const role = (b.role ?? u?.role) as AdminUser["role"];
      const outletId = has(b, "outlet_id") ? int(b.outlet_id) : u?.outlet_id ?? null;
      if (role === "outlet_admin" && !outletId) throw invalid("outlet_id", "Outlet wajib dipilih untuk Admin Outlet.");
      if (!creating && u!.id === user.id && (role !== "super_admin" || (has(b, "is_active") && !bool(b.is_active)))) throw new Fail(422, "Anda tidak dapat menurunkan peran atau menonaktifkan akun sendiri.");
      if (!u) {
        u = { id: nextAdminId(), name: "", email: "", role: "outlet_admin", role_label: "", outlet_id: null, outlet: null, is_active: true, last_login_at: null, created_at: wib(new Date()), password: "", token: `mock-token-${Date.now()}` };
        db.users.push(u);
      }
      if (has(b, "name")) u.name = String(b.name).trim();
      if (email) u.email = email;
      if (str(b.password)) u.password = String(b.password);
      u.role = role;
      u.role_label = role === "super_admin" ? "Admin" : "Admin Outlet";
      u.outlet_id = role === "super_admin" ? null : outletId;
      u.outlet = u.outlet_id ? { id: u.outlet_id, name: db.outlets.find((o) => o.id === u!.outlet_id)?.name ?? "" } : null;
      if (has(b, "is_active")) u.is_active = bool(b.is_active);
      return ok({ data: publicUser(u), message: creating ? "Pengguna berhasil ditambahkan." : "Pengguna berhasil diperbarui." }, creating ? 201 : 200);
    })),
  ),
  http.delete(`${A}/users/:id`, route<{ id: string }>(({ user, params }) => {
    requireSuper(user);
    if (Number(params.id) === user.id) throw forbidden();
    const db = adminDb();
    db.users = db.users.filter((u) => u.id !== Number(params.id));
    return ok({ message: "Pengguna berhasil dihapus." });
  })),

  /* ---------------- pengaturan */
  http.get(`${A}/settings`, route(({ user }) => {
    requireSuper(user);
    return ok({ data: adminDb().settings });
  })),
  http.put(`${A}/settings`, route(async ({ user, request }) => {
    requireSuper(user);
    const db = adminDb();
    const b = await body(request);
    const s = db.settings as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(b)) {
      if (!(k in s)) continue;
      if (k === "whatsapp_number") {
        const phone = String(v).replace(/\D/g, "").replace(/^0/, "62");
        if (!/^62\d{8,13}$/.test(phone)) throw invalid(k, "Nomor WhatsApp tidak valid.");
        s[k] = phone;
      } else if (k.endsWith("_time")) {
        if (!/^\d{2}:\d{2}$/.test(String(v))) throw invalid(k, "Format jam HH:MM.");
        s[k] = String(v);
      } else {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) throw invalid(k, "Nilai harus berupa angka ≥ 0.");
        s[k] = n;
      }
    }
    return ok({ data: db.settings, message: "Pengaturan berhasil disimpan." });
  })),
];

export { tiers as mockTiers };
