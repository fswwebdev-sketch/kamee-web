"use client";

import Link from "next/link";
import { CalendarClock, ExternalLink, MapPin, MessageSquareText, Phone, Store, UserRound } from "lucide-react";
import { WhatsAppIcon } from "@/components/layout/whatsapp-float";
import { PaymentBadge, StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminItem, useAdminSession } from "@/lib/admin/queries";
import type { AdminOrder } from "@/lib/admin/types";
import { ORDER_STATUS_LABEL } from "@/lib/admin/types";
import { formatPhone, formatRupiah } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { ChannelTag, dateTimeShort } from "./order-columns";
import { OrderActionButtons } from "./order-actions";

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface p-4 md:p-5", className)}>
      <h3 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1 text-sm", strong && "border-t border-line pt-2.5 text-base")}>
      <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</dt>
      <dd className={cn("text-right tabular-nums text-ink", strong && "font-heading font-semibold")}>{value}</dd>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

/** Detail pesanan: item + opsi, pembayaran, pelanggan, log status, dan aksi. */
export function OrderDetail({ id, compact = false }: { id: number | string; compact?: boolean }) {
  const { data: user } = useAdminSession();
  const q = useAdminItem<AdminOrder>("orders", id);
  if (q.isPending || !user) return <OrderDetailSkeleton />;
  if (q.isError) return <ErrorState title="Pesanan tidak dapat dimuat" description={q.error.message} onRetry={() => q.refetch()} />;
  const o = q.data;
  const phoneLink = waLink(`Halo ${o.customer_name}, kami dari ${o.outlet?.name ?? "Kamee Coffee"} terkait pesanan ${o.code}.`, o.customer_phone);
  const logs = o.status_logs ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 md:p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {!compact && <h1 className="font-heading text-2xl font-bold tracking-wide text-ink">{o.code}</h1>}
            <StatusBadge status={o.status} label={o.status_label} />
            {o.payment && <PaymentBadge status={o.payment.status} label={`${o.payment.method_label} · ${o.payment.status_label}`} />}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted">
            <span>{dateTimeShort(o.created_at)}</span>
            <ChannelTag channel={o.channel} />
            <span className="inline-flex items-center gap-1"><Store className="size-3.5" aria-hidden="true" />{o.outlet?.name}</span>
          </p>
        </div>
        <OrderActionButtons order={o} user={user} size="md" />
      </div>

      {o.status === "cancelled" && o.cancelled_reason && (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-ink"><span className="font-semibold">Alasan pembatalan:</span> {o.cancelled_reason}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Section title={`Item (${o.items?.reduce((s, i) => s + i.qty, 0) ?? 0})`}>
            <ul className="divide-y divide-line">
              {o.items?.map((item) => (
                <li key={item.id} className="flex gap-3 py-3 first:pt-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cream font-heading text-sm font-semibold text-ink">{item.qty}×</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold text-ink">{item.product_name}</p>
                      <p className="shrink-0 font-semibold tabular-nums text-ink">{formatRupiah(item.subtotal)}</p>
                    </div>
                    {!!item.options?.length && (
                      <ul className="mt-1 flex flex-wrap gap-1.5">
                        {item.options.map((opt, i) => (
                          <li key={i} className="rounded-full bg-cream px-2 py-0.5 text-xs font-medium text-ink">
                            {opt.name}
                            {opt.price_delta > 0 && <span className="text-muted"> +{formatRupiah(opt.price_delta)}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.note && <p className="mt-1.5 flex items-start gap-1.5 text-sm text-ink"><MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />{item.note}</p>}
                    <p className="mt-1 text-caption text-muted">{formatRupiah(item.unit_price)} / item</p>
                  </div>
                </li>
              ))}
            </ul>
            {o.note && (
              <p className="mt-3 rounded-xl bg-warning/12 px-3.5 py-2.5 text-sm text-ink"><span className="font-semibold">Catatan pesanan:</span> {o.note}</p>
            )}
          </Section>

          <Section title="Ringkasan pembayaran">
            <dl>
              <Row label="Subtotal" value={formatRupiah(o.subtotal)} />
              {o.discount > 0 && <Row label="Diskon promo" value={`−${formatRupiah(o.discount)}`} />}
              {o.points_discount > 0 && <Row label={`Tukar ${o.points_redeemed} poin`} value={`−${formatRupiah(o.points_discount)}`} />}
              {o.delivery_fee > 0 && <Row label="Ongkir" value={formatRupiah(o.delivery_fee)} />}
              {o.service_fee > 0 && <Row label="Biaya layanan" value={formatRupiah(o.service_fee)} />}
              <Row label="Total" value={formatRupiah(o.total)} strong />
            </dl>
            {(o.payments?.length ?? 0) > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <caption className="mb-2 text-left text-caption font-semibold text-muted">Riwayat pembayaran</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                      <th scope="col" className="py-2 pr-3">Metode</th>
                      <th scope="col" className="py-2 pr-3">Status</th>
                      <th scope="col" className="py-2 pr-3">Referensi</th>
                      <th scope="col" className="py-2 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.payments!.map((p) => (
                      <tr key={p.id} className="border-b border-line last:border-0">
                        <td className="py-2 pr-3">
                          {p.method_label}
                          {p.va_number && <span className="block text-caption text-muted">VA {p.bank?.toUpperCase()} {p.va_number}</span>}
                        </td>
                        <td className="py-2 pr-3">
                          <PaymentBadge status={p.status} label={p.status_label} />
                          {p.paid_at && <span className="block text-caption text-muted">{dateTimeShort(p.paid_at)}</span>}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs text-muted">{p.reference ?? "—"}</td>
                        <td className="py-2 text-right tabular-nums">{formatRupiah(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          <Section title="Pelanggan">
            <div className="flex flex-col gap-2.5 text-sm">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <UserRound className="size-4 text-muted" aria-hidden="true" />
                {o.customer_id ? <Link href={`/admin/pelanggan/${o.customer_id}`} className="hover:text-primary hover:underline">{o.customer_name}</Link> : o.customer_name}
                {!o.customer_id && <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium">Tamu</span>}
              </p>
              <p className="flex items-center gap-2 text-ink"><Phone className="size-4 text-muted" aria-hidden="true" />{formatPhone(o.customer_phone)}</p>
              <p className="flex items-center gap-2 text-ink"><Store className="size-4 text-muted" aria-hidden="true" />{o.fulfillment_label}</p>
              {o.scheduled_at && <p className="flex items-center gap-2 text-ink"><CalendarClock className="size-4 text-muted" aria-hidden="true" />Dijadwalkan {dateTimeShort(o.scheduled_at)}</p>}
              {o.address && (
                <p className="flex items-start gap-2 text-ink">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                  <span>
                    {o.address}
                    {o.lat != null && o.lng != null && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${o.lat},${o.lng}`} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
                        Peta <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    )}
                  </span>
                </p>
              )}
              <a href={phoneLink} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "sm", "mt-1 self-start")}>
                <WhatsAppIcon className="size-4" /> Hubungi via WhatsApp
              </a>
            </div>
          </Section>

          <Section title="Log status">
            <ol className="relative flex flex-col gap-4 border-l-2 border-line pl-5">
              {[...logs].reverse().map((l, i) => (
                <li key={i} className="relative">
                  <span className={cn("absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-surface", i === 0 ? "bg-primary" : "bg-line")} aria-hidden="true" />
                  <p className="text-sm font-semibold text-ink">{ORDER_STATUS_LABEL[l.to_status]}</p>
                  <p className="text-caption text-muted">
                    <time dateTime={l.at}>{dateTimeShort(l.at)}</time>
                    {l.changed_by ? ` · oleh ${l.changed_by}` : " · sistem"}
                  </p>
                  {l.note && <p className="mt-0.5 text-sm text-ink/85">{l.note}</p>}
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
}
