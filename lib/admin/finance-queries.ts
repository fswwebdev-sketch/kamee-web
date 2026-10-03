"use client";

/** Hook TanStack Query untuk fitur Keuangan admin (lihat lib/admin/finance-types.ts). */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { adminApi } from "./api";
import { adminKeys, errorMessage } from "./queries";
import type {
  CashEntry,
  CashEntryInput,
  CashEntryList,
  FinanceSummary,
  Ingredient,
  IngredientInput,
  PosInput,
  PosResult,
  ProductRecipe,
  RecipeInput,
  StockMovement,
  StockPurchase,
  StockPurchaseInput,
} from "./finance-types";
import type { Paginated } from "./types";

/** Semua data keuangan saling terkait (stok ↔ resep ↔ kas ↔ ringkasan) → invalidasi bersama. */
const FINANCE_KEYS = [["admin", "ingredients"], ["admin", "recipes"], ["admin", "cash-entries"], ["admin", "stock-purchases"], ["admin", "finance"]] as const;

function useInvalidateFinance() {
  const qc = useQueryClient();
  return (extra: readonly (readonly unknown[])[] = []) => {
    [...FINANCE_KEYS, ...extra].forEach((key) => qc.invalidateQueries({ queryKey: key as unknown[] }));
  };
}

/* ------------------------------------------------------------------ Bahan & stok */

export function useIngredients(params: { kind?: string; q?: string } = {}) {
  return useQuery<Ingredient[]>({
    queryKey: adminKeys.list("ingredients", params),
    queryFn: ({ signal }) => adminApi<{ data: Ingredient[] }>("ingredients", { query: params, signal }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useIngredientMovements(id: number | null, page = 1) {
  return useQuery({
    queryKey: adminKeys.list(`ingredients/${id}/movements`, { page }),
    queryFn: ({ signal }) => adminApi<Paginated<StockMovement>>(`ingredients/${id}/movements`, { query: { page }, signal }),
    enabled: id != null,
    placeholderData: keepPreviousData,
  });
}

export function useSaveIngredient() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number | null; body: Partial<IngredientInput> }) =>
      adminApi<{ data: Ingredient; message?: string }>(id ? `ingredients/${id}` : "ingredients", { method: id ? "PUT" : "POST", body }),
    onSuccess: (res) => {
      invalidate();
      toast.success(res.message ?? "Bahan tersimpan.");
    },
  });
}

export function useDeleteIngredient() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: number) => adminApi<{ message?: string }>(`ingredients/${id}`, { method: "DELETE" }),
    onSuccess: (res) => {
      invalidate();
      toast.success(res?.message ?? "Bahan dihapus.");
    },
    onError: (e) => toast.error("Gagal menghapus", { description: errorMessage(e) }),
  });
}

/** Stok opname: set stok ke hasil hitung fisik. */
export function useAdjustStock() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, counted_qty, note }: { id: number; counted_qty: number; note?: string | null }) =>
      adminApi<{ data: Ingredient; message?: string }>(`ingredients/${id}/adjust`, { method: "POST", body: { counted_qty, note: note || null } }),
    onSuccess: (res) => {
      invalidate();
      toast.success(res.message ?? "Stok diperbarui.");
    },
  });
}

export function useStockPurchases(params: { from?: string; to?: string; page?: number } = {}) {
  return useQuery({
    queryKey: adminKeys.list("stock-purchases", params),
    queryFn: ({ signal }) => adminApi<Paginated<StockPurchase>>("stock-purchases", { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateStockPurchase() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (body: StockPurchaseInput) => adminApi<{ data: StockPurchase; message?: string }>("stock-purchases", { method: "POST", body }),
    onSuccess: (res) => {
      invalidate();
      toast.success(res.message ?? "Belanja stok tersimpan.");
    },
  });
}

export function useDeleteStockPurchase() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: number) => adminApi<{ message?: string }>(`stock-purchases/${id}`, { method: "DELETE" }),
    onSuccess: (res) => {
      invalidate();
      toast.success(res?.message ?? "Belanja dibatalkan.");
    },
    onError: (e) => toast.error("Gagal membatalkan", { description: errorMessage(e) }),
  });
}

/* ------------------------------------------------------------------ Resep & HPP */

export function useRecipes() {
  return useQuery({
    queryKey: adminKeys.list("recipes"),
    queryFn: ({ signal }) => adminApi<{ data: ProductRecipe[] }>("recipes", { signal }).then((r) => r.data),
  });
}

export function useSaveRecipe() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ productId, body }: { productId: number; body: RecipeInput }) =>
      adminApi<{ data: ProductRecipe; message?: string }>(`recipes/${productId}`, { method: "PUT", body }),
    onSuccess: (res) => {
      invalidate();
      toast.success(res.message ?? "Resep tersimpan.");
    },
  });
}

/* ------------------------------------------------------------------ Buku kas */

export interface CashEntryParams {
  from?: string;
  to?: string;
  type?: string;
  method?: string;
  category?: string;
  q?: string;
  page?: number;
  per_page?: number;
}

export function useCashEntries(params: CashEntryParams) {
  return useQuery({
    queryKey: adminKeys.list("cash-entries", { ...params }),
    queryFn: ({ signal }) => adminApi<CashEntryList>("cash-entries", { query: { ...params }, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useSaveCashEntry() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number | null; body: CashEntryInput }) =>
      adminApi<{ data: CashEntry; message?: string }>(id ? `cash-entries/${id}` : "cash-entries", { method: id ? "PUT" : "POST", body }),
    onSuccess: (res) => {
      invalidate();
      toast.success(res.message ?? "Catatan kas tersimpan.");
    },
  });
}

export function useDeleteCashEntry() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: number) => adminApi<{ message?: string }>(`cash-entries/${id}`, { method: "DELETE" }),
    onSuccess: (res) => {
      invalidate();
      toast.success(res?.message ?? "Catatan dihapus.");
    },
    onError: (e) => toast.error("Gagal menghapus", { description: errorMessage(e) }),
  });
}

/* ------------------------------------------------------------------ Kasir */

export function useCreatePosOrder() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (body: PosInput) => adminApi<PosResult>("orders/pos", { method: "POST", body }),
    onSuccess: () => invalidate([["admin", "orders"], ["admin", "dashboard"], ["admin", "reports"]]),
  });
}

/* ------------------------------------------------------------------ Ringkasan */

export function useFinanceSummary(params: { from: string; to: string; outlet_id?: number | null }) {
  return useQuery<FinanceSummary>({
    queryKey: ["admin", "finance", "summary", params],
    queryFn: ({ signal }) => adminApi<{ data: FinanceSummary }>("finance/summary", { query: { ...params }, signal }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}
