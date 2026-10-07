"use client";

import { useEffect, useState } from "react";
import { CalendarClock, ShieldAlert } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/misc";
import { isApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

/* ------------------------------------------------------------------ Status jadwal */

export type ScheduleState = "inactive" | "ended" | "scheduled" | "running";

/** Status turunan dari jadwal + saklar aktif (urutan prioritas: Nonaktif → Berakhir → Terjadwal → Berjalan). */
export function scheduleState(item: { is_active: boolean; starts_at: string | null; ends_at: string | null }, now: number): ScheduleState {
  if (!item.is_active) return "inactive";
  if (item.ends_at && new Date(item.ends_at).getTime() < now) return "ended";
  if (item.starts_at && new Date(item.starts_at).getTime() > now) return "scheduled";
  return "running";
}

const STATE_TONE: Record<ScheduleState, Tone> = { inactive: "neutral", ended: "danger", scheduled: "warning", running: "success" };

export function ScheduleBadge({ state, runningLabel = "Berjalan" }: { state: ScheduleState; runningLabel?: string }) {
  const label = { inactive: "Nonaktif", ended: "Berakhir", scheduled: "Terjadwal", running: runningLabel }[state];
  return <Badge tone={STATE_TONE[state]}>{label}</Badge>;
}

/** Rentang jadwal ringkas dua baris: "Mulai …" / "Sampai …" (atau "Tanpa batas waktu"). */
export function ScheduleRange({ starts_at, ends_at }: { starts_at: string | null; ends_at: string | null }) {
  const lines = [starts_at && `Mulai ${formatDateTime(starts_at)}`, ends_at && `s.d. ${formatDateTime(ends_at)}`].filter(Boolean) as string[];
  return (
    <span className="flex items-start gap-1.5 text-caption text-muted">
      <CalendarClock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span className="flex flex-col whitespace-nowrap">
        {lines.length ? lines.map((l) => <span key={l}>{l}</span>) : <span>Tanpa batas waktu</span>}
      </span>
    </span>
  );
}

/** Waktu sekarang yang diperbarui tiap menit (untuk status Terjadwal/Berjalan tanpa refresh). */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/* ------------------------------------------------------------------ Error query (403 rapi) */

export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (isApiError(error) && error.status === 403) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-soft">
        <ShieldAlert className="size-10 text-muted" aria-hidden="true" />
        <p className="mt-3 font-heading font-semibold text-ink">Akses ditolak</p>
        <p className="mt-1 max-w-sm text-sm text-muted">{error.message || "Halaman ini hanya untuk Admin (akses penuh)."}</p>
      </div>
    );
  }
  return <ErrorState onRetry={onRetry} description={isApiError(error) ? error.message : undefined} />;
}

/* ------------------------------------------------------------------ Pratinjau berkas */

/** Object URL untuk File terpilih; dicabut otomatis saat berganti/unmount. */
export function useObjectUrl(file: File | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Validasi ringan di klien (server tetap memvalidasi: image, maks 4 MB). */
export function checkImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Berkas harus berupa gambar (JPG, PNG, WebP, AVIF).";
  if (file.size > MAX_IMAGE_BYTES) return "Ukuran gambar maksimal 4 MB.";
  return null;
}
