"use client";

import { forwardRef, useEffect, useId, useState, type ReactNode } from "react";
import { Banknote, Landmark, QrCode } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/field";
import { BANK_SUGGESTIONS, BOOK_METHOD_LABEL, type BookMethod, type IngredientUnit } from "@/lib/admin/finance-types";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Format */

const qtyFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

/** Jumlah bahan: maksimal 2 desimal, lokal Indonesia (1.234,5). */
export function formatQty(value: number): string {
  return qtyFmt.format(value);
}

export const UNIT_LABEL: Record<IngredientUnit, string> = { ml: "ml", gram: "gr", pcs: "pcs" };

export function formatQtyUnit(value: number, unit: IngredientUnit): string {
  return `${formatQty(value)} ${UNIT_LABEL[unit]}`;
}

/** Harga per unit: Rp60/gr, Rp23,5/ml (pecahan rupiah dipertahankan 2 desimal). */
export function formatUnitCost(cost: number, unit: IngredientUnit): string {
  const v = Number.isInteger(cost) ? formatRupiah(cost) : `Rp${qtyFmt.format(cost)}`;
  return `${v}/${UNIT_LABEL[unit]}`;
}

/** "2026-09-20" → "20 Sep 2026" (tanggal kalender, tanpa geser zona). */
export function formatDay(s: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y!, m! - 1, d!, 12)));
}

/** Label metode + bank: "Transfer BCA". */
export function methodText(method: BookMethod, bank?: string | null): string {
  return method === "bank_transfer" && bank ? `${BOOK_METHOD_LABEL[method]} ${bank}` : BOOK_METHOD_LABEL[method];
}

/** Angka desimal dari teks Indonesia ("1,5" / "1.5" → 1.5). Kosong/invalid → NaN. */
export function parseDecimal(text: string): number {
  const t = text.trim().replace(/\s/g, "");
  if (!t) return Number.NaN;
  // "1.000,5" → 1000.5 ; "1,5" → 1.5 ; "1.5" → 1.5
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  return /^-?\d*\.?\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

/* ------------------------------------------------------------------ Metode bayar */

export const METHOD_ICON: Record<BookMethod, ReactNode> = {
  cash: <Banknote className="size-4" aria-hidden="true" />,
  qris: <QrCode className="size-4" aria-hidden="true" />,
  bank_transfer: <Landmark className="size-4" aria-hidden="true" />,
};

const METHODS: BookMethod[] = ["cash", "qris", "bank_transfer"];

/** Segmen pilihan (radiogroup) — dipakai untuk metode, jenis, layanan. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  hideLabel,
  className,
  size = "md",
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  hideLabel?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  const move = (dir: number) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length]!;
    onChange(next.value);
    requestAnimationFrame(() => document.getElementById(`${id}-${next.value}`)?.focus());
  };
  return (
    <div className={className}>
      <p id={`${id}-l`} className={cn("mb-1.5 text-sm font-medium text-ink", hideLabel && "sr-only")}>{label}</p>
      <div role="radiogroup" aria-labelledby={`${id}-l`} className="flex gap-1 rounded-xl bg-cream p-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              id={`${id}-${o.value}`}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  move(1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  move(-1);
                }
              }}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition",
                size === "sm" ? "h-11 md:h-9" : "h-11",
                active ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink",
              )}
            >
              {o.icon}
              <span className="truncate">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pilihan metode bayar Tunai / QRIS / Transfer + isian bank (saran BCA, BJB) saat Transfer. */
export function MethodPicker({
  method,
  bank,
  onMethod,
  onBank,
  label = "Metode bayar",
  bankError,
  methods = METHODS,
}: {
  method: BookMethod;
  bank: string;
  onMethod: (m: BookMethod) => void;
  onBank: (b: string) => void;
  label?: string;
  bankError?: string;
  methods?: BookMethod[];
}) {
  const listId = useId();
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        label={label}
        value={method}
        onChange={onMethod}
        options={methods.map((m) => ({ value: m, label: BOOK_METHOD_LABEL[m], icon: METHOD_ICON[m] }))}
      />
      {method === "bank_transfer" && (
        <div className="flex flex-col gap-2">
          <Input label="Bank" placeholder="mis. BCA" value={bank} onChange={(e) => onBank(e.target.value)} list={listId} maxLength={50} autoComplete="off" error={bankError} />
          <datalist id={listId}>
            {BANK_SUGGESTIONS.map((b) => <option key={b} value={b} />)}
          </datalist>
          <div className="flex flex-wrap gap-2" aria-label="Saran bank">
            {BANK_SUGGESTIONS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onBank(b)}
                aria-pressed={bank.trim().toUpperCase() === b}
                className={cn(
                  "h-11 rounded-lg px-4 text-sm font-semibold transition md:h-9",
                  bank.trim().toUpperCase() === b ? "bg-primary text-on-primary" : "bg-cream text-ink hover:bg-line",
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Input rupiah */

const idNumber = new Intl.NumberFormat("id-ID");

/** Isian rupiah: menampilkan pemisah ribuan (50.000), nilai = integer atau null. */
export const RupiahInput = forwardRef<HTMLInputElement, Omit<InputProps, "value" | "onChange" | "prefix"> & { value: number | null; onValueChange: (v: number | null) => void }>(
  function RupiahInput({ value, onValueChange, ...props }, ref) {
    const [text, setText] = useState(value == null ? "" : idNumber.format(value));
    useEffect(() => {
      const current = text.replace(/\D/g, "");
      if ((value == null ? "" : String(value)) !== current) setText(value == null ? "" : idNumber.format(value));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);
    return (
      <Input
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        prefix="Rp"
        value={text}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
          setText(digits ? idNumber.format(Number(digits)) : "");
          onValueChange(digits ? Number(digits) : null);
        }}
        {...props}
      />
    );
  },
);

/* ------------------------------------------------------------------ Kecil-kecil */

export function SummaryTile({ label, value, tone = "neutral", hint, className, testId }: { label: string; value: ReactNode; tone?: "neutral" | "in" | "out"; hint?: ReactNode; className?: string; testId?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-4 shadow-soft", className)} data-testid={testId}>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={cn("mt-1 font-heading text-xl font-semibold tabular-nums", tone === "in" && "text-success", tone === "out" && "text-danger", tone === "neutral" && "text-ink")}>{value}</p>
      {hint && <p className="mt-0.5 text-caption text-muted">{hint}</p>}
    </div>
  );
}

/** Info/catatan kecil berlatar cream. */
export function Note({ icon, children, className, tone = "neutral" }: { icon?: ReactNode; children: ReactNode; className?: string; tone?: "neutral" | "warning" }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3.5 text-sm",
        tone === "warning" ? "border-warning/40 bg-warning/10 text-ink" : "border-line bg-cream/60 text-ink",
        className,
      )}
    >
      {icon && <span className={cn("mt-0.5 shrink-0 [&>svg]:size-4", tone === "warning" ? "text-[#7A4500] dark:text-warning" : "text-primary")} aria-hidden="true">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Tanggal hari ini (WIB) YYYY-MM-DD. */
export function todayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
