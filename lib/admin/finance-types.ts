/**
 * Kontrak fitur Keuangan admin (bahan & stok, resep & HPP, buku kas, kasir, ringkasan) —
 * sama dengan API Resource kamee-api (/api/v1/admin). Uang = integer rupiah.
 */
import type { AdminOrder } from "./types";

export type BookMethod = "cash" | "qris" | "bank_transfer";

export const BOOK_METHOD_LABEL: Record<BookMethod, string> = { cash: "Tunai", qris: "QRIS", bank_transfer: "Transfer" };
export const BANK_SUGGESTIONS = ["BCA", "BJB"] as const;

export type IngredientKind = "bahan" | "kemasan";
export type IngredientUnit = "ml" | "gram" | "pcs";

export interface Ingredient {
  id: number;
  outlet_id?: number;
  name: string;
  kind: IngredientKind;
  unit: IngredientUnit;
  pack_label: string;
  pack_size: number;
  pack_price: number;
  cost_per_unit: number;
  stock_qty: number;
  min_stock: number | null;
  low_stock: boolean;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface IngredientInput {
  name: string;
  kind: IngredientKind;
  unit: IngredientUnit;
  pack_label: string;
  pack_size: number;
  pack_price: number;
  min_stock?: number | null;
  note?: string | null;
  is_active?: boolean;
  opening_stock?: number | null;
}

export type MovementType = "opening" | "purchase" | "sale" | "sale_reversal" | "adjustment";

export interface StockMovement {
  id: number;
  ingredient_id: number;
  type: MovementType;
  type_label: string;
  qty: number;
  unit_cost: number | null;
  reference: string | null;
  note: string | null;
  created_by: { id: number; name: string } | null;
  created_at: string;
}

export interface StockPurchaseItem {
  id: number;
  ingredient_id: number;
  ingredient_name: string;
  kind: IngredientKind;
  unit: IngredientUnit;
  pack_label: string;
  packs: number;
  pack_price: number;
  pack_size: number;
  qty: number;
  subtotal: number;
}

export interface StockPurchase {
  id: number;
  outlet_id?: number;
  date: string;
  supplier: string | null;
  method: BookMethod;
  method_label: string;
  bank: string | null;
  note: string | null;
  total: number;
  items: StockPurchaseItem[];
  cash_entry_id: number | null;
  created_by: { id: number; name: string } | null;
  created_at: string;
}

export interface StockPurchaseInput {
  date: string;
  supplier?: string | null;
  method: BookMethod;
  bank?: string | null;
  note?: string | null;
  items: { ingredient_id: number; packs: number; pack_price: number }[];
}

export interface RecipeItem {
  ingredient_id: number;
  ingredient_name: string;
  unit: IngredientUnit;
  qty: number;
  cost: number;
}

export interface RecipeVariant {
  option_name: string | null;
  price: number;
  items: RecipeItem[];
  hpp: number;
  margin: number;
  margin_pct: number;
  cups_possible: number | null;
  limiting_ingredient: string | null;
}

export interface ProductRecipe {
  product_id: number;
  product_name: string;
  category: string;
  image_url: string | null;
  is_sample: boolean;
  note?: string | null;
  variants: RecipeVariant[];
}

export interface RecipeInput {
  is_sample?: boolean;
  note?: string | null;
  variants: { option_name: string | null; items: { ingredient_id: number; qty: number }[] }[];
}

export type CashType = "income" | "expense";
export type IncomeCategory = "penjualan" | "modal" | "lainnya_masuk";
export type ExpenseCategory = "bahan_baku" | "kemasan" | "ongkir" | "operasional" | "gaji" | "sewa" | "lainnya";
export type CashCategory = IncomeCategory | ExpenseCategory;

export const INCOME_CATEGORIES: { value: IncomeCategory; label: string }[] = [
  { value: "penjualan", label: "Penjualan di luar sistem" },
  { value: "modal", label: "Modal/setoran" },
  { value: "lainnya_masuk", label: "Pemasukan lain" },
];
export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "bahan_baku", label: "Bahan baku" },
  { value: "kemasan", label: "Kemasan" },
  { value: "ongkir", label: "Ongkir/transport" },
  { value: "operasional", label: "Operasional" },
  { value: "gaji", label: "Gaji/upah" },
  { value: "sewa", label: "Sewa & listrik" },
  { value: "lainnya", label: "Lain-lain" },
];
export const CATEGORY_LABEL: Record<CashCategory, string> = Object.fromEntries(
  [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map((c) => [c.value, c.label]),
) as Record<CashCategory, string>;

export interface CashEntry {
  id: number;
  outlet_id?: number;
  date: string;
  type: CashType;
  category: CashCategory;
  category_label: string;
  description: string;
  amount: number;
  method: BookMethod;
  method_label: string;
  bank: string | null;
  counterparty: string | null;
  note: string | null;
  source: "manual" | "stock_purchase";
  stock_purchase_id: number | null;
  created_by: { id: number; name: string } | null;
  created_at: string;
}

export interface CashEntryInput {
  date: string;
  type: CashType;
  category: CashCategory;
  description: string;
  amount: number;
  method: BookMethod;
  bank?: string | null;
  counterparty?: string | null;
  note?: string | null;
}

export interface CashEntryList {
  data: CashEntry[];
  meta: { page: number; per_page: number; total: number; last_page: number };
  summary: { income: number; expense: number; balance: number };
}

export interface PosInput {
  items: { product_id: number; qty: number; option_ids: number[]; note?: string | null }[];
  customer_name?: string | null;
  customer_phone?: string | null;
  fulfillment: "dine_in" | "pickup";
  payment_method: BookMethod;
  bank?: string | null;
  cash_received?: number | null;
  note?: string | null;
}

export interface PosResult {
  data: AdminOrder;
  message: string;
  change: number;
}

export interface MethodAmount {
  method: BookMethod;
  label: string;
  amount: number;
  count?: number;
}

export interface FinanceSummary {
  period: { from: string; to: string };
  sales: {
    total: number;
    orders_count: number;
    items_count: number;
    by_method: MethodAmount[];
    by_channel: { channel: string; label: string; amount: number; count: number }[];
  };
  other_income: { total: number; by_category: { category: CashCategory; label: string; amount: number }[]; by_method: MethodAmount[] };
  income_total: number;
  income_by_method: MethodAmount[];
  hpp_total: number;
  gross_profit: number;
  expenses: { total: number; by_category: { category: CashCategory; label: string; amount: number }[]; by_method: MethodAmount[] };
  stock_purchases_total: number;
  operating_expenses: number;
  net_profit_estimate: number;
  cash_flow: number;
  products: {
    product_id: number;
    name: string;
    category: string;
    qty: number;
    revenue: number;
    hpp: number;
    profit: number;
    variants: { option_name: string | null; qty: number; revenue: number }[];
  }[];
  daily: { date: string; sales: number; other_income: number; expense: number }[];
  missing_recipes: string[];
}
