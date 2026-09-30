/**
 * Logika harga keranjang (murni, tanpa React) — dipakai store, UI, dan tes.
 * Catatan: total final SELALU dihitung ulang oleh server (POST /orders/quote & /orders).
 */
import type { Option, OptionGroup, OrderPayload, Product } from "@/types/api";

export const MAX_QTY = 50;
export const MAX_LINES = 30;

export interface CartOption {
  id: number;
  name: string;
  group: string;
  priceDelta: number;
}

export interface CartLine {
  /** Identitas baris = produk + opsi (terurut) + catatan */
  lineId: string;
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  basePrice: number;
  unitPrice: number;
  options: CartOption[];
  qty: number;
  note: string;
}

export interface AddToCartInput {
  product: Pick<Product, "id" | "slug" | "name" | "image_url" | "base_price">;
  options?: CartOption[];
  qty?: number;
  note?: string;
}

export function normalizeNote(note?: string | null): string {
  return (note ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
}

export function lineKey(productId: number, optionIds: number[], note?: string | null): string {
  const opts = [...optionIds].sort((a, b) => a - b).join(".");
  return `${productId}:${opts}:${normalizeNote(note).toLowerCase()}`;
}

export function unitPrice(basePrice: number, options: Pick<CartOption, "priceDelta">[]): number {
  return Math.max(0, basePrice + options.reduce((sum, o) => sum + o.priceDelta, 0));
}

export function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(MAX_QTY, Math.max(0, Math.round(qty)));
}

export function lineTotal(line: Pick<CartLine, "unitPrice" | "qty">): number {
  return line.unitPrice * line.qty;
}

export function cartCount(lines: Pick<CartLine, "qty">[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

export function cartSubtotal(lines: Pick<CartLine, "unitPrice" | "qty">[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

export interface Totals {
  subtotal: number;
  discount: number;
  pointsValue: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
}

/** Estimasi total di klien; urutan sama dengan PricingService server. */
export function estimateTotals(input: Partial<Omit<Totals, "total">> & { subtotal: number }): Totals {
  const discount = Math.max(0, input.discount ?? 0);
  const pointsValue = Math.max(0, input.pointsValue ?? 0);
  const deliveryFee = Math.max(0, input.deliveryFee ?? 0);
  const serviceFee = Math.max(0, input.serviceFee ?? 0);
  const total = Math.max(0, input.subtotal + deliveryFee + serviceFee - discount - pointsValue);
  return { subtotal: input.subtotal, discount, pointsValue, deliveryFee, serviceFee, total };
}

export function toCartOptions(groups: OptionGroup[], selectedIds: number[]): CartOption[] {
  const selected = new Set(selectedIds);
  return groups.flatMap((g) =>
    g.options.filter((o) => selected.has(o.id)).map((o: Option) => ({ id: o.id, name: o.name, group: g.name, priceDelta: o.price_delta })),
  );
}

/** Pilihan awal: opsi pertama untuk grup single yang wajib. */
export function defaultSelection(groups: OptionGroup[]): Record<number, number[]> {
  return Object.fromEntries(
    groups.map((g) => [g.id, g.type === "single" && g.is_required && g.options[0] ? [g.options[0].id] : []]),
  );
}

/** Validasi pilihan opsi (cermin aturan server). Mengembalikan pesan error per grup. */
export function validateSelection(groups: OptionGroup[], selection: Record<number, number[]>): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const g of groups) {
    const chosen = selection[g.id] ?? [];
    if (g.is_required && chosen.length === 0) errors[g.id] = `Pilih ${g.name.toLowerCase()} terlebih dahulu.`;
    if (g.type === "single" && chosen.length > 1) errors[g.id] = `Pilih hanya satu ${g.name.toLowerCase()}.`;
  }
  return errors;
}

/** Konversi keranjang ke payload item API. */
export function toOrderItems(lines: CartLine[]): OrderPayload["items"] {
  return lines.map((l) => ({
    product_id: l.productId,
    qty: l.qty,
    option_ids: l.options.map((o) => o.id),
    note: l.note || null,
  }));
}

export function buildLine(input: AddToCartInput): CartLine {
  const options = [...(input.options ?? [])].sort((a, b) => a.id - b.id);
  const note = normalizeNote(input.note);
  return {
    lineId: lineKey(input.product.id, options.map((o) => o.id), note),
    productId: input.product.id,
    slug: input.product.slug,
    name: input.product.name,
    image: input.product.image_url,
    basePrice: input.product.base_price,
    unitPrice: unitPrice(input.product.base_price, options),
    options,
    qty: Math.max(1, clampQty(input.qty ?? 1)),
    note,
  };
}

/** Tambahkan baris; baris identik digabung (qty dijumlah, dibatasi MAX_QTY). */
export function mergeLine(lines: CartLine[], incoming: CartLine): CartLine[] {
  const existing = lines.find((l) => l.lineId === incoming.lineId);
  if (existing) {
    return lines.map((l) => (l.lineId === incoming.lineId ? { ...l, qty: Math.min(MAX_QTY, l.qty + incoming.qty), unitPrice: incoming.unitPrice } : l));
  }
  if (lines.length >= MAX_LINES) throw new Error(`Maksimal ${MAX_LINES} jenis item dalam satu pesanan.`);
  return [...lines, incoming];
}
