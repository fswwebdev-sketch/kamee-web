"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore, useIsAuthenticated } from "@/features/auth/store";
import { api } from "@/lib/api";
import type {
  Customer,
  CustomerAddress,
  LoyaltyTransaction,
  Order,
  Paginated,
  PointsSummary,
  Product,
  RedeemPreview,
  ReorderResult,
  Voucher,
} from "@/types/api";
import { qk } from "./keys";

export function useRequestOtp() {
  return useMutation({
    mutationFn: (phone: string) => api<{ message: string; data: { phone: string; expires_in: number } }>("/auth/otp/request", { method: "POST", body: { phone }, auth: false }),
  });
}

export function useVerifyOtp() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (body: { phone: string; code: string; name?: string }) =>
      api<{ message: string; data: { token: string; is_new: boolean; customer: Customer } }>("/auth/otp/verify", { method: "POST", body, auth: false }),
    onSuccess: (res) => setSession(res.data.token, res.data.customer),
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }).catch(() => undefined),
    onSettled: () => {
      logout();
      qc.removeQueries({ queryKey: ["me"] });
    },
  });
}

export function useMe() {
  const authed = useIsAuthenticated();
  const setCustomer = useAuthStore((s) => s.setCustomer);
  return useQuery({
    queryKey: qk.me,
    queryFn: async () => {
      const res = await api<{ data: Customer }>("/me");
      setCustomer(res.data);
      return res.data;
    },
    enabled: authed,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const setCustomer = useAuthStore((s) => s.setCustomer);
  return useMutation({
    mutationFn: (body: Partial<Pick<Customer, "name" | "email" | "birth_date">>) => api<{ data: Customer; message: string }>("/me", { method: "PATCH", body }),
    onSuccess: (res) => {
      setCustomer(res.data);
      qc.setQueryData(qk.me, res.data);
    },
  });
}

export function useMyOrders(status?: string) {
  const authed = useIsAuthenticated();
  return useInfiniteQuery({
    queryKey: qk.myOrders(status),
    queryFn: ({ pageParam }) => api<Paginated<Order>>("/me/orders", { query: { page: pageParam, status } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.last_page ? last.meta.page + 1 : undefined),
    enabled: authed,
  });
}

export function useReorder() {
  return useMutation({
    mutationFn: (code: string) => api<{ message: string; data: ReorderResult }>(`/me/orders/${code}/reorder`, { method: "POST" }),
  });
}

export function usePoints() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.points,
    queryFn: () => api<Paginated<LoyaltyTransaction> & { summary: PointsSummary }>("/me/points"),
    enabled: authed,
  });
}

export function useRedeemPreview() {
  return useMutation({
    mutationFn: (body: { points: number; subtotal: number }) => api<{ data: RedeemPreview }>("/me/points/redeem-preview", { method: "POST", body }).then((r) => r.data),
  });
}

export function useVouchers() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.vouchers,
    queryFn: () => api<{ data: Voucher[] }>("/me/vouchers").then((r) => r.data),
    enabled: authed,
  });
}

export function useFavoriteProducts() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.favorites,
    queryFn: () => api<Paginated<Product>>("/me/favorites", { query: { per_page: 50 } }).then((r) => r.data),
    enabled: authed,
    staleTime: 60_000,
  });
}

export function useAddresses() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.addresses,
    queryFn: () => api<{ data: CustomerAddress[] }>("/me/addresses").then((r) => r.data),
    enabled: authed,
  });
}

export type AddressInput = Omit<CustomerAddress, "id">;

export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<AddressInput> & { id?: number }) =>
      api<{ data: CustomerAddress; message: string }>(id ? `/me/addresses/${id}` : "/me/addresses", { method: id ? "PATCH" : "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<{ message: string }>(`/me/addresses/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses }),
  });
}

export function useSubmitReview() {
  return useMutation({
    mutationFn: (body: { order_code: string; product_id: number; rating: number; comment?: string }) =>
      api<{ message: string }>("/me/reviews", { method: "POST", body }),
  });
}
