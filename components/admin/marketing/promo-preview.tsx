"use client";

import { CalendarDays, Copy, TicketPercent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRupiah } from "@/lib/format";
import type { PromotionType } from "@/types/api";

export const PROMO_TYPE_LABEL: Record<PromotionType, string> = {
  percent: "Diskon persen",
  fixed: "Potongan harga",
  bogo: "Beli 1 gratis 1",
  free_delivery: "Gratis ongkir",
};

export interface PromoPreviewData {
  code: string | null;
  name: string;
  type: PromotionType;
  value: number;
  min_spend: number;
  max_discount: number | null;
  per_customer_limit: number | null;
  quota: number | null;
  ends_at: string | null;
}

/** Nilai promo ringkas untuk tabel: "20%", "Rp10.000", atau "—" untuk tipe tanpa nilai. */
export function promoValueText(p: { type: PromotionType; value: number }): string {
  if (p.type === "percent") return `${p.value}%`;
  if (p.type === "fixed") return formatRupiah(p.value);
  return "—";
}

/** Sama dengan describe() di components/content/promo-card.tsx (situs publik). */
function describe(p: PromoPreviewData) {
  const parts: string[] = [];
  if (p.min_spend) parts.push(`Min. belanja ${formatRupiah(p.min_spend)}`);
  if (p.max_discount && p.type !== "fixed") parts.push(`maks. potongan ${formatRupiah(p.max_discount)}`);
  if (p.per_customer_limit) parts.push(`${p.per_customer_limit}× per pelanggan`);
  return parts.join(" · ");
}

/** Kalimat aturan untuk admin (tidak tampil ke pelanggan). */
export function ruleSummary(p: PromoPreviewData): string {
  const cap = p.max_discount ? `, maksimal ${formatRupiah(p.max_discount)}` : "";
  const base = {
    percent: `Diskon ${p.value || 0}% dari subtotal${cap}`,
    fixed: `Potongan ${formatRupiah(p.value || 0)} dari subtotal`,
    bogo: `Setiap 2 item yang sama di keranjang, 1 gratis${cap}`,
    free_delivery: `Ongkos kirim delivery ditanggung${cap}`,
  }[p.type];
  const quota = p.quota ? ` Kuota total ${p.quota}× pemakaian.` : " Tanpa batas kuota.";
  return `${base}.${quota}`;
}

/**
 * Pratinjau kartu voucher persis seperti PromoCard di halaman /promo publik
 * (versi statis: tombol tidak berfungsi).
 */
export function PromoPreview({ promo }: { promo: PromoPreviewData }) {
  const info = describe(promo);
  return (
    <article className="relative flex overflow-hidden rounded-2xl border border-line bg-surface shadow-soft" aria-label="Pratinjau kartu voucher">
      <div className="grid w-20 shrink-0 place-items-center bg-primary text-on-primary" aria-hidden="true">
        <TicketPercent className="size-8" />
      </div>
      <span className="absolute left-20 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{PROMO_TYPE_LABEL[promo.type]}</Badge>
        </div>
        <h3 className="break-words font-heading font-semibold text-ink">{promo.name || <span className="text-muted">Nama promo</span>}</h3>
        {info && <p className="text-caption text-muted">{info}</p>}
        {promo.ends_at && (
          <p className="flex items-center gap-1.5 text-caption text-muted">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            Berlaku s.d. {formatDate(promo.ends_at)}
          </p>
        )}
        {promo.code ? (
          <div className="mt-1 flex flex-wrap items-center gap-2" aria-hidden="true">
            <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-primary px-3 py-1.5 font-heading text-sm font-semibold tracking-wider text-primary">
              {promo.code} <Copy className="size-3.5" />
            </span>
            <span className="inline-flex h-9 items-center rounded-xl bg-primary px-3.5 text-sm font-semibold text-on-primary">Pakai</span>
          </div>
        ) : (
          <p className="text-caption font-semibold text-success">Otomatis diterapkan saat checkout</p>
        )}
      </div>
    </article>
  );
}
