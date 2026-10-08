"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { WhatsAppIcon } from "@/components/layout/whatsapp-float";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/features/auth/store";
import { useCartStore } from "@/features/cart/store";
import { toOrderItems } from "@/features/cart/pricing";
import { useRecentOrders } from "@/features/orders/store";
import { isApiError } from "@/lib/api";
import { normalizePhone } from "@/lib/format";
import { useWhatsAppOrder } from "@/lib/queries/orders";
import { nameSchema, phoneSchema } from "@/lib/schemas/common";
import { hashString } from "@/lib/utils";
import { navigatePendingWindow, openPendingWindow } from "@/lib/whatsapp";

const schema = z.object({ name: nameSchema, phone: phoneSchema, fulfillment: z.enum(["pickup", "dine_in"]), note: z.string().max(500).optional() });
type Values = z.infer<typeof schema>;

/**
 * Pesan cepat via WhatsApp dari keranjang (ambil di outlet / makan di tempat):
 * POST /orders/whatsapp menyimpan pesanan pending lalu membuka wa.me.
 */
export function WhatsAppOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const customer = useAuthStore((s) => s.customer);
  const { lines, outletId, promoCode, clear } = useCartStore();
  const addRecent = useRecentOrders((s) => s.add);
  const order = useWhatsAppOrder();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: customer?.name ?? "", phone: customer?.phone_wa ? `0${customer.phone_wa.slice(2)}` : "", fulfillment: "pickup" },
  });
  const fulfillment = watch("fulfillment");

  const submit = (v: Values) => {
    if (!outletId) return toast.error("Pilih outlet terlebih dahulu.");
    const payload = { outlet_id: outletId, customer: { name: v.name, phone: normalizePhone(v.phone) }, fulfillment: v.fulfillment, items: toOrderItems(lines), promo_code: promoCode, note: v.note || null };
    const win = openPendingWindow();
    order.mutate(
      { payload, idempotencyKey: `wa-${hashString(JSON.stringify(payload))}` },
      {
        onSuccess: (res) => {
          addRecent({ code: res.data.code, phone: res.data.customer_phone, total: res.data.total, createdAt: res.data.created_at });
          navigatePendingWindow(win, res.whatsapp_url);
          clear();
          onClose();
          toast.success("Pesanan tersimpan", { description: `Kode ${res.data.code}. Lanjutkan konfirmasi di WhatsApp.` });
          router.push(`/pesanan/${res.data.code}?phone=${res.data.customer_phone.slice(-4)}`);
        },
        onError: (e) => {
          win?.close();
          toast.error(isApiError(e) ? e.message : "Gagal membuat pesanan WhatsApp.");
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pesan via WhatsApp"
      description="Pesanan disimpan dulu, lalu WhatsApp terbuka dengan ringkasan pesanan untuk dikonfirmasi barista."
      footer={
        <Button variant="whatsapp" size="lg" className="w-full" loading={order.isPending} onClick={handleSubmit(submit)}>
          <WhatsAppIcon className="size-5" /> Kirim ke WhatsApp
        </Button>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
        <Input label="Nama" autoComplete="name" required error={errors.name?.message} {...register("name")} />
        <Input label="Nomor WhatsApp" type="tel" inputMode="tel" autoComplete="tel" placeholder="0812-3456-7890" required error={errors.phone?.message} {...register("phone")} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-ink">Layanan</legend>
          <div className="grid grid-cols-2 gap-2">
            <ChoiceCard name="wa-fulfillment" value="pickup" checked={fulfillment === "pickup"} onChange={() => setValue("fulfillment", "pickup")} title="Ambil di outlet" />
            <ChoiceCard name="wa-fulfillment" value="dine_in" checked={fulfillment === "dine_in"} onChange={() => setValue("fulfillment", "dine_in")} title="Makan di tempat" />
          </div>
          <p className="text-caption text-muted">Mau dikirim via GoSend/GrabExpress? Pilih “Ambil di outlet”, lalu pesan driver sendiri ke Kamee Coffee. Ongkir dibayar ke driver.</p>
        </fieldset>
        <Textarea label="Catatan (opsional)" rows={2} {...register("note")} />
      </form>
    </Dialog>
  );
}
