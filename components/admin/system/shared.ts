import { z } from "zod";
import { normalizePhone } from "@/lib/format";

/** Sama dengan App\Support\Phone::isValid di backend. */
export const zPhoneWa = z
  .string()
  .trim()
  .min(1, "Nomor WhatsApp wajib diisi.")
  .refine((v) => /^628\d{7,12}$/.test(normalizePhone(v)), "Nomor WhatsApp tidak valid. Gunakan format 08xx atau 628xx.");

export const zTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam HH:MM.");

/** Angka dari input teks (string kosong → "wajib diisi", bukan 0). */
export const zNumber = (opts: { min: number; max?: number; label: string; int?: boolean }) => {
  let n = z.coerce.number({ invalid_type_error: `${opts.label} harus angka.` }).min(opts.min, `${opts.label} minimal ${opts.min.toLocaleString("id-ID")}.`);
  if (opts.max !== undefined) n = n.max(opts.max, `${opts.label} maksimal ${opts.max.toLocaleString("id-ID")}.`);
  if (opts.int) n = n.int(`${opts.label} harus bilangan bulat.`);
  return z
    .string()
    .trim()
    .min(1, `${opts.label} wajib diisi.`)
    .refine((v) => Number.isFinite(Number(v.replace(",", "."))), `${opts.label} harus angka.`)
    .transform((v) => v.replace(",", "."))
    .pipe(n);
};

export function mapsHref(lat: number | string, lng: number | string) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
