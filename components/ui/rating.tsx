import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

/**
 * Lima bintang sebagai SATU elemen: bentuk bintang dari CSS mask (utility `stars`), isi parsial
 * dari gradient. Jauh lebih ringan daripada 10 SVG per rating (menu menampilkan puluhan rating).
 */
export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(5, value)) * 20;
  const gap = 2;
  const style = {
    width: size * 5 + gap * 4,
    height: size,
    "--star-size": `${size}px`,
    "--star-step": `${size + gap}px`,
    "--star-fill": `${pct}%`,
  } as CSSProperties;
  return <span className={cn("stars inline-block shrink-0", className)} style={style} aria-hidden="true" />;
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-caption text-muted", className)}>
      <Stars value={value} />
      <span className="font-semibold text-ink">{value.toFixed(1)}</span>
      {count != null && <span>({formatNumber(count)})</span>}
      <span className="sr-only">Rating {value.toFixed(1)} dari 5{count != null ? `, ${count} ulasan` : ""}</span>
    </span>
  );
}
