"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { isApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { adminApi, type Query } from "./api";
import type {
  AdminCustomerDetail,
  AdminOrder,
  AdminUser,
  DashboardSummary,
  Paginated,
  RevenuePoint,
  SalesReport,
  ReportGroup,
  TopProduct,
  Outlet,
} from "./types";
import { useAdminUi } from "./store";

export const adminKeys = {
  all: ["admin"] as const,
  me: ["admin", "me"] as const,
  list: (resource: string, params?: Query) => ["admin", resource, "list", params ?? {}] as const,
  item: (resource: string, id: number | string) => ["admin", resource, "item", String(id)] as const,
  resource: (resource: string) => ["admin", resource] as const,
};

/* ------------------------------------------------------------------ Sesi */

export function useAdminSession() {
  return useQuery({
    queryKey: adminKeys.me,
    queryFn: () => adminApi<{ data: AdminUser }>("auth/me").then((r) => r.data),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Outlet efektif untuk filter: Admin Outlet dikunci ke outletnya; Super Admin memilih (null = semua). */
export function useEffectiveOutlet(user: AdminUser | undefined): number | null {
  const selected = useAdminUi((s) => s.outletId);
  if (!user) return null;
  return user.role === "outlet_admin" ? user.outlet_id : selected;
}

/* ------------------------------------------------------------------ CRUD generik */

type ListResult<T> = Paginated<T> | { data: T[]; meta?: undefined };

export function useAdminList<T>(resource: string, params?: Query, options: { enabled?: boolean; refetchInterval?: number | false } = {}) {
  return useQuery<ListResult<T>, Error>({
    queryKey: adminKeys.list(resource, params),
    queryFn: ({ signal }) => adminApi<ListResult<T>>(resource, { query: params, signal }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    ...options,
  });
}

export function useAdminItem<T>(resource: string, id: number | string | null | undefined, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminKeys.item(resource, id ?? "none"),
    queryFn: ({ signal }) => adminApi<{ data: T }>(`${resource}/${id}`, { signal }).then((r) => r.data),
    enabled: id != null && (options.enabled ?? true),
  });
}

/** Pesan error seragam: pesan server (422/403) atau fallback. */
export function errorMessage(e: unknown, fallback = "Terjadi kesalahan. Coba lagi."): string {
  if (isApiError(e)) {
    const first = Object.values(e.errors)[0]?.[0];
    return e.status === 422 && first ? first : e.message;
  }
  return fallback;
}

interface SaveVars {
  id?: number | string | null;
  body: unknown;
  /** default: PATCH saat id ada, POST saat baru */
  method?: "POST" | "PUT" | "PATCH";
  path?: string;
}

export function useAdminSave<T>(resource: string, opts: { successMessage?: string | ((r: { data: T; message?: string }) => string); invalidate?: QueryKey[]; silent?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, method, path }: SaveVars) =>
      adminApi<{ data: T; message?: string }>(path ?? (id != null ? `${resource}/${id}` : resource), {
        method: method ?? (id != null ? "PATCH" : "POST"),
        body,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: adminKeys.resource(resource) });
      opts.invalidate?.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      if (!opts.silent) {
        const msg = typeof opts.successMessage === "function" ? opts.successMessage(res) : opts.successMessage ?? res.message ?? "Tersimpan.";
        toast.success(msg);
      }
    },
  });
}

export function useAdminDelete(resource: string, opts: { invalidate?: QueryKey[] } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => adminApi<{ message?: string }>(`${resource}/${id}`, { method: "DELETE" }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: adminKeys.resource(resource) });
      opts.invalidate?.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      toast.success(res?.message ?? "Data dihapus.");
    },
    onError: (e) => toast.error("Gagal menghapus", { description: errorMessage(e) }),
  });
}

/* ------------------------------------------------------------------ Referensi */

export function useOutletsRef(enabled = true) {
  return useQuery({
    queryKey: adminKeys.list("outlets", { ref: 1 }),
    queryFn: () => adminApi<{ data: Outlet[] }>("outlets").then((r) => r.data),
    staleTime: 10 * 60_000,
    enabled,
  });
}

/* ------------------------------------------------------------------ Dashboard & laporan */

export interface RangeParams {
  outlet_id: number | null;
  from: string;
  to: string;
}

export function useDashboardSummary(params: RangeParams) {
  return useQuery<DashboardSummary, Error>({
    queryKey: ["admin", "dashboard", "summary", params],
    queryFn: ({ signal }) => adminApi<{ data: DashboardSummary }>("dashboard/summary", { query: { ...params }, signal }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useRevenue(params: RangeParams & { interval: "day" | "month" }) {
  return useQuery<RevenuePoint[], Error>({
    queryKey: ["admin", "dashboard", "revenue", params],
    queryFn: ({ signal }) => adminApi<{ data: RevenuePoint[] }>("dashboard/revenue", { query: { ...params }, signal }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useTopProducts(params: RangeParams & { limit: number }) {
  return useQuery<TopProduct[], Error>({
    queryKey: ["admin", "dashboard", "top", params],
    queryFn: ({ signal }) => adminApi<{ data: TopProduct[] }>("dashboard/top-products", { query: { ...params }, signal }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useSalesReport(params: RangeParams & { group_by: ReportGroup }) {
  return useQuery<SalesReport, Error>({
    queryKey: ["admin", "reports", params],
    queryFn: ({ signal }) => adminApi<{ data: SalesReport }>("reports/sales", { query: { ...params }, signal }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

/* ------------------------------------------------------------------ Pesanan */

export function useOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: string; note?: string | null }) =>
      adminApi<{ data: AdminOrder; message: string }>(`orders/${id}/status`, { method: "PATCH", body: { status, note: note || null } }),
    onSuccess: (res) => {
      qc.setQueryData(adminKeys.item("orders", res.data.id), res.data);
      qc.invalidateQueries({ queryKey: adminKeys.resource("orders") });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast.success(res.message);
    },
  });
}

/**
 * Admin mengonfirmasi dana sudah masuk (pending → paid), sekaligus mencatat metode yang
 * sebenarnya dipakai pelanggan (QRIS / Transfer + bank / Tunai) untuk pembukuan.
 */
export function useConfirmPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note, method = "qris", bank }: { id: number; note?: string | null; method?: "qris" | "bank_transfer" | "cash"; bank?: string | null }) =>
      adminApi<{ data: AdminOrder; message: string }>(`orders/${id}/confirm-payment`, {
        method: "POST",
        body: { note: note || null, method, bank: method === "bank_transfer" ? bank?.trim() || null : null },
      }),
    onSuccess: (res) => {
      qc.setQueryData(adminKeys.item("orders", res.data.id), res.data);
      qc.invalidateQueries({ queryKey: adminKeys.resource("orders") });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      // Pembayaran masuk ke ringkasan keuangan & memotong stok bahan
      ["finance", "ingredients", "recipes"].forEach((k) => qc.invalidateQueries({ queryKey: ["admin", k] }));
      toast.success(res.message);
    },
  });
}

export function useRefundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminApi<{ data: AdminOrder; message: string }>(`orders/${id}/refund`, { method: "POST", body: { reason } }),
    onSuccess: (res) => {
      qc.setQueryData(adminKeys.item("orders", res.data.id), res.data);
      qc.invalidateQueries({ queryKey: adminKeys.resource("orders") });
      toast.success(res.message);
    },
  });
}

/* ------------------------------------------------------------------ Pelanggan */

export function useCustomerDetail(id: number | string) {
  return useQuery({
    queryKey: adminKeys.item("customers", id),
    queryFn: ({ signal }) => adminApi<AdminCustomerDetail>(`customers/${id}`, { signal }),
  });
}
