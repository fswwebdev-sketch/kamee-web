import type { ReactNode } from "react";
import { formatRupiah } from "@/lib/format";
import type { Totals } from "@/features/cart/pricing";

export function CartSummary({ totals, deliveryLabel, children, title = "Ringkasan pesanan", estimate = false }: { totals: Totals; deliveryLabel?: string; children?: ReactNode; title?: string; estimate?: boolean }) {
  return (
    <section aria-label={title} className="rounded-3xl border border-line bg-surface p-5 shadow-soft md:p-6">
      <h2 className="font-heading text-lg font-semibold text-ink">{title}</h2>
      <dl className="mt-4 flex flex-col gap-2.5 text-sm">
        <Row label="Subtotal" value={formatRupiah(totals.subtotal)} />
        {totals.discount > 0 && <Row label="Diskon voucher" value={`−${formatRupiah(totals.discount)}`} accent />}
        {totals.pointsValue > 0 && <Row label="Tukar poin" value={`−${formatRupiah(totals.pointsValue)}`} accent />}
        <Row label="Ongkir" value={deliveryLabel ?? (totals.deliveryFee ? formatRupiah(totals.deliveryFee) : "Gratis")} />
        {totals.serviceFee > 0 && <Row label="Biaya layanan" value={formatRupiah(totals.serviceFee)} />}
        <div className="my-1 border-t border-dashed border-line" />
        <div className="flex items-baseline justify-between">
          <dt className="font-semibold text-ink">{estimate ? "Estimasi total" : "Total"}</dt>
          <dd className="font-heading text-xl font-bold text-primary" aria-live="polite">{formatRupiah(totals.total)}</dd>
        </div>
      </dl>
      {children && <div className="mt-5 flex flex-col gap-3">{children}</div>}
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
