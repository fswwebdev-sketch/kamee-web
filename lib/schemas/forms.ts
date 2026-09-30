import { z } from "zod";
import { nameSchema, phoneSchema } from "./common";

export const contactSchema = z.object({
  name: nameSchema,
  email: z.string().trim().email("Email harus berupa alamat email yang valid."),
  phone: z.string().trim().optional().refine((v) => !v || phoneSchema.safeParse(v).success, "Nomor WhatsApp tidak valid."),
  subject: z.string().trim().min(3, "Subjek minimal 3 karakter.").max(150),
  message: z.string().trim().min(10, "Pesan minimal 10 karakter.").max(3000, "Pesan maksimal 3.000 karakter."),
});
export type ContactValues = z.infer<typeof contactSchema>;

export const otpRequestSchema = z.object({ phone: phoneSchema });
export const otpVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Masukkan 6 digit kode OTP."),
  name: z.string().trim().max(100).optional(),
});

export const profileSchema = z.object({
  name: nameSchema,
  email: z.string().trim().email("Email tidak valid.").or(z.literal("")).optional(),
  birth_date: z.string().optional(),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const addressSchema = z.object({
  label: z.string().trim().min(2, "Label minimal 2 karakter.").max(50),
  address: z.string().trim().min(8, "Alamat minimal 8 karakter.").max(500),
  note: z.string().trim().max(200).optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  is_default: z.boolean().optional(),
});
export type AddressValues = z.infer<typeof addressSchema>;

export const trackSchema = z.object({
  code: z.string().trim().min(6, "Masukkan kode pesanan.").transform((v) => v.toUpperCase()),
  phone: z.string().trim().regex(/\d{4,}/, "Masukkan minimal 4 digit terakhir nomor WhatsApp."),
});
export type TrackValues = z.infer<typeof trackSchema>;
