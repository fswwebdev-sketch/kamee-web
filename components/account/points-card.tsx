import { Coins, Crown } from "lucide-react";
import { formatNumber, formatRupiah } from "@/lib/format";
import type { PointsSummary } from "@/types/api";

export function PointsCard({ summary }: { summary: PointsSummary }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6F4E37] to-[#3E2723] p-6 text-[#F5E6CA] shadow-lift">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10" aria-hidden="true" />
      <p className="flex items-center gap-2 text-sm text-[#F5E6CA]/85"><Crown className="size-4" aria-hidden="true" /> Member {summary.tier?.name ?? "Bronze"}</p>
      <p className="mt-4 flex items-baseline gap-2 font-heading text-4xl font-bold">
        {formatNumber(summary.balance)} <span className="text-base font-medium">poin</span>
      </p>
      <p className="mt-1 text-sm text-[#F5E6CA]/85">≈ {formatRupiah(summary.balance_value)} potongan · 1 poin = {formatRupiah(summary.point_value)}</p>
      {summary.expiring_in_30_days > 0 && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-caption"><Coins className="size-3.5" aria-hidden="true" />{summary.expiring_in_30_days} poin kedaluwarsa dalam 30 hari</p>
      )}
    </div>
  );
}
