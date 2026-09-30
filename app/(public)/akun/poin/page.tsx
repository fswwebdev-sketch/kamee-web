"use client";

import { PointsCard } from "@/components/account/points-card";
import { TierProgress } from "@/components/account/tier-progress";
import { EmptyState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatNumber } from "@/lib/format";
import { usePoints } from "@/lib/queries/account";
import { cn } from "@/lib/utils";

export default function PointsPage() {
  const { data, isLoading } = usePoints();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2">Poin & Tier</h1>
      {isLoading || !data ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <PointsCard summary={data.summary} />
            <TierProgress summary={data.summary} />
          </div>
          <div className="rounded-3xl bg-cream/60 p-5 text-sm text-ink">
            <p className="font-semibold">Cara kerja poin</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>1 poin setiap belanja Rp10.000 (tanpa ongkir), dikali multiplier tier.</li>
              <li>Tukar di keranjang: 1 poin = Rp100, maksimal 50% dari belanja.</li>
              <li>Poin berlaku 12 bulan; poin terlama terpakai lebih dulu.</li>
            </ul>
          </div>
          <section aria-labelledby="riwayat-poin">
            <h2 id="riwayat-poin" className="font-heading text-lg font-semibold">Riwayat poin</h2>
            {data.data.length === 0 ? (
              <EmptyState className="mt-3" title="Belum ada riwayat poin" description="Selesaikan pesanan pertamamu untuk mendapat poin." />
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-3xl border border-line bg-surface">
                {data.data.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-medium text-ink">{t.note ?? t.type_label}</p>
                      <p className="text-caption text-muted">{formatDate(t.created_at)}{t.expires_at && t.points > 0 ? ` · berlaku s.d. ${formatDate(t.expires_at)}` : ""}</p>
                    </div>
                    <p className={cn("font-heading font-semibold", t.points > 0 ? "text-success" : "text-danger")}>{t.points > 0 ? "+" : ""}{formatNumber(t.points)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
