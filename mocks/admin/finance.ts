/**
 * Mock backend fitur Keuangan admin (bahan & stok, belanja stok, resep & HPP, buku kas, kasir, ringkasan).
 * Meniru kamee-api /api/v1/admin. State disimpan di dalam DB mock admin (mocks/admin/db.ts) dan di-seed
 * deterministik dari buku catatan pemilik (periode 20–29 Sep 2026).
 *
 * Catatan: modul ini hanya meng-import TIPE dari ./db agar tidak terjadi import melingkar (db.ts memanggil
 * seedFinance() dari sini). Semua operasi menerima `db` sebagai argumen.
 */
import type { AdminOrder, AdminProduct, AdminUser, OptionGroup } from "@/lib/admin/types";
import { CHANNEL_LABEL } from "@/lib/admin/types";
import type { Payment } from "@/types/api";
import {
  BOOK_METHOD_LABEL,
  CATEGORY_LABEL,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type BookMethod,
  type CashCategory,
  type CashEntry,
  type CashType,
  type FinanceSummary,
  type Ingredient,
  type IngredientKind,
  type IngredientUnit,
  type MethodAmount,
  type MovementType,
  type ProductRecipe,
  type StockMovement,
  type StockPurchase,
  type StockPurchaseItem,
} from "@/lib/admin/finance-types";
import { SIZE_GROUP_NAME, computeVariant, costPerUnit, findRecipeVariant, matchSizeOption, round2, stockUsageForOrder, type CalcIngredient } from "@/lib/admin/finance-calc";
import type { MockAdminState, MockOrder } from "./db";

/* ------------------------------------------------------------------ error (dipakai juga oleh handlers.ts) */

export class Fail extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>) {
    super(message);
  }
}
export const invalid = (field: string, message: string) => new Fail(422, message, { [field]: [message] });
export const notFound = () => new Fail(404, "Data tidak ditemukan.");

/* ------------------------------------------------------------------ tipe state */

export interface MockIngredient {
  id: number;
  outlet_id: number;
  name: string;
  kind: IngredientKind;
  unit: IngredientUnit;
  pack_label: string;
  pack_size: number;
  pack_price: number;
  min_stock: number | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MockMovement extends StockMovement {
  outlet_id: number;
  stock_purchase_id: number | null;
  order_id: number | null;
}

export type MockStockPurchase = StockPurchase & { outlet_id: number };
export type MockCashEntry = CashEntry & { outlet_id: number };

export interface MockRecipe {
  is_sample: boolean;
  note: string | null;
  variants: { option_name: string | null; items: { ingredient_id: number; qty: number }[] }[];
}

export interface FinanceState {
  ingredients: MockIngredient[];
  movements: MockMovement[];
  stockPurchases: MockStockPurchase[];
  /** productId → resep */
  recipes: Record<number, MockRecipe>;
  cashEntries: MockCashEntry[];
}

type Actor = { id: number; name: string } | null;
type Body = Record<string, unknown>;

/* ------------------------------------------------------------------ util */

/** ISO dengan offset +07:00 (sama dengan wib() di db.ts; diduplikasi agar tidak import melingkar). */
function wib(d: Date): string {
  const local = new Date(d.getTime() + 7 * 3_600_000);
  return local.toISOString().replace(/\.\d{3}Z$/, "+07:00");
}
export function wibYmd(msOrIso: number | string): string {
  const ms = typeof msOrIso === "number" ? msOrIso : new Date(msOrIso).getTime();
  return new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
}
const nextId = (db: MockAdminState) => ++db.seq;
const actor = (u: AdminUser | null): Actor => (u ? { id: u.id, name: u.name } : null);

const has = (b: Body, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const str = (v: unknown) => (v === undefined || v === null ? null : String(v).trim() || null);
const num = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : NaN);
const bool = (v: unknown) => v === true || v === 1 || v === "1" || v === "true";
const isYmd = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());

const BOOK_METHODS: BookMethod[] = ["cash", "qris", "bank_transfer"];
const isBookMethod = (v: unknown): v is BookMethod => BOOK_METHODS.includes(v as BookMethod);
/** Metode pembayaran pesanan (termasuk legacy ewallet) → metode pembukuan. */
export const toBookMethod = (m: string | null | undefined): BookMethod => (m === "cash" ? "cash" : m === "qris" ? "qris" : "bank_transfer");
/** Label metode untuk pembayaran pesanan yang dicatat admin: "QRIS" / "Transfer BCA" / "Tunai". */
export function paymentLabel(method: BookMethod, bank?: string | null): string {
  if (method === "bank_transfer") return bank ? `Transfer ${bank}` : "Transfer";
  return BOOK_METHOD_LABEL[method];
}

const MOVEMENT_LABEL: Record<MovementType, string> = {
  opening: "Stok awal",
  purchase: "Belanja stok",
  sale: "Terjual",
  sale_reversal: "Batal jual",
  adjustment: "Stok opname",
};

/* ------------------------------------------------------------------ outlet scope */

/** Outlet untuk daftar: Admin Outlet = outletnya; Super Admin = ?outlet_id atau semua (null). */
export function listOutlet(user: AdminUser, url: URL): number | null {
  return user.role === "super_admin" ? Number(url.searchParams.get("outlet_id")) || null : user.outlet_id;
}
/** Outlet untuk data baru: Admin Outlet selalu outletnya sendiri. */
function targetOutlet(db: MockAdminState, user: AdminUser, b: Body, url?: URL): number {
  if (user.role !== "super_admin") return user.outlet_id!;
  const wanted = Number(b.outlet_id) || Number(url?.searchParams.get("outlet_id")) || db.outlets[0]!.id;
  if (!db.outlets.some((o) => o.id === wanted)) throw invalid("outlet_id", "Outlet tidak ditemukan.");
  return wanted;
}
const inScope = (outletId: number, scope: number | null) => scope === null || outletId === scope;
function canTouch(user: AdminUser, outletId: number) {
  return user.role === "super_admin" || user.outlet_id === outletId;
}

/* ------------------------------------------------------------------ produk & ukuran */

function productGroups(db: MockAdminState, p: AdminProduct): OptionGroup[] {
  return (p.option_group_ids ?? []).map((id) => db.optionGroups.find((g) => g.id === id)).filter((g): g is OptionGroup => !!g);
}
function sizeGroup(db: MockAdminState, p: AdminProduct): OptionGroup | undefined {
  return productGroups(db, p).find((g) => g.name.trim().toLowerCase() === SIZE_GROUP_NAME.toLowerCase());
}
function sizeOptionNames(db: MockAdminState, productId: number): string[] {
  const p = db.products.find((x) => x.id === productId);
  return p ? (sizeGroup(db, p)?.options.map((o) => o.name) ?? []) : [];
}

/* ------------------------------------------------------------------ bahan & stok */

function stockMap(db: MockAdminState): Map<number, number> {
  const map = new Map<number, number>();
  for (const m of db.movements) map.set(m.ingredient_id, (map.get(m.ingredient_id) ?? 0) + m.qty);
  for (const [k, v] of map) map.set(k, round2(v));
  return map;
}

export function serializeIngredient(ing: MockIngredient, stock: Map<number, number>): Ingredient {
  const { deleted_at: _d, ...rest } = ing;
  const stock_qty = stock.get(ing.id) ?? 0;
  return {
    ...rest,
    cost_per_unit: costPerUnit(ing.pack_price, ing.pack_size),
    stock_qty,
    low_stock: ing.min_stock !== null && stock_qty <= ing.min_stock,
  };
}

function calcIngredients(db: MockAdminState): Map<number, CalcIngredient> {
  const stock = stockMap(db);
  return new Map(
    db.ingredients
      .filter((i) => !i.deleted_at)
      .map((i) => [i.id, { id: i.id, name: i.name, unit: i.unit, cost_per_unit: costPerUnit(i.pack_price, i.pack_size), stock_qty: stock.get(i.id) ?? 0 }]),
  );
}

function addMovement(
  db: MockAdminState,
  m: { ingredient: MockIngredient; type: MovementType; qty: number; unit_cost?: number | null; reference?: string | null; note?: string | null; by: Actor; at: string; stock_purchase_id?: number | null; order_id?: number | null },
) {
  db.movements.push({
    id: nextId(db),
    outlet_id: m.ingredient.outlet_id,
    ingredient_id: m.ingredient.id,
    type: m.type,
    type_label: MOVEMENT_LABEL[m.type],
    qty: round2(m.qty),
    unit_cost: m.unit_cost ?? null,
    reference: m.reference ?? null,
    note: m.note ?? null,
    created_by: m.by,
    created_at: m.at,
    stock_purchase_id: m.stock_purchase_id ?? null,
    order_id: m.order_id ?? null,
  });
}

function findIngredient(db: MockAdminState, user: AdminUser, id: unknown): MockIngredient {
  const ing = db.ingredients.find((i) => i.id === Number(id) && !i.deleted_at);
  if (!ing || !canTouch(user, ing.outlet_id)) throw notFound();
  return ing;
}

export function listIngredients(db: MockAdminState, user: AdminUser, url: URL): Ingredient[] {
  const scope = listOutlet(user, url);
  const kind = url.searchParams.get("kind");
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const stock = stockMap(db);
  return db.ingredients
    .filter((i) => !i.deleted_at && inScope(i.outlet_id, scope) && (!kind || i.kind === kind) && (!q || i.name.toLowerCase().includes(q)))
    .sort((a, b) => (a.kind === b.kind ? a.id - b.id : a.kind === "bahan" ? -1 : 1))
    .slice(0, 500)
    .map((i) => serializeIngredient(i, stock));
}

function applyIngredient(db: MockAdminState, ing: MockIngredient, b: Body, creating: boolean) {
  const need = (k: string, label: string) => {
    if ((creating || has(b, k)) && (b[k] === undefined || b[k] === null || String(b[k]).trim() === "")) throw invalid(k, `${label} wajib diisi.`);
  };
  need("name", "Nama bahan");
  need("pack_size", "Isi per kemasan");
  need("pack_price", "Harga per kemasan");
  if (has(b, "name")) {
    const name = String(b.name).trim();
    if (name.length > 100) throw invalid("name", "Nama bahan maksimal 100 karakter.");
    if (db.ingredients.some((i) => !i.deleted_at && i.id !== ing.id && i.outlet_id === ing.outlet_id && i.name.toLowerCase() === name.toLowerCase())) throw invalid("name", "Nama bahan sudah ada.");
    ing.name = name;
  }
  if (has(b, "kind") || creating) {
    const kind = b.kind ?? "bahan";
    if (kind !== "bahan" && kind !== "kemasan") throw invalid("kind", "Jenis harus bahan atau kemasan.");
    ing.kind = kind;
  }
  if (has(b, "unit") || creating) {
    const unit = b.unit ?? (ing.kind === "kemasan" ? "pcs" : "gram");
    if (!["ml", "gram", "pcs"].includes(String(unit))) throw invalid("unit", "Satuan harus ml, gram, atau pcs.");
    ing.unit = unit as IngredientUnit;
  }
  if (has(b, "pack_size")) {
    const v = num(b.pack_size);
    if (v === null || Number.isNaN(v) || v <= 0) throw invalid("pack_size", "Isi per kemasan harus lebih dari 0.");
    ing.pack_size = v;
  }
  if (has(b, "pack_price")) {
    const v = num(b.pack_price);
    if (v === null || Number.isNaN(v) || v < 0) throw invalid("pack_price", "Harga per kemasan harus berupa angka ≥ 0.");
    ing.pack_price = Math.round(v);
  }
  if (has(b, "pack_label") || creating) ing.pack_label = str(b.pack_label) ?? ing.pack_label ?? `${ing.pack_size} ${ing.unit}`;
  if (has(b, "min_stock")) {
    const v = num(b.min_stock);
    if (Number.isNaN(v) || (v !== null && v < 0)) throw invalid("min_stock", "Batas stok minimum harus berupa angka ≥ 0.");
    ing.min_stock = v;
  }
  if (has(b, "note")) ing.note = str(b.note);
  if (has(b, "is_active")) ing.is_active = bool(b.is_active);
}

export function createIngredient(db: MockAdminState, user: AdminUser, b: Body, url: URL): Ingredient {
  const at = wib(new Date());
  const ing: MockIngredient = { id: 0, outlet_id: targetOutlet(db, user, b, url), name: "", kind: "bahan", unit: "gram", pack_label: "", pack_size: 1, pack_price: 0, min_stock: null, note: null, is_active: true, created_at: at, updated_at: at, deleted_at: null };
  applyIngredient(db, ing, b, true);
  const opening = num(b.opening_stock);
  if (Number.isNaN(opening) || (opening !== null && opening < 0)) throw invalid("opening_stock", "Stok awal harus berupa angka ≥ 0.");
  ing.id = nextId(db);
  db.ingredients.push(ing);
  if (opening) addMovement(db, { ingredient: ing, type: "opening", qty: opening, unit_cost: costPerUnit(ing.pack_price, ing.pack_size), note: "Stok awal", by: actor(user), at });
  return serializeIngredient(ing, stockMap(db));
}

export function updateIngredient(db: MockAdminState, user: AdminUser, id: unknown, b: Body): Ingredient {
  const ing = findIngredient(db, user, id);
  const draft = { ...ing };
  applyIngredient(db, draft, b, false);
  Object.assign(ing, draft, { updated_at: wib(new Date()) });
  return serializeIngredient(ing, stockMap(db));
}

export function deleteIngredient(db: MockAdminState, user: AdminUser, id: unknown) {
  const ing = findIngredient(db, user, id);
  ing.deleted_at = wib(new Date());
  // Baris resep yang memakai bahan ini ikut dihapus
  for (const r of Object.values(db.recipes)) for (const v of r.variants) v.items = v.items.filter((i) => i.ingredient_id !== ing.id);
}

export function ingredientMovements(db: MockAdminState, user: AdminUser, id: unknown): StockMovement[] {
  const ing = db.ingredients.find((i) => i.id === Number(id));
  if (!ing || !canTouch(user, ing.outlet_id)) throw notFound();
  return db.movements
    .filter((m) => m.ingredient_id === ing.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
    .map(({ outlet_id: _o, stock_purchase_id: _s, order_id: _r, ...m }) => m);
}

export function adjustIngredient(db: MockAdminState, user: AdminUser, id: unknown, b: Body): Ingredient {
  const ing = findIngredient(db, user, id);
  const counted = num(b.counted_qty);
  if (counted === null) throw invalid("counted_qty", "Jumlah hasil hitung wajib diisi.");
  if (Number.isNaN(counted) || counted < 0) throw invalid("counted_qty", "Jumlah hasil hitung harus berupa angka ≥ 0.");
  const current = stockMap(db).get(ing.id) ?? 0;
  const diff = round2(counted - current);
  if (diff !== 0) {
    addMovement(db, { ingredient: ing, type: "adjustment", qty: diff, unit_cost: costPerUnit(ing.pack_price, ing.pack_size), note: str(b.note) ?? `Stok opname: ${current} → ${counted} ${ing.unit}`, by: actor(user), at: wib(new Date()) });
  }
  ing.updated_at = wib(new Date());
  return serializeIngredient(ing, stockMap(db));
}

/* ------------------------------------------------------------------ belanja stok */

function cashEntry(
  db: MockAdminState,
  e: Omit<MockCashEntry, "id" | "category_label" | "method_label" | "created_at"> & { created_at?: string },
): MockCashEntry {
  const entry: MockCashEntry = {
    ...e,
    id: nextId(db),
    category_label: CATEGORY_LABEL[e.category],
    method_label: BOOK_METHOD_LABEL[e.method],
    created_at: e.created_at ?? wib(new Date()),
  };
  db.cashEntries.push(entry);
  return entry;
}

function purchaseCategory(items: { kind: IngredientKind }[]): CashCategory {
  return items.length > 0 && items.every((i) => i.kind === "kemasan") ? "kemasan" : "bahan_baku";
}

function insertPurchase(
  db: MockAdminState,
  p: { outlet_id: number; date: string; supplier: string | null; method: BookMethod; bank: string | null; note: string | null; items: { ingredient: MockIngredient; packs: number; pack_price: number }[]; by: Actor; at: string },
): MockStockPurchase {
  const id = nextId(db);
  const items: StockPurchaseItem[] = p.items.map(({ ingredient: ing, packs, pack_price }) => {
    const qty = round2(packs * ing.pack_size);
    ing.pack_price = pack_price; // harga terbaru
    ing.updated_at = p.at;
    addMovement(db, { ingredient: ing, type: "purchase", qty, unit_cost: costPerUnit(pack_price, ing.pack_size), reference: `Belanja #${id}`, note: p.supplier, by: p.by, at: p.at, stock_purchase_id: id });
    return { id: nextId(db), ingredient_id: ing.id, ingredient_name: ing.name, kind: ing.kind, unit: ing.unit, pack_label: ing.pack_label, packs, pack_price, pack_size: ing.pack_size, qty, subtotal: Math.round(packs * pack_price) };
  });
  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const purchase: MockStockPurchase = {
    id,
    outlet_id: p.outlet_id,
    date: p.date,
    supplier: p.supplier,
    method: p.method,
    method_label: BOOK_METHOD_LABEL[p.method],
    bank: p.method === "bank_transfer" ? p.bank : null,
    note: p.note,
    total,
    items,
    cash_entry_id: null,
    created_by: p.by,
    created_at: p.at,
  };
  if (total > 0) {
    const entry = cashEntry(db, {
      outlet_id: p.outlet_id,
      date: p.date,
      type: "expense",
      category: purchaseCategory(items),
      description: `Belanja: ${items.map((i) => `${i.ingredient_name} ×${i.packs}`).join(", ")}`,
      amount: total,
      method: p.method,
      bank: purchase.bank,
      counterparty: p.supplier,
      note: p.note,
      source: "stock_purchase",
      stock_purchase_id: id,
      created_by: p.by,
      created_at: p.at,
    });
    purchase.cash_entry_id = entry.id;
  }
  db.stockPurchases.push(purchase);
  return purchase;
}

const publicPurchase = (p: MockStockPurchase): StockPurchase => ({ ...p, items: p.items.map((i) => ({ ...i })) });

export function listStockPurchases(db: MockAdminState, user: AdminUser, url: URL): StockPurchase[] {
  const scope = listOutlet(user, url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  return db.stockPurchases
    .filter((p) => inScope(p.outlet_id, scope) && (!from || p.date >= from) && (!to || p.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .map(publicPurchase);
}

export function createStockPurchase(db: MockAdminState, user: AdminUser, b: Body, url: URL): StockPurchase {
  if (!isYmd(b.date)) throw invalid("date", "Tanggal belanja wajib diisi (YYYY-MM-DD).");
  if (!isBookMethod(b.method)) throw invalid("method", "Metode bayar harus Tunai, QRIS, atau Transfer.");
  const outletId = targetOutlet(db, user, b, url);
  const raw = Array.isArray(b.items) ? (b.items as Body[]) : [];
  if (!raw.length) throw invalid("items", "Tambahkan minimal satu bahan.");
  const items = raw.map((it, i) => {
    const ing = db.ingredients.find((x) => x.id === Number(it.ingredient_id) && !x.deleted_at && x.outlet_id === outletId);
    if (!ing) throw invalid(`items.${i}.ingredient_id`, `Bahan baris ke-${i + 1} tidak ditemukan.`);
    const packs = num(it.packs);
    if (packs === null || Number.isNaN(packs) || packs <= 0) throw invalid(`items.${i}.packs`, `Jumlah kemasan baris ke-${i + 1} harus lebih dari 0.`);
    const price = num(it.pack_price);
    if (price === null || Number.isNaN(price) || price < 0) throw invalid(`items.${i}.pack_price`, `Harga kemasan baris ke-${i + 1} harus berupa angka ≥ 0.`);
    return { ingredient: ing, packs, pack_price: Math.round(price) };
  });
  return publicPurchase(
    insertPurchase(db, { outlet_id: outletId, date: b.date, supplier: str(b.supplier), method: b.method, bank: str(b.bank), note: str(b.note), items, by: actor(user), at: wib(new Date()) }),
  );
}

export function deleteStockPurchase(db: MockAdminState, user: AdminUser, id: unknown) {
  const p = db.stockPurchases.find((x) => x.id === Number(id));
  if (!p || !canTouch(user, p.outlet_id)) throw notFound();
  db.movements = db.movements.filter((m) => m.stock_purchase_id !== p.id);
  db.cashEntries = db.cashEntries.filter((e) => e.stock_purchase_id !== p.id);
  db.stockPurchases = db.stockPurchases.filter((x) => x.id !== p.id);
}

/* ------------------------------------------------------------------ resep & HPP */

function activeProducts(db: MockAdminState): AdminProduct[] {
  const catOrder = (p: AdminProduct) => db.categories.find((c) => c.id === p.category_id)?.sort_order ?? 999;
  return db.products.filter((p) => p.is_active && !p.deleted_at).sort((a, b) => catOrder(a) - catOrder(b) || a.name.localeCompare(b.name, "id"));
}

export function buildRecipe(db: MockAdminState, p: AdminProduct, ings: Map<number, CalcIngredient> = calcIngredients(db)): ProductRecipe {
  const stored = db.recipes[p.id];
  const size = sizeGroup(db, p);
  const slots: { option_name: string | null; price: number }[] = size
    ? [...size.options].sort((a, b) => a.sort_order - b.sort_order).map((o) => ({ option_name: o.name, price: p.base_price + o.price_delta }))
    : [{ option_name: null, price: p.base_price }];
  return {
    product_id: p.id,
    product_name: p.name,
    category: db.categories.find((c) => c.id === p.category_id)?.name ?? p.category?.name ?? "",
    image_url: p.image_url,
    is_sample: stored?.is_sample ?? false,
    note: stored?.note ?? null,
    variants: slots.map((s) => {
      const v = stored?.variants.find((x) => (x.option_name ?? null) === s.option_name);
      return computeVariant(s.option_name, s.price, v?.items ?? [], ings);
    }),
  };
}

export function listRecipes(db: MockAdminState): ProductRecipe[] {
  const ings = calcIngredients(db);
  return activeProducts(db).map((p) => buildRecipe(db, p, ings));
}

export function saveRecipe(db: MockAdminState, productId: unknown, b: Body): ProductRecipe {
  const p = db.products.find((x) => x.id === Number(productId) && !x.deleted_at);
  if (!p) throw notFound();
  if (!Array.isArray(b.variants)) throw invalid("variants", "Varian resep wajib diisi.");
  const sizes = sizeGroup(db, p)?.options.map((o) => o.name) ?? [];
  const seen = new Set<string>();
  const variants = (b.variants as Body[]).map((v, i) => {
    const name = str(v.option_name);
    if (sizes.length ? name === null || !sizes.includes(name) : name !== null) {
      throw invalid(`variants.${i}.option_name`, sizes.length ? `Ukuran "${name ?? "-"}" tidak ada pada menu ini.` : "Menu ini tidak memiliki pilihan ukuran.");
    }
    const key = name ?? "";
    if (seen.has(key)) throw invalid(`variants.${i}.option_name`, `Varian "${name ?? "Standar"}" dicantumkan lebih dari sekali.`);
    seen.add(key);
    const rawItems = Array.isArray(v.items) ? (v.items as Body[]) : [];
    const used = new Set<number>();
    const items = rawItems.map((it, j) => {
      const field = `variants.${i}.items.${j}`;
      const ing = db.ingredients.find((x) => x.id === Number(it.ingredient_id) && !x.deleted_at);
      if (!ing) throw invalid(`${field}.ingredient_id`, "Bahan tidak ditemukan.");
      if (used.has(ing.id)) throw invalid(`${field}.ingredient_id`, `${ing.name} dicantumkan lebih dari sekali.`);
      used.add(ing.id);
      const qty = num(it.qty);
      if (qty === null || Number.isNaN(qty) || qty <= 0) throw invalid(`${field}.qty`, `Takaran ${ing.name} harus lebih dari 0.`);
      return { ingredient_id: ing.id, qty };
    });
    return { option_name: name, items };
  });
  const prev = db.recipes[p.id];
  db.recipes[p.id] = {
    is_sample: has(b, "is_sample") ? bool(b.is_sample) : false,
    note: has(b, "note") ? str(b.note) : (prev?.note ?? null),
    variants,
  };
  return buildRecipe(db, p);
}

/* ------------------------------------------------------------------ pemotongan stok dari penjualan */

const DEDUCT_ON = new Set(["paid", "processing", "shipped", "completed"]);

/** Potong stok sekali saat pesanan pertama kali terbayar; balik sekali saat dibatalkan/refund. Idempoten. */
export function syncOrderStock(db: MockAdminState, order: MockOrder, user: AdminUser | null) {
  if (order.stock_status === "skipped") return;
  if (DEDUCT_ON.has(order.status) && !order.stock_status) {
    const usage = stockUsageForOrder(order.items ?? [], db.recipes, (pid) => sizeOptionNames(db, pid));
    const at = wib(new Date());
    for (const [ingredientId, qty] of usage) {
      const ing = db.ingredients.find((i) => i.id === ingredientId);
      if (!ing || qty <= 0) continue;
      addMovement(db, { ingredient: ing, type: "sale", qty: -qty, unit_cost: costPerUnit(ing.pack_price, ing.pack_size), reference: order.code, note: `Penjualan pesanan ${order.code}`, by: actor(user), at, order_id: order.id });
    }
    order.stock_status = "deducted";
  } else if (order.status === "cancelled" && order.stock_status === "deducted") {
    const at = wib(new Date());
    const sold = db.movements.filter((m) => m.order_id === order.id && m.type === "sale");
    const byIng = new Map<number, number>();
    for (const m of sold) byIng.set(m.ingredient_id, (byIng.get(m.ingredient_id) ?? 0) - m.qty);
    for (const [ingredientId, qty] of byIng) {
      const ing = db.ingredients.find((i) => i.id === ingredientId);
      if (!ing || qty <= 0) continue;
      addMovement(db, { ingredient: ing, type: "sale_reversal", qty, unit_cost: costPerUnit(ing.pack_price, ing.pack_size), reference: order.code, note: `Pesanan ${order.code} dibatalkan`, by: actor(user), at, order_id: order.id });
    }
    order.stock_status = "reversed";
  }
}

/* ------------------------------------------------------------------ buku kas */

const INCOME_SET = new Set<string>(INCOME_CATEGORIES.map((c) => c.value));
const EXPENSE_SET = new Set<string>(EXPENSE_CATEGORIES.map((c) => c.value));

const publicEntry = (e: MockCashEntry): CashEntry => ({ ...e });

export function filterCashEntries(db: MockAdminState, user: AdminUser, url: URL) {
  const scope = listOutlet(user, url);
  const sp = url.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const type = sp.get("type");
  const method = sp.get("method");
  const category = sp.get("category");
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const list = db.cashEntries
    .filter(
      (e) =>
        inScope(e.outlet_id, scope) &&
        (!from || e.date >= from) &&
        (!to || e.date <= to) &&
        (!type || e.type === type) &&
        (!method || e.method === method) &&
        (!category || e.category === category) &&
        (!q || [e.description, e.counterparty, e.note, e.bank].some((x) => x?.toLowerCase().includes(q))),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at) || b.id - a.id);
  const income = list.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expense = list.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  return { list: list.map(publicEntry), summary: { income, expense, balance: income - expense } };
}

function validateEntry(b: Body) {
  if (!isYmd(b.date)) throw invalid("date", "Tanggal wajib diisi (YYYY-MM-DD).");
  if (b.type !== "income" && b.type !== "expense") throw invalid("type", "Jenis harus pemasukan atau pengeluaran.");
  const cat = String(b.category ?? "");
  if (!(b.type === "income" ? INCOME_SET : EXPENSE_SET).has(cat)) throw invalid("category", "Kategori tidak sesuai dengan jenis catatan.");
  const description = str(b.description);
  if (!description) throw invalid("description", "Keterangan wajib diisi.");
  const amount = num(b.amount);
  if (amount === null || Number.isNaN(amount) || amount <= 0 || !Number.isInteger(amount)) throw invalid("amount", "Nominal harus berupa bilangan bulat lebih dari 0.");
  if (!isBookMethod(b.method)) throw invalid("method", "Metode harus Tunai, QRIS, atau Transfer.");
  return {
    date: b.date,
    type: b.type as CashType,
    category: cat as CashCategory,
    description,
    amount,
    method: b.method,
    bank: b.method === "bank_transfer" ? str(b.bank) : null,
    counterparty: str(b.counterparty),
    note: str(b.note),
  };
}

export function createCashEntry(db: MockAdminState, user: AdminUser, b: Body, url: URL): CashEntry {
  const v = validateEntry(b);
  return publicEntry(cashEntry(db, { ...v, outlet_id: targetOutlet(db, user, b, url), source: "manual", stock_purchase_id: null, created_by: actor(user) }));
}

function findEntry(db: MockAdminState, user: AdminUser, id: unknown) {
  const e = db.cashEntries.find((x) => x.id === Number(id));
  if (!e || !canTouch(user, e.outlet_id)) throw notFound();
  if (e.source === "stock_purchase") throw new Fail(422, "Ubah lewat menu Belanja stok.", { id: ["Ubah lewat menu Belanja stok."] });
  return e;
}

export function updateCashEntry(db: MockAdminState, user: AdminUser, id: unknown, b: Body): CashEntry {
  const e = findEntry(db, user, id);
  const v = validateEntry(b);
  Object.assign(e, v, { category_label: CATEGORY_LABEL[v.category], method_label: BOOK_METHOD_LABEL[v.method] });
  return publicEntry(e);
}

export function deleteCashEntry(db: MockAdminState, user: AdminUser, id: unknown) {
  const e = findEntry(db, user, id);
  db.cashEntries = db.cashEntries.filter((x) => x.id !== e.id);
}

/* ------------------------------------------------------------------ kasir (POS) */

export function createPosOrder(db: MockAdminState, user: AdminUser, b: Body, url: URL): { order: MockOrder; change: number } {
  const outletId = targetOutlet(db, user, b, url);
  const outlet = db.outlets.find((o) => o.id === outletId)!;
  const raw = Array.isArray(b.items) ? (b.items as Body[]) : [];
  if (!raw.length) throw invalid("items", "Keranjang kasir masih kosong.");
  const fulfillment = b.fulfillment ?? "dine_in";
  if (fulfillment !== "dine_in" && fulfillment !== "pickup") throw invalid("fulfillment", "Layanan harus makan di tempat atau ambil.");
  if (!isBookMethod(b.payment_method)) throw invalid("payment_method", "Metode bayar harus Tunai, QRIS, atau Transfer.");
  const method = b.payment_method;
  const bank = method === "bank_transfer" ? str(b.bank) : null;

  const items = raw.map((it, i) => {
    const field = `items.${i}`;
    const p = db.products.find((x) => x.id === Number(it.product_id) && !x.deleted_at);
    if (!p || !p.is_active) throw invalid(`${field}.product_id`, `Menu baris ke-${i + 1} tidak ditemukan atau tidak aktif.`);
    const qty = num(it.qty);
    if (qty === null || Number.isNaN(qty) || !Number.isInteger(qty) || qty < 1 || qty > 50) throw invalid(`${field}.qty`, `Jumlah ${p.name} harus 1–50.`);
    const ids = (Array.isArray(it.option_ids) ? (it.option_ids as unknown[]) : []).map(Number);
    const groups = productGroups(db, p);
    const chosen: { name: string; price_delta: number }[] = [];
    for (const id of ids) {
      if (!groups.some((g) => g.options.some((o) => o.id === id))) throw invalid(`${field}.option_ids`, `Opsi tidak valid untuk ${p.name}.`);
    }
    for (const g of groups) {
      const picked = g.options.filter((o) => ids.includes(o.id));
      if (g.type === "single" && picked.length > 1) throw invalid(`${field}.option_ids`, `Pilih satu ${g.name} untuk ${p.name}.`);
      if (g.is_required && picked.length === 0) throw invalid(`${field}.option_ids`, `${g.name} untuk ${p.name} wajib dipilih.`);
      for (const o of [...picked].sort((a, b) => a.sort_order - b.sort_order)) chosen.push({ name: o.name, price_delta: o.price_delta });
    }
    const unit = p.base_price + chosen.reduce((s, o) => s + o.price_delta, 0);
    return { id: nextId(db), product_id: p.id, product_name: p.name, unit_price: unit, qty, subtotal: unit * qty, note: str(it.note), options: chosen };
  });
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const total = subtotal;
  let change = 0;
  if (method === "cash") {
    const received = num(b.cash_received);
    if (Number.isNaN(received)) throw invalid("cash_received", "Uang diterima harus berupa angka.");
    if (received !== null && received < total) throw invalid("cash_received", "Uang diterima kurang dari total pesanan.");
    change = received === null ? 0 : received - total;
  }

  const now = new Date();
  // Pencatatan susulan: sold_at "YYYY-MM-DD HH:mm" (WIB), tidak boleh di masa depan.
  const soldAt = str(b.sold_at);
  let at = wib(now);
  if (soldAt) {
    const when = new Date(`${soldAt.replace(" ", "T")}:00+07:00`);
    if (Number.isNaN(when.getTime())) throw invalid("sold_at", "Tanggal transaksi tidak valid.");
    if (when.getTime() > now.getTime() + 5 * 60_000) throw invalid("sold_at", "Tanggal transaksi tidak boleh di masa depan.");
    at = wib(when);
  }
  const label = paymentLabel(method, bank);
  const payment: Payment = {
    id: nextId(db),
    method,
    method_label: label,
    provider: "pos",
    reference: null,
    amount: total,
    status: "paid",
    status_label: "Berhasil",
    qr_string: null,
    va_number: null,
    bank,
    deeplink: null,
    expires_at: null,
    paid_at: at,
    qris_image_url: null,
    merchant_name: null,
    nmid: null,
    requires_manual_confirmation: false,
    cash_received: method === "cash" ? (num(b.cash_received) ?? total) : null,
    change: method === "cash" ? change : null,
  };
  const phone = str(b.customer_phone)?.replace(/\D/g, "").replace(/^0/, "62") ?? "";
  const customer = phone ? db.customers.find((c) => c.phone_wa === phone) : undefined;
  const id = Math.max(0, ...db.orders.map((o) => o.id)) + 1;
  const order: MockOrder = {
    id,
    code: `KM${at.slice(2, 10).replace(/-/g, "")}${((id * 2654435761) >>> 0).toString(36).toUpperCase().slice(0, 5).padEnd(5, "X")}`,
    status: "completed",
    status_label: "",
    channel: "pos",
    fulfillment,
    fulfillment_label: "",
    outlet: { id: outlet.id, name: outlet.name, phone_wa: outlet.phone_wa, address: outlet.address },
    outlet_id: outlet.id,
    customer_id: customer?.id ?? null,
    customer_name: str(b.customer_name) ?? "Pembeli langsung",
    customer_phone: phone,
    address: null,
    lat: null,
    lng: null,
    scheduled_at: null,
    subtotal,
    discount: 0,
    points_redeemed: 0,
    points_discount: 0,
    delivery_fee: 0,
    service_fee: 0,
    total,
    note: str(b.note),
    cancelled_reason: null,
    items,
    payment,
    payments: [payment],
    status_logs: [
      { from_status: null, to_status: "pending", note: "Pesanan dibuat via Kasir", changed_by: user.name, at },
      { from_status: "pending", to_status: "paid", note: `Dibayar di kasir (${label})`, changed_by: user.name, at },
      { from_status: "paid", to_status: "completed", note: "Pesanan kasir selesai", changed_by: user.name, at },
    ],
    paid_at: at,
    completed_at: at,
    created_at: at,
    updated_at: at,
    handled_by: { id: user.id, name: user.name },
  };
  db.orders.unshift(order);
  for (const i of items) {
    const p = db.products.find((x) => x.id === i.product_id);
    if (p) p.sold_count += i.qty;
  }
  if (customer) customer.orders_count = (customer.orders_count ?? 0) + 1;
  syncOrderStock(db, order, user);
  return { order, change };
}

/* ------------------------------------------------------------------ ringkasan */

const methodRows = (): Record<BookMethod, MethodAmount & { count: number }> => ({
  cash: { method: "cash", label: BOOK_METHOD_LABEL.cash, amount: 0, count: 0 },
  qris: { method: "qris", label: BOOK_METHOD_LABEL.qris, amount: 0, count: 0 },
  bank_transfer: { method: "bank_transfer", label: BOOK_METHOD_LABEL.bank_transfer, amount: 0, count: 0 },
});

function enumerateDays(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T12:00:00Z`);
  const last = new Date(`${to}T12:00:00Z`);
  while (d <= last && out.length < 1000) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function financeSummary(db: MockAdminState, user: AdminUser, url: URL): FinanceSummary {
  const today = wibYmd(Date.now());
  const from = url.searchParams.get("from") || `${today.slice(0, 8)}01`;
  const to = url.searchParams.get("to") || today;
  if (!isYmd(from)) throw invalid("from", "Tanggal awal tidak valid.");
  if (!isYmd(to)) throw invalid("to", "Tanggal akhir tidak valid.");
  if (to < from) throw invalid("to", "Tanggal akhir harus sama atau setelah tanggal awal.");
  const scope = listOutlet(user, url);
  const ings = calcIngredients(db);

  // Penjualan (pesanan terbayar dalam periode, tidak dibatalkan)
  const orders = db.orders.filter((o) => inScope(o.outlet_id, scope) && o.status !== "cancelled" && o.paid_at && wibYmd(o.paid_at) >= from && wibYmd(o.paid_at) <= to);
  const salesByMethod = methodRows();
  const channels: Record<AdminOrder["channel"], { channel: string; label: string; amount: number; count: number }> = {
    web: { channel: "web", label: CHANNEL_LABEL.web, amount: 0, count: 0 },
    whatsapp: { channel: "whatsapp", label: CHANNEL_LABEL.whatsapp, amount: 0, count: 0 },
    pos: { channel: "pos", label: CHANNEL_LABEL.pos, amount: 0, count: 0 },
  };
  const days = enumerateDays(from, to);
  const daily = new Map(days.map((d) => [d, { date: d, sales: 0, other_income: 0, expense: 0 }]));
  type ProdRow = FinanceSummary["products"][number];
  const products = new Map<number, ProdRow>();
  const recipeCache = new Map<number, ProductRecipe>();
  const missing = new Set<string>();
  let salesTotal = 0;
  let itemsCount = 0;
  let hppTotal = 0;

  for (const o of orders) {
    salesTotal += o.total;
    const m = toBookMethod(o.payments?.at(-1)?.method ?? o.payment?.method);
    salesByMethod[m].amount += o.total;
    salesByMethod[m].count += 1;
    channels[o.channel].amount += o.total;
    channels[o.channel].count += 1;
    const day = daily.get(wibYmd(o.paid_at!));
    if (day) day.sales += o.total;
    for (const it of o.items ?? []) {
      itemsCount += it.qty;
      if (it.product_id == null) continue;
      const product = db.products.find((p) => p.id === it.product_id);
      let row = products.get(it.product_id);
      if (!row) {
        row = { product_id: it.product_id, name: product?.name ?? it.product_name, category: db.categories.find((c) => c.id === product?.category_id)?.name ?? "", qty: 0, revenue: 0, hpp: 0, profit: 0, variants: [] };
        products.set(it.product_id, row);
      }
      const sizes = product ? (sizeGroup(db, product)?.options.map((x) => x.name) ?? []) : [];
      const optionName = matchSizeOption((it.options ?? []).map((x) => x.name), sizes);
      row.qty += it.qty;
      row.revenue += it.subtotal;
      const vrow = row.variants.find((v) => v.option_name === optionName);
      if (vrow) {
        vrow.qty += it.qty;
        vrow.revenue += it.subtotal;
      } else row.variants.push({ option_name: optionName, qty: it.qty, revenue: it.subtotal });

      let recipe = recipeCache.get(it.product_id);
      if (!recipe && product) {
        recipe = buildRecipe(db, product, ings);
        recipeCache.set(it.product_id, recipe);
      }
      const variant = recipe ? findRecipeVariant(recipe.variants, optionName) : undefined;
      const hasRecipe = !!recipe && recipe.variants.some((v) => v.items.length > 0);
      if (!hasRecipe) missing.add(row.name);
      const hpp = variant && variant.items.length ? variant.hpp * it.qty : 0;
      row.hpp += hpp;
      hppTotal += hpp;
    }
  }
  for (const r of products.values()) {
    r.profit = r.revenue - r.hpp;
    r.variants.sort((a, b) => b.qty - a.qty);
  }

  // Buku kas
  const entries = db.cashEntries.filter((e) => inScope(e.outlet_id, scope) && e.date >= from && e.date <= to);
  const incomeByCat = new Map(INCOME_CATEGORIES.map((c) => [c.value as CashCategory, { category: c.value as CashCategory, label: c.label, amount: 0 }]));
  const expenseByCat = new Map(EXPENSE_CATEGORIES.map((c) => [c.value as CashCategory, { category: c.value as CashCategory, label: c.label, amount: 0 }]));
  const otherByMethod = methodRows();
  const expenseByMethod = methodRows();
  let otherTotal = 0;
  let expenseTotal = 0;
  for (const e of entries) {
    const day = daily.get(e.date);
    if (e.type === "income") {
      otherTotal += e.amount;
      incomeByCat.get(e.category)!.amount += e.amount;
      otherByMethod[e.method].amount += e.amount;
      otherByMethod[e.method].count += 1;
      if (day) day.other_income += e.amount;
    } else {
      expenseTotal += e.amount;
      expenseByCat.get(e.category)!.amount += e.amount;
      expenseByMethod[e.method].amount += e.amount;
      expenseByMethod[e.method].count += 1;
      if (day) day.expense += e.amount;
    }
  }
  const stockPurchasesTotal = (expenseByCat.get("bahan_baku")?.amount ?? 0) + (expenseByCat.get("kemasan")?.amount ?? 0);
  const operating = expenseTotal - stockPurchasesTotal;
  const grossProfit = salesTotal - hppTotal;
  const otherOperatingIncome = (incomeByCat.get("penjualan")?.amount ?? 0) + (incomeByCat.get("lainnya_masuk")?.amount ?? 0);
  const incomeTotal = salesTotal + otherTotal;

  return {
    period: { from, to },
    sales: {
      total: salesTotal,
      orders_count: orders.length,
      items_count: itemsCount,
      by_method: Object.values(salesByMethod),
      by_channel: Object.values(channels),
    },
    other_income: { total: otherTotal, by_category: [...incomeByCat.values()], by_method: Object.values(otherByMethod) },
    income_total: incomeTotal,
    income_by_method: BOOK_METHODS.map((m) => ({
      method: m,
      label: BOOK_METHOD_LABEL[m],
      amount: salesByMethod[m].amount + otherByMethod[m].amount,
      count: salesByMethod[m].count + otherByMethod[m].count,
    })),
    hpp_total: hppTotal,
    gross_profit: grossProfit,
    expenses: { total: expenseTotal, by_category: [...expenseByCat.values()], by_method: Object.values(expenseByMethod) },
    stock_purchases_total: stockPurchasesTotal,
    operating_expenses: operating,
    net_profit_estimate: grossProfit + otherOperatingIncome - operating,
    cash_flow: incomeTotal - expenseTotal,
    products: [...products.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue),
    daily: [...daily.values()],
    missing_recipes: [...missing].sort((a, b) => a.localeCompare(b, "id")),
  };
}

/* ------------------------------------------------------------------ seed (buku catatan pemilik) */

const SEED_AT = "2026-09-20T08:00:00+07:00";
const NOTE_UNDATED = "Tanggal & metode belum tercatat di buku";
const NOTE_KASIR = "Dari Kasir Kamee (Excel)";

/** Penjualan dari ekspor Kasir Kamee 20/9–2/10/2026 (menggantikan catatan pemasukan buku tulis). Sama dengan BookkeepingSeeder. */
const KASIR_SALES: [date: string, time: string, who: string, items: string, amount: number, method: BookMethod, bank: string | null, note: string][] = [
  ["2026-09-20", "13:24", "Tante Ike", "Caramel Latte Kame x1; Spanish Latte Kame x1; Aren Kame x11", 221000, "bank_transfer", "BJB", "Take Away; Catatan: 8000 gojek; cocok dgn buku tulis (Mike)"],
  ["2026-09-20", "13:26", "Tante Unnun", "Aren Kame x2; Americano x2; Butterscotch Sea Salt Latte x1; Caramel Latte Kame x1", 104000, "cash", null, "Dine In; cocok dgn buku tulis (Unun)"],
  ["2026-09-21", "11:57", "Guru Sukma", "Aren Kame x2; Kame Orangecano x1; Iced Matche Latte x1", 73000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-09-21", "13:20", "Bu Tini", "Aren Kame x6; Iced Strawberry Choco x1", 125000, "cash", null, "Online; Ket: SD Neglasari 1; metode bayar belum tercatat"],
  ["2026-09-21", "13:21", "Mimih Nur", "Aden Kame 1ltr x1; Kame Manucano x1", 91000, "bank_transfer", "BCA", "Dine In; Ket: SD Sukma; cocok dgn buku tulis (Nur)"],
  ["2026-09-22", "13:48", "Siska, Delia, Amira", "Aren Kame x3", 51000, "bank_transfer", "BCA", "Take Away; cocok dgn buku tulis (Abi)"],
  ["2026-09-22", "13:53", "Guru taman", "Pandan Latte Kame x1; Butterscotch Sea Salt Latte x1; Aren Kame x1", 57000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-09-22", "14:02", "Pesanan By Abi", "Dark Chocolate 1L x1; Spanis Latte Kame 1L x1", 175000, "bank_transfer", "BCA", "Take Away; cocok dgn buku tulis (Rumi)"],
  ["2026-09-22", "14:03", "Pesanan By Abi", "Butterscotch Sea Salt Latte x1", 23000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-09-22", "14:04", "Pesanan By Umi", "Aren Kame 1L x1", 75000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-09-23", "14:44", "Pesanan Abi", "Butterscotch Sea Salt Latte x2; Aren Kame x1", 63000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-09-24", "14:45", "Pesanan by Umi", "Aren Kame x4; Pandan Latte Kame x1; Butterscotch Sea Salt Latte x1", 108000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-09-24", "14:47", "Aa Robi", "Aren Kame 1L x1", 75000, "cash", null, "Online; metode bayar belum tercatat"],
  ["2026-09-24", "14:48", "Kak Wiwi Pramuka", "Kame Manucano x1; Strawberry Matcha Latte x1", 41000, "cash", null, "Online; metode bayar belum tercatat"],
  ["2026-09-24", "18:30", "Mamah Lia", "Aren Kame x2", 34000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-09-24", "22:56", "Pesanan By Umi", "Aren Kame x4; Pandan Latte Kame x1; Butterscotch Sea Salt Latte x1", 108000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-09-25", "18:19", "Guru delta", "Aren Kame 1L x1; Caramel Latte Kame x1; Aren Kame x2; Butterscotch Sea Salt Latte x1; Kame Manucano x1; Pandan Latte Kame x1", 182000, "cash", null, "Online; Catatan: +gojek 17k; metode bayar belum tercatat"],
  ["2026-09-25", "18:20", "Bang Opick", "Americano 1L x1; Pandan Latte Kame x1; Spanish Latte Kame x1", 94000, "cash", null, "Online; metode bayar belum tercatat"],
  ["2026-09-25", "18:21", "Sa’id", "Aren Kame x2; Kame Manucano x1", 50000, "cash", null, "Dine In; metode bayar belum tercatat"],
  ["2026-09-25", "18:21", "Pesanan by Umi", "Iced Matche Latte x1; Aren Kame x1", 40000, "cash", null, "Online; metode bayar belum tercatat"],
  ["2026-09-26", "21:45", "guru sd taman", "Aren Kame x3; Butterscotch Sea Salt Latte x1; Dari Chocolate x1; Pandan Latte Kame x1", 116000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-09-26", "21:47", "Arisan Teh Indah dan Uwa Ita", "Aren Kame x2", 34000, "cash", null, "Dine In; metode bayar belum tercatat"],
  ["2026-09-26", "21:47", "A Ucu", "Aren Kame x1; Butterscotch Sea Salt Latte x1", 40000, "cash", null, "Dine In; metode bayar belum tercatat"],
  ["2026-09-26", "21:48", "Umi", "Aren Kame x2", 34000, "cash", null, "Dine In; Catatan: +ongkir 17k; metode bayar belum tercatat"],
  ["2026-09-28", "18:20", "Fauzan", "Aren Kame 1L x1", 75000, "cash", null, "Online; metode bayar belum tercatat"],
  ["2026-09-29", "11:05", "Teteh Lia", "Caramel Latte 1lt x1", 80000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-09-29", "21:51", "Pak Camat dan Pak Sidik Sukma", "Aren Kame 1L x2; Aren Kame x1", 167000, "cash", null, "Dine In; metode bayar belum tercatat"],
  ["2026-09-30", "10:51", "Pesanan Abi", "Butterscotch Sea Salt Latte x2; Aren Kame x1", 63000, "cash", null, "Dine In; metode bayar belum tercatat"],
  ["2026-10-01", "10:52", "Pesanan Umi", "Aren Kame x1; Iced Matche Latte x1", 40000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-10-01", "10:55", "Nitya", "Kame Orangecano x1; Iced Matche Latte x1; Butterscotch Sea Salt Latte x1; Aren Kame x1; Caramel Latte Kame x1", 96000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-10-01", "22:58", "Kak Shanty", "Aren Kame 1L x1; Cokelat Reguler 1Lt x1", 165000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-10-02", "11:02", "Pesanan Guru Delta", "Iced Strawberry Choco x1; Aren Kame x1; Butterscotch Sea Salt Latte x1; Aren Kame 1L x2; Kame Manucano x1", 241000, "cash", null, "Take Away; metode bayar belum tercatat"],
  ["2026-10-02", "11:02", "Bunda Adia", "Aren Kame 1L x1; Aren Kame x1", 97000, "cash", null, "Dine In; metode bayar belum tercatat"],
  ["2026-10-02", "11:03", "Pesanan Guru Taman", "Iced Matche Latte x1; Butterscotch Sea Salt Latte x5; Pandan Latte Kame x1", 155000, "cash", null, "Take Away; metode bayar belum tercatat"],
];

/** Pengeluaran dari ekspor Kasir Kamee 21/9–1/10/2026. */
const KASIR_EXPENSES: [date: string, description: string, amount: number][] = [
  ["2026-09-21", "Madu Manuka beli Tiptop", 63000],
  ["2026-09-21", "Strawberry jam beli Alfamart", 20900],
  ["2026-09-21", "Es Batu Kristal", 5000],
  ["2026-09-21", "Susu Kental Manis Sachet beli Enci", 10000],
  ["2026-09-21", "Parkir tiptop", 2000],
  ["2026-09-22", "Es Batu", 10000],
  ["2026-09-25", "Susu Diamond Rich Milk beli Tiptop 12kotak", 276300],
  ["2026-09-25", "Whipped cream", 27850],
  ["2026-09-25", "Biji Kopi Vottrro arabica mandailing 1kg", 228445],
  ["2026-09-25", "Whipping Cream Rich Gold 500gr", 39200],
  ["2026-09-25", "Es Batu", 5000],
  ["2026-10-01", "Gula Aren", 288825],
];

type SeedIng = [key: string, name: string, kind: IngredientKind, unit: IngredientUnit, packLabel: string, packSize: number, packPrice: number, note: string | null];
const SEED_INGREDIENTS: SeedIng[] = [
  ["susu", "Susu Rich Milk Diamond", "bahan", "ml", "1 kotak (1 liter)", 1000, 23500, null],
  ["kopi", "Kopi Klasik (blend)", "bahan", "gram", "1 kg", 1000, 288000, null],
  ["amer", "Kopi Americano", "bahan", "gram", "1/2 kg", 500, 220000, null],
  ["aren", "Sirup Gula Aren", "bahan", "gram", "1 liter (±1.000 gr – cek)", 1000, 60000, "Isi per kemasan perkiraan, mohon cek."],
  ["creamer", "Creamer", "bahan", "gram", "1 kg", 1000, 60000, null],
  ["bs", "Sirup Butterscotch", "bahan", "ml", "1 botol (750 ml – cek)", 750, 45000, "Isi per kemasan perkiraan, mohon cek."],
  ["matcha", "Matcha", "bahan", "gram", "100 gram (harga belum diisi)", 100, 0, "Harga belum diisi."],
  ["cup", "Cup 12 oz + tutup", "kemasan", "pcs", "1 pcs", 1, 1000, null],
  ["botol1L", "Botol 1 L + stiker", "kemasan", "pcs", "1 botol", 1, 3500, null],
  ["botol250", "Botol 250 ml", "kemasan", "pcs", "1 botol (harga belum diisi)", 1, 0, "Harga belum diisi."],
  ["plastik", "Plastik", "kemasan", "pcs", "1 pak isi 65", 65, 15000, null],
];

/** Belanja 20/9/2026: [key, jumlah kemasan, harga per kemasan]. */
const SEED_PURCHASE: [string, number, number][] = [
  ["susu", 22, 23500],
  ["kopi", 3, 288000],
  ["amer", 1, 220000],
  ["aren", 4, 60000],
  ["creamer", 4, 60000],
  ["bs", 1, 45000],
  ["cup", 110, 1000],
  ["botol1L", 20, 3500],
  ["plastik", 1, 15000],
];

type Lines = Record<string, number>;
type SeedRecipe = { names: string[]; sample: boolean; note: string | null; variants: Record<string, Lines> | Lines };

const NOTE_SAMPLE = "Resep contoh — takaran perkiraan berbasis resep Aren Kame, mohon disesuaikan. Kopi: espresso 40 ml ≈ 20 gr biji (asumsi ekstraksi 1:2).";
const LATTE_NO_AREN = {
  Cup: { kopi: 20, susu: 120, creamer: 20, cup: 1 },
  "Bottle 250 ml": { kopi: 25, susu: 181, creamer: 25, botol250: 1 },
  "Bottle 1 L": { kopi: 100, susu: 725, creamer: 100, botol1L: 1 },
};
const AMERICANO = { Cup: { amer: 20, cup: 1 }, "Bottle 250 ml": { amer: 25, botol250: 1 }, "Bottle 1 L": { amer: 100, botol1L: 1 } };
const AREN = {
  Cup: { aren: 30, creamer: 20, susu: 120, kopi: 20, cup: 1 },
  "Bottle 250 ml": { aren: 38, creamer: 25, susu: 181, kopi: 25, botol250: 1 },
  "Bottle 1 L": { aren: 150, creamer: 100, susu: 725, kopi: 100, botol1L: 1 },
};
const CHOCO = { Cup: { susu: 150, creamer: 20, cup: 1 }, "Bottle 1 L": { susu: 725, creamer: 100, botol1L: 1 } };

const SEED_RECIPES: SeedRecipe[] = [
  {
    names: ["Aren Kame Reguler"],
    sample: false,
    note:
      "Aren, creamer, dan susu dishake/frother sampai tercampur rata, tuang lewat saringan, tambah es batu 100 gr (cup), lalu masukkan espresso. " +
      "Kopi: espresso 40 ml ≈ 20 gr biji (asumsi ekstraksi 1:2). Es batu tidak dihitung di HPP (dicatat sebagai pengeluaran). Bottle 250 ml = ¼ resep 1 L (perkiraan).",
    variants: {
      Cup: { aren: 30, creamer: 20, susu: 120, kopi: 20, cup: 1 },
      "Bottle 1 L": { aren: 150, creamer: 100, susu: 725, kopi: 100, botol1L: 1 },
      "Bottle 250 ml": { aren: 38, creamer: 25, susu: 181, kopi: 25, botol250: 1 },
    },
  },
  { names: ["Americano", "Kame Orangecano", "Kame Manucano", "Americano Specialty Blend"], sample: true, note: NOTE_SAMPLE, variants: AMERICANO },
  { names: ["Caramel Latte Kame", "Pandan Latte Kame", "Spanish Latte Kame"], sample: true, note: NOTE_SAMPLE, variants: LATTE_NO_AREN },
  { names: ["Butterscotch Sea Salt Latte"], sample: true, note: NOTE_SAMPLE, variants: { kopi: 20, susu: 120, bs: 20, creamer: 20, cup: 1 } },
  { names: ["Mont Blanc"], sample: true, note: NOTE_SAMPLE, variants: { kopi: 20, susu: 120, creamer: 20, cup: 1 } },
  { names: ["Local Beans"], sample: true, note: NOTE_SAMPLE, variants: { kopi: 15, cup: 1 } },
  { names: ["Cold Brew"], sample: true, note: NOTE_SAMPLE, variants: { kopi: 20, cup: 1 } },
  { names: ["Iced Matcha Latte", "Iced Strawberry Matcha Latte", "Iced Matcha Sea Salt Cloud", "Iced Matcha Oatmilk", "Iced Caramel Matcha Latte"], sample: true, note: NOTE_SAMPLE, variants: { matcha: 5, susu: 150, cup: 1 } },
  { names: ["Reguler Chocolate", "Premium Dark Chocolate"], sample: true, note: NOTE_SAMPLE, variants: CHOCO },
  { names: ["Aren Kame Premium"], sample: true, note: NOTE_SAMPLE, variants: AREN },
  { names: ["Aren Sea Salt Kame"], sample: true, note: NOTE_SAMPLE, variants: { Cup: AREN.Cup, "Bottle 250 ml": AREN["Bottle 250 ml"] } },
  { names: ["Butterscotch Latte Kame"], sample: true, note: NOTE_SAMPLE, variants: {
    Cup: { ...LATTE_NO_AREN.Cup, bs: 20 }, "Bottle 250 ml": { ...LATTE_NO_AREN["Bottle 250 ml"], bs: 25 }, "Bottle 1 L": { ...LATTE_NO_AREN["Bottle 1 L"], bs: 100 } } },
  { names: ["Iced Aren Matcha Latte"], sample: true, note: NOTE_SAMPLE, variants: { matcha: 5, susu: 150, aren: 20, cup: 1 } },
  { names: ["Iced Espresso Matcha Latte"], sample: true, note: NOTE_SAMPLE, variants: { matcha: 5, susu: 150, kopi: 20, cup: 1 } },
  { names: ["Iced Chocolate Sea Salt Cloud", "Iced Strawberry Choco", "Iced Strawberry Choco Sea Salt Cloud"], sample: true, note: NOTE_SAMPLE, variants: { susu: 150, creamer: 20, cup: 1 } },
];

/** State keuangan awal. Butuh db.products/outlets/optionGroups yang sudah di-seed; memakai db.seq untuk id baru. */
export function seedFinance(db: Pick<MockAdminState, "products" | "outlets">): FinanceState {
  const outletId = db.outlets[0]!.id;
  const state: FinanceState = { ingredients: [], movements: [], stockPurchases: [], recipes: {}, cashEntries: [] };
  // Seed memakai id kecil berurutan (state sementara berbagi array yang sama); data baru memakai db.seq (≥ 100.000).
  const fake = { ...state, seq: 0 } as unknown as MockAdminState;
  const id = () => ++fake.seq;

  const byKey = new Map<string, MockIngredient>();
  for (const [key, name, kind, unit, pack_label, pack_size, pack_price, note] of SEED_INGREDIENTS) {
    const ing: MockIngredient = { id: id(), outlet_id: outletId, name, kind, unit, pack_label, pack_size, pack_price, min_stock: null, note, is_active: true, created_at: SEED_AT, updated_at: SEED_AT, deleted_at: null };
    state.ingredients.push(ing);
    byKey.set(key, ing);
  }

  insertPurchase(fake, {
    outlet_id: outletId,
    date: "2026-09-20",
    supplier: "Belanja 10 hari pertama",
    method: "cash",
    bank: null,
    note: "Dari buku catatan; metode bayar belum tercatat",
    items: SEED_PURCHASE.map(([key, packs, price]) => ({ ingredient: byKey.get(key)!, packs, pack_price: price })),
    by: null,
    at: SEED_AT,
  });

  const entry = (e: { date: string; type: CashType; category: CashCategory; description: string; amount: number; method: BookMethod; bank?: string | null; counterparty?: string | null; note?: string | null }) =>
    cashEntry(fake, { outlet_id: outletId, bank: null, counterparty: null, note: null, ...e, source: "manual", stock_purchase_id: null, created_by: null, created_at: `${e.date}T09:00:00+07:00` });

  entry({ date: "2026-09-20", type: "expense", category: "bahan_baku", description: "Es batu", amount: 25000, method: "cash", note: "Es batu tidak dihitung per gram di HPP — dicatat sebagai pengeluaran." });
  const others: [string, CashCategory, number, string | null, string | null][] = [
    ["Belanja (Az)", "bahan_baku", 304150, "Az", null],
    ["Ongkir", "ongkir", 22000, null, null],
    ["Kekurangan bayar (Adi)", "lainnya", 6000, "Adi", "Tertulis 'Adi kurang (6.000)'"],
    ["Ongkir Sukma", "ongkir", 22000, "Sukma", "(Umi)"],
    ["Ifa & Ikbal", "lainnya", 34000, "Ifa & Ikbal", "(Umi) — mohon cek keterangan"],
  ];
  for (const [description, category, amount, counterparty, extra] of others) {
    entry({ date: "2026-09-20", type: "expense", category, description, amount, method: "cash", counterparty, note: extra ? `${NOTE_UNDATED}. ${extra}` : NOTE_UNDATED });
  }
  for (const [date, description, amount] of KASIR_EXPENSES) {
    entry({ date, type: "expense", category: "bahan_baku", description, amount, method: "cash", note: `${NOTE_KASIR}; metode bayar belum tercatat` });
  }
  for (const [date, time, who, items, amount, method, bank, note] of KASIR_SALES) {
    entry({ date, type: "income", category: "penjualan", description: `Penjualan ${time} — ${who}: ${items}`.slice(0, 255), amount, method, bank, counterparty: who, note: `${NOTE_KASIR}. ${note}` });
  }

  for (const r of SEED_RECIPES) {
    const sized = Object.values(r.variants).every((v) => typeof v === "object");
    const variants = sized
      ? Object.entries(r.variants as Record<string, Lines>).map(([option_name, lines]) => ({ option_name: option_name as string | null, lines }))
      : [{ option_name: null, lines: r.variants as Lines }];
    for (const name of r.names) {
      const p = db.products.find((x) => x.name === name);
      if (!p) continue;
      state.recipes[p.id] = {
        is_sample: r.sample,
        note: r.note,
        variants: variants.map((v) => ({ option_name: v.option_name, items: Object.entries(v.lines).map(([key, qty]) => ({ ingredient_id: byKey.get(key)!.id, qty })) })),
      };
    }
  }
  return state;
}
