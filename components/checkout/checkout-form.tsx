"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle, CalendarClock, Clock, Lock } from "lucide-react";
import { CartSummary } from "@/components/cart/cart-summary";
import { MobileOrderSummary, MobilePayBar } from "@/components/checkout/mobile-order-summary";
import { OutletPicker } from "@/components/cart/outlet-picker";
import { WhatsAppIcon } from "@/components/layout/whatsapp-float";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Input, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/features/auth/store";
import { useCartSummary } from "@/features/cart/hooks";
import { estimateTotals, toOrderItems } from "@/features/cart/pricing";
import { useCartStore } from "@/features/cart/store";
import { useRecentOrders } from "@/features/orders/store";
import { isApiError, type ApiError } from "@/lib/api";
import { formatRupiah, normalizePhone } from "@/lib/format";
import { useDebounce } from "@/lib/hooks";
import { useAddresses } from "@/lib/queries/account";
import { useOutlets } from "@/lib/queries/content";
import { useCreateOrder, usePayOrder, useQuote, useWhatsAppOrder } from "@/lib/queries/orders";
import { checkoutSchema, type CheckoutValues } from "@/lib/schemas/checkout";
import { hashString, uid } from "@/lib/utils";
import { navigatePendingWindow, openPendingWindow } from "@/lib/whatsapp";
import type { OrderPayload } from "@/types/api";
import { AddressMap } from "./address-map";
import { FulfillmentPicker } from "./fulfillment-picker";
import { PaymentMethodPicker } from "./payment-method-picker";

const FIELD_MAP: Record<string, keyof CheckoutValues> = {
  "customer.name": "name",
  "customer.phone": "phone",
  address: "lat",
  "address.text": "address",
  scheduled_at: "scheduledAt",
  outlet_id: "outletId",
  fulfillment: "fulfillment",
};

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${step}`} className="rounded-3xl border border-line bg-surface p-5 md:p-6">
      <h2 id={`step-${step}`} className="mb-4 flex items-center gap-3 font-heading text-lg font-semibold text-ink">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-on-primary" aria-hidden="true">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const { hydrated, lines, count, subtotal } = useCartSummary();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const { outletId, promoCode, redeemPoints, setPromoCode, setRedeemPoints, clear } = useCartStore();
  const customer = useAuthStore((s) => s.customer);
  const { data: outlets = [] } = useOutlets();
  const { data: addresses = [] } = useAddresses();
  const addRecent = useRecentOrders((s) => s.add);
  const nonce = useRef(uid());

  const createOrder = useCreateOrder();
  const payOrder = usePayOrder();
  const waOrder = useWhatsAppOrder();

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onTouched",
    defaultValues: {
      outletId: outletId ?? undefined,
      name: customer?.name ?? "",
      phone: customer?.phone_wa ? `0${customer.phone_wa.slice(2)}` : "",
      fulfillment: "pickup",
      schedule: "now",
      paymentMethod: "qris",
      lat: null,
      lng: null,
    },
  });
  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } = form;
  const v = watch();

  useEffect(() => {
    if (outletId) setValue("outletId", outletId, { shouldValidate: false });
  }, [outletId, setValue]);

  // Alamat utama member otomatis dipakai saat memilih "Diantar".
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  useEffect(() => {
    if (v.fulfillment === "delivery" && defaultAddress && !v.address && v.lat == null) {
      setValue("address", defaultAddress.address);
      setValue("addressNote", defaultAddress.note ?? "");
      if (defaultAddress.lat != null && defaultAddress.lng != null) {
        setValue("lat", defaultAddress.lat);
        setValue("lng", defaultAddress.lng);
      }
    }
  }, [v.fulfillment, defaultAddress, v.address, v.lat, setValue]);

  const outlet = outlets.find((o) => o.id === outletId);
  const phoneOk = /^628\d{7,12}$/.test(normalizePhone(v.phone ?? ""));

  const buildPayload = (values: CheckoutValues, forQuote = false): OrderPayload | null => {
    if (!values.outletId || !lines.length) return null;
    const delivery = values.fulfillment === "delivery";
    return {
      outlet_id: values.outletId,
      customer: {
        name: values.name?.trim() || (forQuote ? "Pelanggan" : ""),
        phone: phoneOk || !forQuote ? normalizePhone(values.phone ?? "") : "6280000000000",
      },
      fulfillment: values.fulfillment,
      ...(delivery && values.lat != null && values.lng != null
        ? { address: { text: values.address || "Lokasi di peta", lat: values.lat, lng: values.lng, note: values.addressNote || undefined } }
        : {}),
      scheduled_at: values.schedule === "later" && values.scheduledAt ? new Date(values.scheduledAt).toISOString() : null,
      items: toOrderItems(lines),
      promo_code: promoCode,
      redeem_points: redeemPoints || 0,
      note: values.note || null,
    };
  };

  // Total resmi dari server (debounce agar tidak memanggil API tiap ketikan).
  const quoteInput = useDebounce(
    useMemo(() => {
      if (!hydrated) return null;
      if (v.fulfillment === "delivery" && (v.lat == null || v.lng == null)) return null;
      const p = buildPayload(v, true);
      return p ? { ...p, scheduled_at: null, note: null } : null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, v.outletId, v.fulfillment, v.lat, v.lng, phoneOk, v.phone, lines, promoCode, redeemPoints]),
    400,
  );
  const quote = useQuote(quoteInput);
  const quoteError = quote.error as ApiError | null;

  // Voucher / poin yang ditolak server dilepas otomatis dengan pemberitahuan.
  useEffect(() => {
    if (!quoteError || !isApiError(quoteError)) return;
    if (quoteError.field("promo_code")) {
      toast.error("Voucher dilepas", { description: quoteError.field("promo_code") });
      setPromoCode(null);
    }
    if (quoteError.field("redeem_points")) {
      toast.error("Penukaran poin dibatalkan", { description: quoteError.field("redeem_points") });
      setRedeemPoints(0);
    }
  }, [quoteError, setPromoCode, setRedeemPoints]);

  const q = quote.data;
  const totals = q
    ? estimateTotals({ subtotal: q.subtotal, discount: q.discount, pointsValue: q.points_value, deliveryFee: q.delivery_fee, serviceFee: q.service_fee })
    : estimateTotals({ subtotal });
  const addressError = errors.lat?.message ?? (quoteError && isApiError(quoteError) ? quoteError.field("address") : undefined);

  const applyServerErrors = (e: unknown) => {
    if (!isApiError(e)) return toast.error("Terjadi kesalahan. Silakan coba lagi.");
    let mapped = false;
    for (const [field, messages] of Object.entries(e.errors)) {
      const target = FIELD_MAP[field];
      if (target) {
        setError(target, { message: messages[0] });
        mapped = true;
      }
    }
    toast.error(mapped ? "Periksa kembali data pesanan" : e.message, mapped ? { description: e.message } : undefined);
  };

  const onSubmit = async (values: CheckoutValues) => {
    const payload = buildPayload(values);
    if (!payload) return;
    try {
      const { data: order } = await createOrder.mutateAsync({ payload, idempotencyKey: `order-${nonce.current}-${hashString(JSON.stringify(payload))}` });
      addRecent({ code: order.code, phone: order.customer_phone, total: order.total, createdAt: order.created_at });
      const phone4 = order.customer_phone.slice(-4);
      try {
        await payOrder.mutateAsync({
          code: order.code,
          method: values.paymentMethod,
          channel: values.paymentChannel,
          idempotencyKey: `pay-${order.code}-${values.paymentMethod}-${values.paymentChannel ?? ""}`,
        });
      } catch (e) {
        toast.error("Pesanan dibuat, tetapi pembayaran belum bisa diproses", { description: isApiError(e) ? e.message : undefined });
      }
      clear();
      if (values.paymentMethod === "cash") {
        toast.success("Pesanan diteruskan ke barista", { description: "Silakan bayar tunai di kasir atau ke kurir." });
        router.replace(`/pesanan/${order.code}?phone=${phone4}`);
      } else {
        router.replace(`/pesanan/${order.code}/bayar?phone=${phone4}`);
      }
    } catch (e) {
      applyServerErrors(e);
    }
  };

  const onWhatsApp = handleSubmit((values) => {
    const payload = buildPayload(values);
    if (!payload) return;
    const win = openPendingWindow();
    waOrder.mutate(
      { payload, idempotencyKey: `wa-${nonce.current}-${hashString(JSON.stringify(payload))}` },
      {
        onSuccess: (res) => {
          addRecent({ code: res.data.code, phone: res.data.customer_phone, total: res.data.total, createdAt: res.data.created_at });
          navigatePendingWindow(win, res.whatsapp_url);
          clear();
          toast.success("Pesanan tersimpan", { description: `Kode ${res.data.code}. Lanjutkan konfirmasi di WhatsApp.` });
          router.replace(`/pesanan/${res.data.code}?phone=${res.data.customer_phone.slice(-4)}`);
        },
        onError: (e) => {
          win?.close();
          applyServerErrors(e);
        },
      },
    );
  });

  if (!hydrated)
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]" aria-busy="true">
        <div className="flex flex-col gap-5"><Skeleton className="h-16 rounded-3xl lg:hidden" /><Skeleton className="h-80 rounded-3xl" /></div>
        <Skeleton className="hidden h-96 rounded-3xl lg:block" />
      </div>
    );

  if (count === 0 && !createOrder.isSuccess) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-surface p-10 text-center">
        <p className="text-h3">Keranjang masih kosong</p>
        <p className="mt-2 text-muted">Tambahkan menu terlebih dahulu sebelum checkout.</p>
        <Link href="/menu" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary">Jelajahi Menu</Link>
      </div>
    );
  }

  const minSchedule = toLocalInput(new Date(Date.now() + 30 * 60_000));
  const busy = isSubmitting || createOrder.isPending || payOrder.isPending;
  const deliveryLabel = v.fulfillment === "delivery" ? (q ? formatRupiah(q.delivery_fee) : "Tandai lokasi di peta") : "Gratis";
  const payLabel = v.paymentMethod === "cash" ? "Buat Pesanan" : `Bayar ${formatRupiah(totals.total)}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 items-start gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_400px] lg:pb-0">
      <div className="flex flex-col gap-5">
        <MobileOrderSummary
          lines={lines}
          count={count}
          totals={totals}
          deliveryLabel={deliveryLabel}
          open={summaryOpen}
          onOpenChange={setSummaryOpen}
          extra={q?.promotion ? <p className="text-caption text-success">Voucher {q.promotion.code} diterapkan</p> : undefined}
        />
        <Section step={1} title="Data pemesan">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nama" autoComplete="name" autoCapitalize="words" enterKeyHint="next" required error={errors.name?.message} {...register("name")} />
            <Input label="Nomor WhatsApp" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" placeholder="0812-3456-7890" required hint="Untuk konfirmasi & lacak pesanan" error={errors.phone?.message} {...register("phone")} />
          </div>
          {!customer && (
            <p className="mt-3 text-caption text-muted">
              Punya akun? <Link href="/masuk?next=/checkout" className="font-semibold text-primary hover:underline">Masuk</Link> untuk tukar poin & pakai alamat tersimpan.
            </p>
          )}
        </Section>

        <Section step={2} title="Pengambilan">
          <div className="flex flex-col gap-4">
            <OutletPicker id="checkout-outlet" />
            <FulfillmentPicker value={v.fulfillment} onChange={(f) => setValue("fulfillment", f, { shouldValidate: true })} />
            {v.fulfillment === "delivery" && (
              <div className="flex flex-col gap-4 rounded-2xl bg-cream/40 p-4">
                {addresses.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-ink">Alamat tersimpan</p>
                    <div className="scrollbar-none flex gap-2 overflow-x-auto">
                      {addresses.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setValue("address", a.address, { shouldValidate: true });
                            setValue("addressNote", a.note ?? "");
                            if (a.lat != null && a.lng != null) {
                              setValue("lat", a.lat, { shouldValidate: true });
                              setValue("lng", a.lng);
                            }
                          }}
                          className="shrink-0 rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm hover:border-primary"
                        >
                          <span className="block font-semibold text-ink">{a.label}</span>
                          <span className="line-clamp-1 max-w-52 text-caption text-muted">{a.address}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <AddressMap
                  value={v.lat != null && v.lng != null ? { lat: v.lat, lng: v.lng } : null}
                  onChange={(lat, lng) => {
                    setValue("lat", lat, { shouldValidate: true });
                    setValue("lng", lng);
                  }}
                  outlet={outlet ? { lat: outlet.lat, lng: outlet.lng, radiusKm: outlet.delivery_radius_km, name: outlet.name } : null}
                  error={addressError}
                />
                <Textarea label="Alamat lengkap" rows={2} autoComplete="street-address" placeholder="Nama jalan, nomor rumah, RT/RW, patokan" required error={errors.address?.message} {...register("address")} />
                <Input label="Catatan untuk kurir" placeholder="Pagar hitam, titip satpam" {...register("addressNote")} />
                {q && q.delivery_distance_km != null && (
                  <p className="text-sm text-ink" role="status">Jarak {q.delivery_distance_km} km · ongkir <b>{formatRupiah(q.delivery_fee)}</b></p>
                )}
              </div>
            )}
          </div>
        </Section>

        <Section step={3} title="Waktu">
          <fieldset>
            <legend className="sr-only">Waktu pesanan</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <ChoiceCard name="schedule" value="now" checked={v.schedule === "now"} onChange={() => setValue("schedule", "now")} title="Sekarang" description="Diproses segera" icon={<Clock className="size-5" aria-hidden="true" />} />
              <ChoiceCard name="schedule" value="later" checked={v.schedule === "later"} onChange={() => setValue("schedule", "later")} title="Jadwalkan" description="Pilih jam" icon={<CalendarClock className="size-5" aria-hidden="true" />} />
            </div>
          </fieldset>
          {v.schedule === "later" && (
            <Input
              className="mt-4"
              label="Tanggal & jam"
              type="datetime-local"
              min={minSchedule}
              required
              hint={outlet ? `Jam buka ${outlet.open_time.slice(0, 5)}–${outlet.close_time.slice(0, 5)} WIB` : undefined}
              error={errors.scheduledAt?.message}
              {...register("scheduledAt")}
            />
          )}
        </Section>

        <Section step={4} title="Pembayaran">
          <PaymentMethodPicker
            method={v.paymentMethod}
            channel={v.paymentChannel}
            onMethod={(m) => {
              setValue("paymentMethod", m);
              setValue("paymentChannel", m === "ewallet" ? "gopay" : m === "bank_transfer" ? "bca" : undefined);
            }}
            onChannel={(c) => setValue("paymentChannel", c, { shouldValidate: true })}
            channelError={errors.paymentChannel?.message}
          />
          <Textarea className="mt-4" label="Catatan pesanan (opsional)" rows={2} maxLength={500} placeholder="Contoh: tolong sedotan kertas" error={errors.note?.message} {...register("note")} />
        </Section>
        <div className="flex flex-col gap-3 lg:hidden">
          {quoteError && isApiError(quoteError) && !quoteError.field("promo_code") && !quoteError.field("redeem_points") && (
            <p role="alert" className="flex gap-2 rounded-xl bg-danger/8 p-3 text-caption text-danger"><AlertCircle className="size-4 shrink-0" aria-hidden="true" />{quoteError.message}</p>
          )}
          <Button type="button" variant="whatsapp" size="lg" className="w-full" onClick={onWhatsApp} loading={waOrder.isPending}>
            <WhatsAppIcon className="size-5" /> Pesan via WhatsApp
          </Button>
          <p className="text-center text-caption text-muted">Total final dihitung ulang oleh sistem Kamee. Pesanan non-tunai otomatis batal bila tidak dibayar dalam 15 menit.</p>
        </div>
      </div>

      <MobilePayBar
        total={totals.total}
        label={payLabel}
        busy={busy}
        onShowSummary={() => {
          setSummaryOpen(true);
          document.getElementById("ringkasan-pesanan")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      >
        <Button type="submit" size="lg" className="w-full" loading={busy} data-testid="submit-order">
          {!busy && <Lock className="size-4" aria-hidden="true" />}
          {v.paymentMethod === "cash" ? "Buat Pesanan" : "Bayar Sekarang"}
        </Button>
      </MobilePayBar>

      <div className="hidden flex-col gap-4 lg:sticky lg:top-24 lg:flex">
        <section aria-label="Item pesanan" className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-heading text-lg font-semibold text-ink">Pesananmu ({count})</h2>
          <ul className="mt-3 flex max-h-64 flex-col gap-3 overflow-y-auto">
            {lines.map((l) => (
              <li key={l.lineId} className="flex gap-3">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-cream">{l.image && <Image src={l.image} alt="" fill sizes="48px" className="object-cover" />}</span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-medium text-ink">{l.qty}× {l.name}</span>
                  {l.options.length > 0 && <span className="line-clamp-1 text-caption text-muted">{l.options.map((o) => o.name).join(" · ")}</span>}
                </span>
                <span className="text-sm font-semibold text-ink">{formatRupiah(l.unitPrice * l.qty)}</span>
              </li>
            ))}
          </ul>
        </section>

        <CartSummary
          totals={totals}
          deliveryLabel={deliveryLabel}
        >
          {q?.promotion && <p className="text-caption text-success">Voucher {q.promotion.code} diterapkan</p>}
          {quoteError && isApiError(quoteError) && !quoteError.field("promo_code") && !quoteError.field("redeem_points") && (
            <p role="alert" className="flex gap-2 rounded-xl bg-danger/8 p-3 text-caption text-danger"><AlertCircle className="size-4 shrink-0" aria-hidden="true" />{quoteError.message}</p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={busy} data-testid="submit-order">
            {!busy && <Lock className="size-4" aria-hidden="true" />}
            {payLabel}
          </Button>
          <Button type="button" variant="whatsapp" size="lg" className="w-full" onClick={onWhatsApp} loading={waOrder.isPending}>
            <WhatsAppIcon className="size-5" /> Pesan via WhatsApp
          </Button>
          <p className="text-center text-caption text-muted">Total final dihitung ulang oleh sistem Kamee. Pesanan non-tunai otomatis batal bila tidak dibayar dalam 15 menit.</p>
        </CartSummary>
      </div>
    </form>
  );
}
