import type { PaymentMethod } from "@/types/api";

/**
 * Pembayaran Kamee Coffee: QRIS statis GoPay Merchant (dikonfirmasi manual oleh admin) + tunai di kasir.
 * Metode lain (e-wallet, VA) tetap didukung kode & API — aktifkan via NEXT_PUBLIC_PAYMENT_METHODS
 * bila nanti memakai payment gateway (Midtrans).
 */
export const QRIS_IMAGE_PATH = "/payments/qris-kameecoffee.jpg";
export const QRIS_MERCHANT = "KAMEECOFFEE";
export const QRIS_NMID = "ID1026594722880";

const ALL: PaymentMethod[] = ["qris", "ewallet", "bank_transfer", "cash"];

export const enabledPaymentMethods: PaymentMethod[] = (() => {
  const raw = (process.env.NEXT_PUBLIC_PAYMENT_METHODS ?? "qris,cash")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is PaymentMethod => (ALL as string[]).includes(s));
  return raw.length ? raw : ["qris", "cash"];
})();

export const isPaymentMethodEnabled = (m: PaymentMethod) => enabledPaymentMethods.includes(m);

/** Field QRIS statis (konfirmasi manual) — sama dengan PaymentResource kamee-api. */
export function manualQrisFields(method: PaymentMethod, state: "pending" | "done") {
  const manual = method === "qris";
  return {
    qris_image_url: manual ? QRIS_IMAGE_PATH : null,
    merchant_name: manual ? QRIS_MERCHANT : null,
    nmid: manual ? QRIS_NMID : null,
    requires_manual_confirmation: manual && state === "pending",
  };
}
