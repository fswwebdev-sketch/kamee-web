"use client";

import { usePathname } from "next/navigation";
import { useCartSummary } from "@/features/cart/hooks";
import { env } from "@/lib/env";
import { waLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.97 1-3.62-.24-.37a9.8 9.8 0 0 1 15.2-12.14 9.73 9.73 0 0 1 2.87 6.93c0 5.41-4.4 9.81-9.74 9.81Zm8.35-18.15A11.8 11.8 0 0 0 12.05.2C5.54.2.25 5.5.24 12.01c0 2.08.54 4.12 1.58 5.9L.14 24l6.25-1.64a11.8 11.8 0 0 0 5.65 1.44h.01c6.5 0 11.8-5.3 11.8-11.81a11.73 11.73 0 0 0-3.45-8.34Z" />
    </svg>
  );
}

/** Tombol WhatsApp mengambang. Disembunyikan di mobile saat bar keranjang tampil. */
export function WhatsAppFloat() {
  const pathname = usePathname();
  const { count } = useCartSummary();
  if (/^\/(checkout|masuk)|\/bayar$/.test(pathname)) return null;
  return (
    <a
      href={waLink("Halo Kamee Coffee, saya mau tanya menu dan pesanan 😊", env.whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat WhatsApp Kamee Coffee"
      className={cn(
        "fixed right-4 z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-white shadow-lift transition hover:scale-105 md:bottom-6 md:right-6",
        count > 0 ? "hidden md:grid" : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]",
      )}
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
