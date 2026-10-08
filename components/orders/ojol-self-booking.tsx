"use client";

import { Bike, Copy, MapPin } from "lucide-react";
import { useOutlets } from "@/lib/queries/content";
import { buttonClasses } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { Order } from "@/types/api";

/** Buka aplikasi lewat skema URL; bila aplikasi tidak terpasang, arahkan ke halaman layanannya. */
function openApp(scheme: string, fallback: string) {
  const started = Date.now();
  const timer = window.setTimeout(() => {
    if (document.visibilityState === "visible" && Date.now() - started < 2500) window.location.href = fallback;
  }, 1500);
  window.addEventListener("pagehide", () => window.clearTimeout(timer), { once: true });
  window.location.href = scheme;
}

/**
 * Pengiriman mode ojol: pelanggan memesan GoSend / GrabExpress sendiri dari outlet ke alamatnya.
 * Ongkir dibayar langsung ke driver; admin cukup menyerahkan pesanan saat driver datang.
 */
export function OjolSelfBooking({ order }: { order: Order }) {
  const { data: outlets = [] } = useOutlets();
  const outlet = outlets.find((o) => o.id === order.outlet?.id) ?? outlets[0];
  if (["completed", "cancelled"].includes(order.status)) return null;

  const pickup = outlet ? `${outlet.name}, ${outlet.address}` : "Kamee Coffee, Jl. Cempaka Raya Blok I6 No. 3, Perumahan Taman Cibodas, Tangerang";
  const driverNote = `Ambil pesanan ${order.code} a.n. ${order.customer_name ?? "pelanggan"} di kasir Kamee Coffee`;
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} disalin`);
    } catch {
      toast.info(text);
    }
  };
  const ready = order.status === "processing" || order.status === "paid";

  return (
    <section className="rounded-3xl border border-primary/30 bg-cream/40 p-5 md:p-6" aria-labelledby="kirim-ojol">
      <h2 id="kirim-ojol" className="flex items-center gap-2 font-heading text-lg font-semibold text-ink">
        <Bike className="size-5 text-primary" aria-hidden="true" /> Kirim via GoSend / GrabExpress
      </h2>
      <p className="mt-1 text-sm text-muted">
        {ready ? "Pesananmu sedang disiapkan — pesan driver sekarang ya." : "Pesan driver setelah pembayaran dikonfirmasi (pesanan siap ±10 menit)."} Ongkir dibayar langsung ke driver.
      </p>
      <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 text-sm text-ink">
        <li>Buka aplikasi Gojek (GoSend) atau Grab (GrabExpress).</li>
        <li>
          <b>Lokasi jemput:</b> {pickup}
        </li>
        <li><b>Lokasi antar:</b> alamatmu.</li>
        <li>
          <b>Catatan untuk driver:</b> “{driverNote}”
        </li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => openApp("gojek://", "https://www.gojek.com/id-id/gosend")} className={buttonClasses("primary", "md")}>
          Pesan GoSend
        </button>
        <button type="button" onClick={() => openApp("grab://", "https://www.grab.com/id/express/")} className={buttonClasses("primary", "md")}>
          Pesan GrabExpress
        </button>
        <button type="button" onClick={() => copy(pickup, "Alamat jemput")} className={buttonClasses("outline", "md")}>
          <Copy className="size-4" aria-hidden="true" /> Salin alamat jemput
        </button>
        <button type="button" onClick={() => copy(driverNote, "Catatan driver")} className={buttonClasses("outline", "md")}>
          <Copy className="size-4" aria-hidden="true" /> Salin catatan driver
        </button>
        {outlet && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${outlet.lat},${outlet.lng}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline", "md")}>
            <MapPin className="size-4" aria-hidden="true" /> Titik outlet
          </a>
        )}
      </div>
    </section>
  );
}
