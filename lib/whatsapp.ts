import type { CartLine } from "@/features/cart/pricing";
import { formatRupiah } from "./format";
import { env } from "./env";

/** Tautan wa.me dengan pesan terformat. */
export function waLink(message: string, phone: string = env.whatsappNumber): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

/**
 * Ringkasan keranjang untuk WhatsApp. Dipakai sebagai cadangan bila API /orders/whatsapp
 * tidak dapat dihubungi (API normalnya mengembalikan whatsapp_url sendiri).
 */
export function cartMessage(lines: CartLine[], meta: { name?: string; outletName?: string; note?: string }) {
  const rows = lines.map((l, i) => {
    const opts = l.options.map((o) => o.name).join(", ");
    return `${i + 1}. ${l.name} x${l.qty}${opts ? ` (${opts})` : ""}${l.note ? `\n   Catatan: ${l.note}` : ""}`;
  });
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  return [
    `Halo ${meta.outletName ?? "Kamee Coffee"}, saya mau pesan:`,
    "",
    ...rows,
    "",
    `*Estimasi: ${formatRupiah(total)}*`,
    meta.name ? `Nama: ${meta.name}` : "",
    meta.note ? `Catatan: ${meta.note}` : "",
  ].filter(Boolean).join("\n");
}

/** Buka jendela WA secara aman dari popup blocker saat URL baru didapat setelah request async. */
export function openPendingWindow(): Window | null {
  if (typeof window === "undefined") return null;
  const w = window.open("about:blank", "_blank");
  if (w) w.opener = null;
  return w;
}

export function navigatePendingWindow(w: Window | null, url: string) {
  if (w && !w.closed) w.location.href = url;
  else window.location.href = url;
}
