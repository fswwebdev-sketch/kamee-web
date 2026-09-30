"use client";

import Link from "next/link";
import { useState } from "react";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { useCartStore } from "@/features/cart/store";
import { useIsAuthenticated } from "@/features/auth/store";
import { useMe, useRedeemPreview } from "@/lib/queries/account";
import { formatNumber, formatRupiah } from "@/lib/format";
import { useMounted } from "@/lib/hooks";

/** Tukar poin: 1 poin = Rp100, maksimal 50% belanja (dihitung server lewat redeem-preview). */
export function PointsRedeem({ subtotal, onPreview }: { subtotal: number; onPreview: (value: number) => void }) {
  const mounted = useMounted();
  const authed = useIsAuthenticated();
  const { data: me } = useMe();
  const redeem = useCartStore((s) => s.redeemPoints);
  const setRedeem = useCartStore((s) => s.setRedeemPoints);
  const preview = useRedeemPreview();
  const [message, setMessage] = useState<string | null>(null);

  if (!mounted) return null;

  if (!authed) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-cream/60 p-3 text-sm">
        <Coins className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="flex-1 text-ink"><Link href="/masuk?next=/keranjang" className="font-semibold text-primary underline-offset-2 hover:underline">Masuk</Link> untuk tukar poin dan kumpulkan poin dari pesanan ini.</p>
      </div>
    );
  }

  const balance = me?.points_balance ?? 0;
  const toggle = (on: boolean) => {
    if (!on) {
      setRedeem(0);
      onPreview(0);
      setMessage(null);
      return;
    }
    preview.mutate(
      { points: balance, subtotal },
      {
        onSuccess: (p) => {
          setRedeem(p.applicable_points);
          onPreview(p.discount);
          setMessage(p.applicable_points > 0 ? p.message : "Poin belum bisa ditukar untuk belanja ini (min. 10 poin).");
        },
      },
    );
  };

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Coins className="size-5 text-primary" aria-hidden="true" />
          <span>Poin kamu: <b className="font-heading">{formatNumber(balance)}</b> <span className="text-muted">(≈ {formatRupiah(balance * 100)})</span></span>
        </div>
        {preview.isPending ? <Button size="sm" variant="ghost" loading>Memeriksa</Button> : <Switch checked={redeem > 0} onChange={toggle} label="Tukar" disabled={balance < 10} />}
      </div>
      {message && <p className="mt-2 text-caption text-muted" role="status">{message}</p>}
    </div>
  );
}
