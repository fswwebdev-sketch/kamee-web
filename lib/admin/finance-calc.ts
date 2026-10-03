/**
 * Perhitungan murni fitur Keuangan (HPP resep, sisa porsi, pencocokan varian, pemakaian stok).
 * Dipakai mock admin (mocks/admin/finance.ts) dan bisa dipakai UI; sama dengan aturan pembulatan kamee-api:
 * cost_per_unit 2 desimal, hpp integer, margin_pct 1 desimal.
 */
import type { IngredientUnit, RecipeItem, RecipeVariant } from "./finance-types";

/** Nama grup opsi yang menentukan varian resep. */
export const SIZE_GROUP_NAME = "Ukuran";

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const round1 = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10;

/** Harga per unit (ml/gram/pcs) = harga kemasan / isi kemasan, 2 desimal. 0 bila isi ≤ 0. */
export function costPerUnit(packPrice: number, packSize: number): number {
  if (!(packSize > 0)) return 0;
  return round2(packPrice / packSize);
}

/** Data bahan minimal yang dibutuhkan untuk menghitung varian resep. */
export interface CalcIngredient {
  id: number;
  name: string;
  unit: IngredientUnit;
  cost_per_unit: number;
  stock_qty: number;
}

export interface RecipeLine {
  ingredient_id: number;
  qty: number;
}

/**
 * Hitung satu varian resep: biaya per baris, HPP, margin, dan berapa porsi yang masih bisa dibuat
 * dari stok sekarang (beserta bahan pembatasnya). Baris dengan bahan yang tidak dikenal diabaikan.
 */
export function computeVariant(
  optionName: string | null,
  price: number,
  lines: RecipeLine[],
  ingredients: ReadonlyMap<number, CalcIngredient> | CalcIngredient[],
): RecipeVariant {
  const map = Array.isArray(ingredients) ? new Map(ingredients.map((i) => [i.id, i])) : ingredients;
  const items: RecipeItem[] = [];
  for (const line of lines) {
    const ing = map.get(line.ingredient_id);
    if (!ing) continue;
    items.push({
      ingredient_id: ing.id,
      ingredient_name: ing.name,
      unit: ing.unit,
      qty: line.qty,
      cost: round2(line.qty * ing.cost_per_unit),
    });
  }
  const hpp = Math.round(items.reduce((s, i) => s + i.cost, 0));
  const margin = price - hpp;
  const margin_pct = price > 0 ? round1((margin / price) * 100) : 0;

  let cups: number | null = null;
  let limiting: string | null = null;
  for (const item of items) {
    if (!(item.qty > 0)) continue;
    const stock = map.get(item.ingredient_id)!.stock_qty;
    const possible = stock <= 0 ? 0 : Math.floor(stock / item.qty + 1e-9);
    if (cups === null || possible < cups) {
      cups = possible;
      limiting = item.ingredient_name;
    }
  }
  return { option_name: optionName, price, items, hpp, margin, margin_pct, cups_possible: cups, limiting_ingredient: limiting };
}

/**
 * Nama opsi Ukuran yang dipilih pada item pesanan: opsi item pertama yang namanya ada di daftar opsi
 * grup Ukuran produk (tanpa beda huruf besar/kecil & spasi tepi). Null bila tidak ada.
 */
export function matchSizeOption(itemOptionNames: readonly string[], sizeOptionNames: readonly string[]): string | null {
  const norm = (s: string) => s.trim().toLowerCase();
  for (const name of itemOptionNames) {
    const found = sizeOptionNames.find((s) => norm(s) === norm(name));
    if (found) return found;
  }
  return null;
}

/** Varian resep untuk nama opsi tertentu; jatuh ke varian option_name null bila tidak ada yang cocok. */
export function findRecipeVariant<V extends { option_name: string | null }>(variants: readonly V[], optionName: string | null): V | undefined {
  if (optionName !== null) {
    const exact = variants.find((v) => v.option_name !== null && v.option_name.trim().toLowerCase() === optionName.trim().toLowerCase());
    if (exact) return exact;
  }
  return variants.find((v) => v.option_name === null);
}

export interface UsageOrderItem {
  product_id: number | null;
  qty: number;
  options?: { name: string }[];
}

export interface UsageRecipe {
  variants: { option_name: string | null; items: RecipeLine[] }[];
}

/**
 * Pemakaian bahan untuk sebuah pesanan: ingredient_id → jumlah unit (positif) yang terpakai.
 * `sizeOptions(productId)` mengembalikan nama opsi grup Ukuran produk (kosong bila tanpa ukuran).
 * Item tanpa resep/varian diabaikan.
 */
export function stockUsageForOrder(
  items: readonly UsageOrderItem[],
  recipes: Readonly<Record<number, UsageRecipe | undefined>>,
  sizeOptions: (productId: number) => readonly string[],
): Map<number, number> {
  const usage = new Map<number, number>();
  for (const item of items) {
    if (item.product_id == null) continue;
    const recipe = recipes[item.product_id];
    if (!recipe) continue;
    const size = matchSizeOption((item.options ?? []).map((o) => o.name), sizeOptions(item.product_id));
    const variant = findRecipeVariant(recipe.variants, size);
    if (!variant) continue;
    for (const line of variant.items) {
      if (!(line.qty > 0)) continue;
      usage.set(line.ingredient_id, round2((usage.get(line.ingredient_id) ?? 0) + item.qty * line.qty));
    }
  }
  return usage;
}
