import { formatRupiah } from "@/lib/format";
import type { PointsSummary } from "@/types/api";

export function TierProgress({ summary }: { summary: PointsSummary }) {
  const next = summary.next_tier;
  const current = summary.tier?.min_spend ?? 0;
  const pct = next ? Math.min(100, Math.round(((summary.lifetime_spend - current) / (next.min_spend - current)) * 100)) : 100;
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">{summary.tier?.name ?? "Bronze"}</span>
        <span className="text-muted">{next ? next.name : "Tier tertinggi"}</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-cream" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progres menuju tier berikutnya">
        <div className="h-full rounded-full bg-primary transition-[width] duration-600" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-sm text-muted">
        {next ? <>Belanja <b className="text-ink">{formatRupiah(next.remaining_spend)}</b> lagi untuk naik ke <b className="text-ink">{next.name}</b>.</> : "Kamu sudah di tier tertinggi. Terima kasih! ☕"}
      </p>
      {summary.tier?.perks?.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {summary.tier.perks.map((p) => <li key={p} className="rounded-full bg-cream px-3 py-1 text-caption text-ink">{p}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
