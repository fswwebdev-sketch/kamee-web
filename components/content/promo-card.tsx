"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Copy, TicketPercent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useCartStore } from "@/features/cart/store";
import { formatDate, formatRupiah } from "@/lib/format";
import type { Promotion, Voucher } from "@/types/api";

function describe(p: Promotion) {
  const parts: string[] = [];
  if (p.min_spend) parts.push(`Min. belanja ${formatRupiah(p.min_spend)}`);
  if (p.max_discount && p.type !== "fixed") parts.push(`maks. potongan ${formatRupiah(p.max_discount)}`);
  if (p.per_customer_limit) parts.push(`${p.per_customer_limit}× per pelanggan`);
  return parts.join(" · ");
}

export function PromoCard({ promo }: { promo: Promotion | Voucher }) {
  const router = useRouter();
  const setPromoCode = useCartStore((s) => s.setPromoCode);
  const remaining = "remaining_uses" in promo ? promo.remaining_uses : undefined;

  const copy = async () => {
    if (!promo.code) return;
    await navigator.clipboard?.writeText(promo.code).catch(() => undefined);
    toast.success(`Kode ${promo.code} disalin`);
  };
  const use = () => {
    if (!promo.code) return;
    setPromoCode(promo.code);
    toast.success(`Voucher ${promo.code} dipasang`, { description: "Diskon dihitung di keranjang." });
    router.push("/keranjang");
  };

  return (
    <article className="relative flex overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      <div className="grid w-20 shrink-0 place-items-center bg-primary text-on-primary md:w-24" aria-hidden="true">
        <TicketPercent className="size-8" />
      </div>
      <span className="absolute left-20 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg md:left-24" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{promo.type_label}</Badge>
          {remaining != null && <Badge tone="success">Sisa {remaining}×</Badge>}
        </div>
        <h3 className="font-heading font-semibold text-ink">{promo.name}</h3>
        {describe(promo) && <p className="text-caption text-muted">{describe(promo)}</p>}
        {promo.ends_at && <p className="flex items-center gap-1.5 text-caption text-muted"><CalendarDays className="size-3.5" aria-hidden="true" />Berlaku s.d. {formatDate(promo.ends_at)}</p>}
        {promo.code ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-primary px-3.5 font-heading text-sm font-semibold tracking-wider text-primary hover:bg-cream">
              {promo.code} <Copy className="size-3.5" aria-hidden="true" /><span className="sr-only">salin kode</span>
            </button>
            <Button size="sm" onClick={use}>Pakai</Button>
          </div>
        ) : (
          <p className="text-caption font-semibold text-success">Otomatis diterapkan saat checkout</p>
        )}
      </div>
    </article>
  );
}
