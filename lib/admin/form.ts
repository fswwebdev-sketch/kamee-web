"use client";

import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { z } from "zod";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { errorMessage } from "./queries";

/**
 * Tampilkan error validasi Laravel (422) di field form masing-masing.
 * Error lain (403/409/500/jaringan) → toast. Mengembalikan true bila ada field yang ditandai.
 *
 *   onError: (e) => applyServerErrors(e, form.setError, "Gagal menyimpan produk")
 */
export function applyServerErrors<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>, title = "Gagal menyimpan"): boolean {
  if (isApiError(e) && e.status === 422 && Object.keys(e.errors).length) {
    let first = true;
    for (const [field, messages] of Object.entries(e.errors)) {
      // "options.0.name" → "options.0.name" (RHF memakai notasi titik yang sama)
      setError(field as Path<T>, { type: "server", message: messages[0] }, { shouldFocus: first });
      first = false;
    }
    toast.error(title, { description: "Periksa kembali isian yang ditandai." });
    return true;
  }
  toast.error(title, { description: errorMessage(e) });
  return false;
}

/* ------------------------------------------------------------ Skema Zod yang sering dipakai */

/** Angka bulat dari input teks/number (string kosong → undefined). */
export const zInt = (opts: { min?: number; max?: number; label?: string } = {}) => {
  let s = z.coerce.number({ invalid_type_error: `${opts.label ?? "Nilai"} harus angka.` }).int(`${opts.label ?? "Nilai"} harus bilangan bulat.`);
  if (opts.min !== undefined) s = s.min(opts.min, `${opts.label ?? "Nilai"} minimal ${opts.min.toLocaleString("id-ID")}.`);
  if (opts.max !== undefined) s = s.max(opts.max, `${opts.label ?? "Nilai"} maksimal ${opts.max.toLocaleString("id-ID")}.`);
  return s;
};

/** Angka opsional: "" → null. */
export const zOptionalInt = (opts: { min?: number; max?: number; label?: string } = {}) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), zInt(opts).nullable());

export const zSlug = z
  .string()
  .trim()
  .max(180)
  .regex(/^[a-z0-9_-]*$/, "Slug hanya huruf kecil, angka, - dan _.")
  .optional()
  .or(z.literal(""));

/** "2026-10-01T09:00" (input datetime-local, WIB) ⇄ ISO dengan offset +07:00. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const wib = new Date(d.getTime() + 7 * 3600_000);
  return wib.toISOString().slice(0, 16);
}

export function fromLocalInput(v: string | null | undefined): string | null {
  return v ? `${v}:00+07:00` : null;
}

/** Hilangkan kunci bernilai "" agar field opsional tidak terkirim sebagai string kosong. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined)) as Partial<T>;
}

/** Bangun FormData (untuk upload). Boolean → "1"/"0", array → key[] , null → "" */
export function toFormData(values: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    if (value instanceof File) fd.append(key, value);
    else if (Array.isArray(value)) value.forEach((v) => fd.append(`${key}[]`, v instanceof File ? v : String(v)));
    else if (typeof value === "boolean") fd.append(key, value ? "1" : "0");
    else if (value === null) fd.append(key, "");
    else fd.append(key, String(value));
  }
  return fd;
}
