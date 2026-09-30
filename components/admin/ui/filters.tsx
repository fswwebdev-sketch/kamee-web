"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { CalendarRange, Search, X } from "lucide-react";
import { useDebounce } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const control = "h-10 rounded-lg border border-line bg-bg px-3 text-sm text-ink transition focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20";

/** Pencarian dengan debounce 300 ms, tersinkron dengan nilai dari URL. */
export function SearchInput({ value, onChange, placeholder = "Cari…", label = "Cari", className }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string; className?: string }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, 300);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (debounced !== value) onChange(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return (
    <div className={cn("relative min-w-48 flex-1 sm:max-w-72", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={label} className={cn(control, "w-full pl-9 pr-8")} />
      {text && (
        <button type="button" onClick={() => setText("")} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-cream">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterSelect({ label, value, onChange, children, className }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(control, "min-w-36 pr-8")}>
        {children}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ Periode */

export type PresetId = "today" | "7d" | "30d" | "month" | "last-month" | "90d" | "year" | "custom";

export const PRESETS: { id: Exclude<PresetId, "custom">; label: string }[] = [
  { id: "today", label: "Hari ini" },
  { id: "7d", label: "7 hari" },
  { id: "30d", label: "30 hari" },
  { id: "month", label: "Bulan ini" },
  { id: "last-month", label: "Bulan lalu" },
  { id: "90d", label: "90 hari" },
  { id: "year", label: "Tahun ini" },
];

/** YYYY-MM-DD di zona Asia/Jakarta */
export function ymd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12));
}

export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000) + 1;
}

export function presetRange(id: Exclude<PresetId, "custom">, now = new Date()): { from: string; to: string } {
  const today = ymd(now);
  const [y, m] = today.split("-").map(Number) as [number, number];
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (id) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "90d":
      return { from: addDays(today, -89), to: today };
    case "month":
      return { from: `${y}-${pad(m)}-01`, to: today };
    case "last-month": {
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      const last = new Date(Date.UTC(py, pm, 0)).getUTCDate();
      return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(last)}` };
    }
    case "year":
      return { from: `${y}-01-01`, to: today };
  }
}

/** Periode sebelumnya dengan panjang sama (untuk % perubahan). */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const len = daysBetween(from, to);
  return { from: addDays(from, -len), to: addDays(from, -1) };
}

export function DateRangeFilter({
  preset,
  from,
  to,
  onChange,
  className,
}: {
  preset: PresetId;
  from: string;
  to: string;
  onChange: (v: { preset: PresetId; from: string; to: string }) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-p`} className="text-[11px] font-semibold uppercase tracking-wide text-muted">Periode</label>
        <select
          id={`${id}-p`}
          value={preset}
          onChange={(e) => {
            const p = e.target.value as PresetId;
            if (p === "custom") onChange({ preset: p, from, to });
            else onChange({ preset: p, ...presetRange(p) });
          }}
          className={cn(control, "min-w-36 pr-8")}
        >
          {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          <option value="custom">Pilih tanggal…</option>
        </select>
      </div>
      {preset === "custom" && (
        <fieldset className="flex items-end gap-2">
          <legend className="sr-only">Rentang tanggal</legend>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-f`} className="text-[11px] font-semibold uppercase tracking-wide text-muted">Dari</label>
            <input id={`${id}-f`} type="date" value={from} max={to} onChange={(e) => e.target.value && onChange({ preset, from: e.target.value, to })} className={control} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-t`} className="text-[11px] font-semibold uppercase tracking-wide text-muted">Sampai</label>
            <input id={`${id}-t`} type="date" value={to} min={from} max={ymd(new Date())} onChange={(e) => e.target.value && onChange({ preset, from, to: e.target.value })} className={control} />
          </div>
        </fieldset>
      )}
      {preset !== "custom" && (
        <p className="flex h-10 items-center gap-1.5 text-caption text-muted">
          <CalendarRange className="size-4" aria-hidden="true" />
          {from === to ? formatShort(from) : `${formatShort(from)} – ${formatShort(to)}`}
        </p>
      )}
    </div>
  );
}

export function formatShort(s: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parse(s));
}
