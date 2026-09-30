import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Persentase perubahan; null bila periode lalu 0 (tidak bisa dibandingkan). */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}

export function formatPercent(v: number) {
  return `${v > 0 ? "+" : ""}${v.toLocaleString("id-ID", { maximumFractionDigits: 1, minimumFractionDigits: Math.abs(v) < 10 ? 1 : 0 })}%`;
}

/**
 * Stat tile: label · nilai · delta vs periode lalu (arah + ikon + teks, bukan warna saja).
 */
export function StatCard({
  label,
  value,
  delta,
  compareLabel,
  icon,
  loading,
  goodWhenUp = true,
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  compareLabel?: string;
  icon?: ReactNode;
  loading?: boolean;
  goodWhenUp?: boolean;
}) {
  const dir = delta == null ? null : delta > 0.05 ? "up" : delta < -0.05 ? "down" : "flat";
  const good = dir === "flat" || dir === null ? null : (dir === "up") === goodWhenUp;
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft md:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && <span className="grid size-9 place-items-center rounded-xl bg-cream text-primary [&>svg]:size-[18px]" aria-hidden="true">{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <p className="font-heading text-[1.625rem] font-semibold leading-8 text-ink">{value}</p>
      )}
      <div className="min-h-5 text-caption text-muted">
        {loading ? (
          <Skeleton className="h-4 w-40" />
        ) : delta === undefined ? null : delta === null ? (
          <>Belum ada data pembanding{compareLabel ? ` ${compareLabel}` : ""}</>
        ) : (
          <>
            <span
              className={cn(
                "mr-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
                good === true && "bg-success/15 text-[#1B5E20] dark:text-success",
                good === false && "bg-danger/12 text-[#9B1C1C] dark:text-danger",
                good === null && "bg-cream text-ink",
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {formatPercent(delta)}
            </span>
            {compareLabel}
          </>
        )}
      </div>
    </div>
  );
}
