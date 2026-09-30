"use client";

import { ArrowUpDown } from "lucide-react";

export const SORT_OPTIONS = [
  { value: "-sold_count", label: "Terlaris" },
  { value: "-rating", label: "Rating tertinggi" },
  { value: "price", label: "Harga terendah" },
  { value: "-price", label: "Harga tertinggi" },
] as const;

export function SortSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <label htmlFor="urutkan" className="sr-only">Urutkan</label>
      <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <select
        id="urutkan"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 appearance-none rounded-lg border border-line bg-surface pl-9 pr-8 text-sm font-medium text-ink focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20"
      >
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
