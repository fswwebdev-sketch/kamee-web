"use client";

import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { WhatsAppIcon } from "@/components/layout/whatsapp-float";
import { PaymentBadge, StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { useTrackOrder } from "@/lib/queries/orders";
import { waLink } from "@/lib/whatsapp";
import { OrderTracker } from "./order-tracker";

export function OrderDetail({ code, phone }: { code: string; phone: string }) {
  const { data: order, isLoading, error, refetch } = useTrackOrder(code, phone);

  if (isLoading) return <div className="flex flex-col gap-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40" /><Skeleton className="h-60" /></div>;
  if (error || !order) {
    const notFound = isApiError(error) && (error.status === 404 || error.status === 422);
    return (
      <ErrorState
        title={notFound ? "Pesanan tidak ditemukan" : "Gagal memuat pesanan"}
        description={notFound ? "Pastikan kode pesanan dan 4 digit terakhir nomor WhatsApp sudah benar." : undefined}
        onRetry={notFound ? undefined : () => refetch()}
      />
    );
  }

  const showPay = order.status === "pending" && order.payment?.method !== "cash" && order.channel !== "whatsapp";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption text-muted">Kode pesanan</p>
          <h1 className="font-heading text-2xl font-bold tracking-wide text-ink md:text-3xl">{order.code}</h1>
          <p className="mt-1 text-sm text-muted">{formatDateTime(order.created_at)} · {order.fulfillment_label}</p>
        </div>
        <StatusBadge status={order.status} label={order.status_label} />
      </div>

      <section className="rounded-3xl border border-line bg-surface p-5 md:p-6" aria-label="Status pesanan">
        <OrderTracker order={order} />
        <p className="mt-5 text-caption text-muted" aria-live="polite">Status diperbarui otomatis.</p>
        {showPay && (
          <Link href={`/pesanan/${order.code}/bayar?phone=${phone}`} className={buttonClasses("primary", "lg", "mt-4 w-full sm:w-auto")}>Lanjutkan Pembayaran</Link>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-line bg-surface p-5 md:p-6" aria-labelledby="rincian">
          <h2 id="rincian" className="font-heading text-lg font-semibold">Rincian</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {order.items?.map((it) => (
              <li key={it.id} className="flex justify-between gap-3">
                <span>
                  <span className="font-medium text-ink">{it.qty}× {it.product_name}</span>
                  {it.options?.length ? <span className="block text-caption text-muted">{it.options.map((o) => o.name.split(": ").pop()).join(" · ")}</span> : null}
                  {it.note && <span className="block text-caption text-muted">Catatan: {it.note}</span>}
                </span>
                <span className="font-medium text-ink">{formatRupiah(it.subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 flex flex-col gap-2 border-t border-dashed border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatRupiah(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Diskon</dt><dd className="text-success">−{formatRupiah(order.discount)}</dd></div>}
            {order.points_discount > 0 && <div className="flex justify-between"><dt className="text-muted">Poin ({order.points_redeemed})</dt><dd className="text-success">−{formatRupiah(order.points_discount)}</dd></div>}
            {order.delivery_fee > 0 && <div className="flex justify-between"><dt className="text-muted">Ongkir</dt><dd>{formatRupiah(order.delivery_fee)}</dd></div>}
            <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="font-heading text-lg text-primary">{formatRupiah(order.total)}</dd></div>
            {order.payment && <div className="flex items-center justify-between"><dt className="text-muted">Pembayaran</dt><dd className="flex items-center gap-2">{order.payment.method_label} <PaymentBadge status={order.payment.status} label={order.payment.status_label} /></dd></div>}
          </dl>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 md:p-6" aria-labelledby="info">
          <h2 id="info" className="font-heading text-lg font-semibold">Informasi</h2>
          {order.outlet && <p className="flex gap-2 text-sm"><Store className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> {order.outlet.name}</p>}
          {order.address && <p className="flex gap-2 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> {order.address}</p>}
          {order.note && <p className="text-sm text-muted">Catatan: {order.note}</p>}
          {order.outlet && (
            <a href={waLink(`Halo ${order.outlet.name}, saya mau tanya pesanan ${order.code}.`, order.outlet.phone_wa)} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "mt-auto")}>
              <WhatsAppIcon className="size-5" /> Hubungi outlet
            </a>
          )}
        </section>
      </div>
    </div>
  );
}
