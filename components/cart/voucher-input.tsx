"use client";

import { useState } from "react";
import { TicketPercent, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api";
import { useCartStore } from "@/features/cart/store";
import { useValidatePromo } from "@/lib/queries/orders";
import { formatRupiah } from "@/lib/format";

export interface PromoPreview {
  code: string;
  discount: number;
  message: string;
}

/** Input voucher: validasi ke POST /promotions/validate; diskon final dihitung saat checkout. */
export function VoucherInput({ subtotal, preview, onPreview }: { subtotal: number; preview: PromoPreview | null; onPreview: (p: PromoPreview | null) => void }) {
  const outletId = useCartStore((s) => s.outletId);
  const setPromoCode = useCartStore((s) => s.setPromoCode);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const validate = useValidatePromo();

  const apply = (value: string) => {
    const c = value.trim().toUpperCase();
    if (!c) return setError("Masukkan kode voucher.");
    setError(null);
    validate.mutate(
      { code: c, subtotal, outlet_id: outletId },
      {
        onSuccess: (res) => {
          setPromoCode(c);
          onPreview({ code: c, discount: res.data.discount, message: res.message });
          setCode("");
        },
        onError: (e) => setError(isApiError(e) ? e.field("code") ?? e.message : "Voucher tidak dapat diperiksa."),
      },
    );
  };

  if (preview) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/8 p-3" role="status">
        <TicketPercent className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold tracking-wide text-ink">{preview.code}</p>
          <p className="text-caption text-muted">{preview.discount > 0 ? `Hemat ${formatRupiah(preview.discount)}` : preview.message}</p>
        </div>
        <button type="button" onClick={() => { setPromoCode(null); onPreview(null); }} aria-label={`Lepas voucher ${preview.code}`} className="grid size-8 place-items-center rounded-full text-muted hover:bg-cream"><X className="size-4" /></button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); apply(code); }} className="flex flex-col gap-1.5" noValidate>
      <label htmlFor="voucher" className="text-sm font-medium text-ink">Kode voucher</label>
      <div className="flex gap-2">
        <input
          id="voucher"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="KAMEEHEMAT"
          autoComplete="off"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? "voucher-error" : undefined}
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3.5 font-heading tracking-wide text-ink uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 aria-[invalid=true]:border-danger"
        />
        <Button type="submit" variant="secondary" loading={validate.isPending}>Pakai</Button>
      </div>
      {error && <p id="voucher-error" role="alert" className="text-caption text-danger">{error}</p>}
    </form>
  );
}
