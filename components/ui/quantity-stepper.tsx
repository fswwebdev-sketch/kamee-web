"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { MAX_QTY } from "@/features/cart/pricing";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = MAX_QTY,
  label,
  size = "md",
  removable = false,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: "sm" | "md";
  /** Tampilkan ikon hapus saat qty = 1 (keranjang) */
  removable?: boolean;
}) {
  const btn = cn("grid place-items-center rounded-full text-ink transition hover:bg-cream disabled:opacity-40", size === "sm" ? "size-11 md:size-9" : "size-11");
  const showTrash = removable && value <= 1;
  return (
    <div role="group" aria-label={`Jumlah ${label}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg p-0.5">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={!removable && value <= min} aria-label={showTrash ? `Hapus ${label}` : `Kurangi ${label}`}>
        {showTrash ? <Trash2 className="size-4 text-danger" /> : <Minus className="size-4" />}
      </button>
      <output aria-live="polite" className={cn("min-w-7 text-center font-heading font-semibold tabular-nums", size === "sm" ? "text-sm" : "text-base")}>{value}</output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Tambah ${label}`}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}
