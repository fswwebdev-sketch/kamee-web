import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";

export function Price({ value, strike, className }: { value: number; strike?: number | null; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span>{formatRupiah(value)}</span>
      {strike != null && strike > value && <s className="text-sm font-normal text-muted">{formatRupiah(strike)}</s>}
    </span>
  );
}
