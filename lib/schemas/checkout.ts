import { z } from "zod";
import { env } from "@/lib/env";
import { nameSchema, phoneSchema } from "./common";

export const PAYMENT_CHANNELS = {
  ewallet: [
    { value: "gopay", label: "GoPay" },
    { value: "shopeepay", label: "ShopeePay" },
  ],
  bank_transfer: [
    { value: "bca", label: "BCA" },
    { value: "bni", label: "BNI" },
    { value: "bri", label: "BRI" },
    { value: "permata", label: "Permata" },
  ],
} as const;

export const checkoutSchema = z
  .object({
    outletId: z.number({ required_error: "Pilih outlet." }).int().positive("Pilih outlet."),
    name: nameSchema,
    phone: phoneSchema,
    fulfillment: z.enum(["pickup", "delivery", "dine_in"], { required_error: "Pilih jenis layanan." }),
    address: z.string().trim().max(500).optional(),
    addressNote: z.string().trim().max(200).optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    schedule: z.enum(["now", "later"]),
    scheduledAt: z.string().optional(),
    paymentMethod: z.enum(["qris", "ewallet", "bank_transfer", "cash"], { required_error: "Pilih metode pembayaran." }),
    paymentChannel: z.string().optional(),
    note: z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional(),
  })
  .superRefine((v, ctx) => {
    // Mode ojol: pelanggan memesan GoSend/GrabExpress sendiri → alamat tidak diminta di web.
    if (v.fulfillment === "delivery" && env.deliveryMode !== "ojol") {
      if (!v.address || v.address.length < 8) ctx.addIssue({ code: "custom", path: ["address"], message: "Alamat pengantaran wajib diisi (min. 8 karakter)." });
      if (v.lat == null || v.lng == null) ctx.addIssue({ code: "custom", path: ["lat"], message: "Tandai titik lokasi pengantaran di peta." });
    }
    if (v.schedule === "later") {
      const t = v.scheduledAt ? new Date(v.scheduledAt).getTime() : NaN;
      if (Number.isNaN(t)) ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Pilih waktu pesanan." });
      else if (t < Date.now() + 25 * 60_000) ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Jadwalkan minimal 30 menit dari sekarang." });
      else if (t > Date.now() + 7 * 86_400_000) ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Jadwal maksimal 7 hari ke depan." });
    }
    if ((v.paymentMethod === "ewallet" || v.paymentMethod === "bank_transfer") && !v.paymentChannel) {
      ctx.addIssue({ code: "custom", path: ["paymentChannel"], message: v.paymentMethod === "ewallet" ? "Pilih e-wallet." : "Pilih bank." });
    }
  });

export type CheckoutValues = z.infer<typeof checkoutSchema>;

/** Checkout WhatsApp tidak butuh metode bayar (konfirmasi via chat). */
export const whatsappCheckoutSchema = checkoutSchema;
