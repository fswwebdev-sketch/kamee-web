import { z } from "zod";
import { normalizePhone } from "@/lib/format";

export const phoneSchema = z
  .string({ required_error: "Nomor WhatsApp wajib diisi." })
  .trim()
  .min(1, "Nomor WhatsApp wajib diisi.")
  .refine((v) => /^628\d{7,12}$/.test(normalizePhone(v)), "Nomor WhatsApp tidak valid. Gunakan format 08xx atau 628xx.");

export const nameSchema = z.string().trim().min(2, "Nama minimal 2 karakter.").max(100, "Nama maksimal 100 karakter.");
