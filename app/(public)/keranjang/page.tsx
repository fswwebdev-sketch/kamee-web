"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { CartItem } from "@/components/cart/cart-item";
import { CartSummary } from "@/components/cart/cart-summary";
import { OutletPicker } from "@/components/cart/outlet-picker";
import { PointsRedeem } from "@/components/cart/points-redeem";
import { VoucherInput, type PromoPreview } from "@/components/cart/voucher-input";
import { WhatsAppOrderDialog } from "@/components/cart/whatsapp-order-dialog";
import { WhatsAppIcon } from "@/components/layout/whatsapp-float";
import { Button, buttonClasses } from "@/components/ui/button";
import { Breadcrumb, EmptyCupIllustration, EmptyState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartSummary } from "@/features/cart/hooks";
import { estimateTotals } from "@/features/cart/pricing";
import { useCartStore } from "@/features/cart/store";
import { api } from "@/lib/api";
import { useDebounce } from "@/lib/hooks";

export default function CartPage() {
  const { hydrated, lines, count, subtotal } = useCartSummary();
  const { promoCode, outletId, setPromoCode, clear } = useCartStore();
  const [promo, setPromo] = useState<PromoPreview | null>(null);
  const [pointsValue, setPointsValue] = useState(0);
  const [waOpen, setWaOpen] = useState(false);
  const debouncedSubtotal = useDebounce(subtotal, 600);

  // Voucher tersimpan divalidasi ulang saat subtotal/outlet berubah.
  useEffect(() => {
    if (!hydrated || !promoCode || !debouncedSubtotal) return setPromo(null);
    let cancelled = false;
    api<{ message: string; data: { discount: number } }>("/promotions/validate", { method: "POST", body: { code: promoCode, subtotal: debouncedSubtotal, outlet_id: outletId } })
      .then((r) => !cancelled && setPromo({ code: promoCode, discount: r.data.discount, message: r.message }))
      .catch(() => {
        if (cancelled) return;
        setPromo(null);
        setPromoCode(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, promoCode, debouncedSubtotal, outletId, setPromoCode]);

  const totals = estimateTotals({ subtotal, discount: promo?.discount ?? 0, pointsValue });

  if (!hydrated) {
    return (
      <div className="container-page pt-24 pb-16 md:pt-28">
        <Skeleton className="h-10 w-48" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      </div>
    );
  }

  return (
    <div className="container-page pt-24 pb-32 md:pt-28 md:pb-16">
      <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Keranjang" }]} />
      <div className="mt-3 flex items-end justify-between gap-4">
        <h1 className="text-h1">Keranjang</h1>
        {count > 0 && <button type="button" onClick={clear} className="rounded text-sm font-medium text-muted hover:text-danger">Kosongkan</button>}
      </div>

      {count === 0 ? (
        <EmptyState
          className="mt-8"
          illustration={<EmptyCupIllustration />}
          title="Keranjangmu masih kosong"
          description="Yuk pilih kopi atau camilan favoritmu dulu."
          action={<Link href="/menu" className={buttonClasses("primary", "lg")}>Jelajahi Menu</Link>}
        />
      ) : (
        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section aria-label="Item di keranjang" className="rounded-3xl border border-line bg-surface p-5 md:p-6">
            <p className="mb-5 text-sm text-muted">{count} item</p>
            <ul className="divide-y divide-line">
              {lines.map((line, i) => <CartItem key={line.lineId} line={line} index={i} />)}
            </ul>
            <Link href="/menu" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">+ Tambah menu lain</Link>
          </section>

          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 md:p-6">
              <OutletPicker />
              <VoucherInput subtotal={subtotal} preview={promo} onPreview={setPromo} />
              <PointsRedeem subtotal={subtotal - (promo?.discount ?? 0)} onPreview={setPointsValue} />
            </div>
            <CartSummary totals={totals} deliveryLabel="Dihitung saat checkout" estimate>
              <Link href="/checkout" className={buttonClasses("primary", "lg", "w-full")}>
                Lanjut ke Checkout <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
              <Button variant="whatsapp" size="lg" className="w-full" onClick={() => setWaOpen(true)}>
                <WhatsAppIcon className="size-5" /> Pesan via WhatsApp
              </Button>
            </CartSummary>
          </div>
        </div>
      )}
      <WhatsAppOrderDialog open={waOpen} onClose={() => setWaOpen(false)} />
    </div>
  );
}
