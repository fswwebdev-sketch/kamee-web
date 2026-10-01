"use client";

import Image from "next/image";
import { ChevronDown, ShoppingBag } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { CartLine, Totals } from "@/features/cart/pricing";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Ringkasan pesanan yang bisa dilipat di atas form checkout (ponsel). Tertutup secara default
 * agar form langsung terlihat; total selalu tampil di kepala ringkasan dan di bar bayar sticky.
 */
export function MobileOrderSummary({
  lines,
  count,
  totals,
  deliveryLabel,
  extra,
  open,
  onOpenChange,
}: {
  lines: CartLine[];
  count: number;
  totals: Totals;
  deliveryLabel: string;
  extra?: ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <section aria-label="Ringkasan pesanan" className="overflow-hidden rounded-3xl border border-line bg-surface lg:hidden" id="ringkasan-pesanan">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-cream/50"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cream text-primary"><ShoppingBag className="size-5" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Ringkasan pesanan</span>
          <span className="block truncate text-caption text-muted">{count} item · {lines.map((l) => l.name).join(", ")}</span>
        </span>
        <span className="font-heading text-base font-bold text-primary">{formatRupiah(totals.total)}</span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
      </button>
      {/* grid-rows 0fr→1fr: animasi tinggi tanpa mengukur DOM */}
      <div id={id} className={cn("grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")} inert={!open}>
        <div className="min-h-0">
          <div className="border-t border-line px-4 pt-3 pb-4">
            <ul className="flex flex-col gap-3">
              {lines.map((l) => (
                <li key={l.lineId} className="flex gap-3">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-cream">{l.image && <Image src={l.image} alt="" fill sizes="48px" className="object-cover" />}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-medium text-ink">{l.qty}× {l.name}</span>
                    {l.options.length > 0 && <span className="line-clamp-1 text-caption text-muted">{l.options.map((o) => o.name).join(" · ")}</span>}
                  </span>
                  <span className="text-sm font-semibold text-ink">{formatRupiah(l.unitPrice * l.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-2 border-t border-dashed border-line pt-3 text-sm">
              <Row label="Subtotal" value={formatRupiah(totals.subtotal)} />
              {totals.discount > 0 && <Row label="Diskon voucher" value={`−${formatRupiah(totals.discount)}`} accent />}
              {totals.pointsValue > 0 && <Row label="Tukar poin" value={`−${formatRupiah(totals.pointsValue)}`} accent />}
              <Row label="Ongkir" value={deliveryLabel} />
              {totals.serviceFee > 0 && <Row label="Biaya layanan" value={formatRupiah(totals.serviceFee)} />}
              <div className="flex items-baseline justify-between pt-1">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="font-heading text-lg font-bold text-primary">{formatRupiah(totals.total)}</dd>
              </div>
            </dl>
            {extra && <div className="mt-3">{extra}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={accent ? "font-semibold text-success" : "font-medium text-ink"}>{value}</dd>
    </div>
  );
}

/** Bar bayar sticky di bawah layar (ponsel). Tersembunyi saat keyboard terbuka. */
export function MobilePayBar({ total, label, busy, onShowSummary, children }: { total: number; label: string; busy: boolean; onShowSummary: () => void; children: ReactNode }) {
  return (
    <div className="hide-on-keyboard fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgb(62_39_35/.25)] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <button type="button" onClick={onShowSummary} className="flex min-h-11 flex-col items-start justify-center text-left" aria-label={`Total ${label}. Lihat rincian`}>
          <span className="text-caption text-muted">Total</span>
          <span className="font-heading text-lg leading-tight font-bold text-ink" aria-live="polite">{formatRupiah(total)}</span>
        </button>
        <div className="flex-1">{children}</div>
      </div>
      {busy && <span className="sr-only" role="status">Memproses pesanan…</span>}
    </div>
  );
}
