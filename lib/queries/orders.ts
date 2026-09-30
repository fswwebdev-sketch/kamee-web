"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { hashString } from "@/lib/utils";
import type {
  DeliveryQuote,
  Order,
  OrderPayload,
  Payment,
  PaymentMethod,
  PaymentStatusResponse,
  Promotion,
  QuoteResult,
} from "@/types/api";
import { qk } from "./keys";

/** Simulasi total resmi dari server (harga, ongkir, promo, poin). */
export function useQuote(payload: OrderPayload | null) {
  const fingerprint = payload ? hashString(JSON.stringify(payload)) : "none";
  return useQuery<QuoteResult, Error>({
    queryKey: qk.quote(fingerprint),
    queryFn: ({ signal }) => api<{ data: QuoteResult }>("/orders/quote", { method: "POST", body: payload, signal }).then((r) => r.data),
    enabled: Boolean(payload),
    placeholderData: (previous) => previous,
    retry: false,
    staleTime: 30_000,
  });
}

export function useDeliveryQuote(input: { outletId: number | null; lat?: number | null; lng?: number | null }) {
  const enabled = Boolean(input.outletId && input.lat != null && input.lng != null);
  return useQuery({
    queryKey: ["delivery-quote", input.outletId, input.lat?.toFixed(5), input.lng?.toFixed(5)],
    queryFn: () =>
      api<{ data: DeliveryQuote }>("/delivery/quote", {
        method: "POST",
        body: { outlet_id: input.outletId, lat: input.lat, lng: input.lng },
      }).then((r) => r.data),
    enabled,
    retry: false,
  });
}

export function useValidatePromo() {
  return useMutation({
    mutationFn: (body: { code: string; subtotal: number; outlet_id?: number | null; delivery_fee?: number }) =>
      api<{ message: string; data: { valid: boolean; discount: number; subtotal_after: number; promotion: Promotion } }>(
        "/promotions/validate",
        { method: "POST", body },
      ),
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: { payload: OrderPayload; idempotencyKey: string }) =>
      api<{ data: Order; message: string }>("/orders", { method: "POST", body: payload, idempotencyKey }),
  });
}

export function useWhatsAppOrder() {
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: { payload: OrderPayload; idempotencyKey: string }) =>
      api<{ data: Order; message: string; whatsapp_url: string }>("/orders/whatsapp", { method: "POST", body: payload, idempotencyKey }),
  });
}

export function usePayOrder() {
  return useMutation({
    mutationFn: ({ code, method, channel, idempotencyKey }: { code: string; method: PaymentMethod; channel?: string | null; idempotencyKey: string }) =>
      api<{ data: Payment; message: string; order_status: string }>(`/orders/${code}/pay`, {
        method: "POST",
        body: channel ? { method, channel } : { method },
        idempotencyKey,
      }),
  });
}

const POLL_MS = 3000;
const POLL_LIMIT_MS = 15 * 60_000;

/** Polling status bayar tiap 3 detik, berhenti saat final atau lewat 15 menit. */
export function usePaymentStatus(code: string, startedAt: number) {
  return useQuery({
    queryKey: qk.paymentStatus(code),
    queryFn: () => api<{ data: PaymentStatusResponse }>(`/orders/${code}/payment-status`).then((r) => r.data),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (Date.now() - startedAt > POLL_LIMIT_MS) return false;
      if (data && data.order_status !== "pending") return false;
      return POLL_MS;
    },
    refetchIntervalInBackground: false,
  });
}

export function useTrackOrder(code: string, phone: string) {
  return useQuery({
    queryKey: qk.track(code, phone),
    queryFn: () => api<{ data: Order }>(`/orders/${code}`, { query: { phone } }).then((r) => r.data),
    enabled: Boolean(code && phone.replace(/\D/g, "").length >= 4),
    retry: false,
    refetchInterval: (q) => (q.state.data && ["completed", "cancelled"].includes(q.state.data.status) ? false : 15_000),
  });
}
