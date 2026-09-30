"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, CheckCircle2, Coins, MapPin, MessageCircle, ReceiptText, ShoppingBag, Star, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/admin/ui/data-table";
import { PageHeader, Panel } from "@/components/admin/ui/page-header";
import { StatCard } from "@/components/admin/ui/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api";
import { can } from "@/lib/admin/permissions";
import { useAdminSession, useCustomerDetail } from "@/lib/admin/queries";
import type { AdminCustomer, Order } from "@/lib/admin/types";
import type { LoyaltyTier, LoyaltyTransaction } from "@/types/api";
import { formatDate, formatDateTime, formatNumber, formatPhone, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdjustPointsDialog } from "./adjust-points-dialog";
import { tierTone, useTierCatalog, waHref } from "./tiers";

/** stats.last_order_at dikirim mentah dari DB ("2026-09-29 09:53:00", WIB) — normalisasi ke ISO. */
function parseDbDate(v: string | null | undefined): string | null {
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(v) ? `${v.replace(" ", "T")}+07:00` : v;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function TierProgress({ customer, tiers }: { customer: AdminCustomer; tiers: LoyaltyTier[] }) {
  const tier = customer.tier;
  const next = tiers.find((t) => t.min_spend > customer.lifetime_spend && t.min_spend > (tier?.min_spend ?? -1));
  const floor = tier?.min_spend ?? 0;
  const pct = next ? Math.min(100, Math.max(0, ((customer.lifetime_spend - floor) / (next.min_spend - floor)) * 100)) : 100;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {tier ? <Badge tone={tierTone(tier.name)} className="text-sm">{tier.name}</Badge> : <Badge>Tanpa tier</Badge>}
        {tier && tier.point_multiplier !== 1 && <span className="text-caption text-muted">Poin {formatNumber(tier.point_multiplier)}×</span>}
      </div>
      {tier && tier.perks.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-ink">
          {tier.perks.map((p) => (
            <li key={p} className="flex gap-2"><Star className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />{p}</li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        {next ? (
          <>
            <div className="flex justify-between gap-3 text-caption text-muted">
              <span>Menuju <strong className="text-ink">{next.name}</strong></span>
              <span className="tabular-nums">{formatRupiah(customer.lifetime_spend)} / {formatRupiah(next.min_spend)}</span>
            </div>
            <div
              className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-cream"
              role="progressbar"
              aria-label={`Progres ke tier ${next.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
            >
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-caption text-muted">Kurang {formatRupiah(next.min_spend - customer.lifetime_spend)} lagi.</p>
          </>
        ) : (
          <p className="text-caption text-muted">Belum ada tier lebih tinggi yang tercatat untuk pelanggan ini.</p>
        )}
      </div>
    </div>
  );
}

function PointsHistory({ items }: { items: LoyaltyTransaction[] }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">Belum ada riwayat poin.</p>;
  return (
    <ol className="divide-y divide-line">
      {items.map((t) => (
        <li key={t.id} className="flex items-start justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">
              {t.type_label}
              {t.order_code && <span className="ml-1.5 font-normal text-muted">· {t.order_code}</span>}
            </p>
            {t.note && <p className="text-caption text-muted [overflow-wrap:anywhere]">{t.note}</p>}
            <p className="text-caption text-muted">{formatDateTime(t.created_at)}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("font-semibold tabular-nums", t.points > 0 ? "text-success" : "text-danger")}>
              {t.points > 0 ? "+" : "−"}{formatNumber(Math.abs(t.points))}
            </p>
            <p className="text-caption tabular-nums text-muted">Saldo {formatNumber(t.balance_after)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CustomerDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: user } = useAdminSession();
  const detail = useCustomerDetail(id);
  const [adjusting, setAdjusting] = useState(false);
  const customer = detail.data?.data;
  const tiers = useTierCatalog([customer?.tier]);

  const hasOutlet = Boolean(detail.data?.recent_orders.some((o) => o.outlet));

  const orderColumns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Kode",
        cell: ({ row }) => (
          <Link href={`/admin/pesanan/${row.original.id}`} className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: "created_at", header: "Tanggal", cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.created_at)}</span> },
      {
        id: "place",
        header: hasOutlet ? "Outlet · Layanan" : "Layanan",
        cell: ({ row }) => (
          <div className="text-sm">
            {hasOutlet && <p className="whitespace-nowrap text-ink">{row.original.outlet?.name.replace(/^Kamee Coffee\s+/i, "") ?? "—"}</p>}
            <p className="whitespace-nowrap text-caption text-muted">{row.original.fulfillment_label}</p>
          </div>
        ),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} label={row.original.status_label} /> },
      { accessorKey: "total", header: "Total", meta: { align: "right" }, cell: ({ row }) => <span className="font-semibold tabular-nums">{formatRupiah(row.original.total)}</span> },
    ],
    [hasOutlet],
  );

  if (detail.isError) {
    const notFound = isApiError(detail.error) && detail.error.status === 404;
    return (
      <>
        <PageHeader title="Detail pelanggan" breadcrumb={[{ label: "Pelanggan", href: "/admin/pelanggan" }, { label: "Detail" }]} />
        {notFound ? (
          <EmptyState title="Pelanggan tidak ditemukan" description="Data mungkin sudah dihapus." action={<Link href="/admin/pelanggan" className={buttonClasses("secondary")}>Kembali ke daftar</Link>} />
        ) : (
          <ErrorState onRetry={() => detail.refetch()} />
        )}
      </>
    );
  }

  if (!customer || !detail.data) {
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-16 w-72" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl lg:col-span-2" /></div>
      </div>
    );
  }

  const stats = customer.stats;
  const lastOrder = parseDbDate(stats?.last_order_at);
  const { recent_orders: orders, points_history: history } = detail.data;
  const canAdjust = can(user, "customers.adjustPoints");

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar name={customer.name} className="size-11" />
            <span className="min-w-0">{customer.name}</span>
          </span>
        }
        description={`Member sejak ${formatDate(customer.created_at)}`}
        breadcrumb={[{ label: "Pelanggan", href: "/admin/pelanggan" }, { label: customer.name }]}
        actions={
          <>
            <a href={waHref(customer.phone_wa)} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline", "md")}>
              <MessageCircle className="size-4" aria-hidden="true" /> Chat WhatsApp
            </a>
            {canAdjust && (
              <Button onClick={() => setAdjusting(true)}>
                <Coins className="size-4" aria-hidden="true" /> Koreksi poin
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total pesanan" value={formatNumber(stats?.orders_count ?? customer.orders_count ?? 0)} icon={<ReceiptText />} />
        <StatCard label="Pesanan selesai" value={formatNumber(stats?.completed_orders ?? 0)} icon={<CheckCircle2 />} />
        <StatCard label="Total transaksi" value={formatRupiah(stats?.total_spend ?? 0)} icon={<Wallet />} />
        <StatCard label="Pesanan terakhir" value={lastOrder ? formatDate(lastOrder, { day: "numeric", month: "short", year: "numeric" }) : "—"} icon={<CalendarClock />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Panel title="Profil">
            <dl className="-my-2 divide-y divide-line">
              <Row label="WhatsApp"><a href={waHref(customer.phone_wa)} target="_blank" rel="noopener noreferrer" className="tabular-nums text-primary hover:underline">{formatPhone(customer.phone_wa)}</a></Row>
              <Row label="Email">{customer.email ? <a href={`mailto:${customer.email}`} className="text-primary hover:underline">{customer.email}</a> : "—"}</Row>
              <Row label="Tanggal lahir">{customer.birth_date ? formatDate(customer.birth_date) : "—"}</Row>
              <Row label="Kode referal"><span className="font-mono">{customer.referral_code}</span></Row>
              <Row label="Total belanja (tier)">{formatRupiah(customer.lifetime_spend)}</Row>
            </dl>
          </Panel>
          <Panel title="Tier & saldo poin">
            <div className="mb-4 flex items-end justify-between gap-3 rounded-xl bg-cream/70 p-3.5">
              <div>
                <p className="text-caption text-muted">Saldo poin</p>
                <p className="font-heading text-2xl font-bold tabular-nums text-ink">{formatNumber(customer.points_balance)}</p>
              </div>
              {canAdjust && <Button size="sm" variant="secondary" onClick={() => setAdjusting(true)}>Koreksi</Button>}
            </div>
            <TierProgress customer={customer} tiers={tiers} />
          </Panel>
          <Panel title="Alamat tersimpan">
            {customer.addresses?.length ? (
              <ul className="space-y-3">
                {customer.addresses.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold text-ink">
                        {a.label} {a.is_default && <Badge tone="success" className="ml-1">Utama</Badge>}
                      </p>
                      <p className="text-muted [overflow-wrap:anywhere]">{a.address}</p>
                      {a.note && <p className="text-caption text-muted">Catatan: {a.note}</p>}
                      {a.lat != null && a.lng != null && (
                        <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noopener noreferrer" className="text-caption text-primary hover:underline">
                          Lihat di Google Maps
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Belum ada alamat tersimpan.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Panel title="Riwayat pembelian" description="10 pesanan terbaru" bodyClassName="p-0 md:p-0">
            <DataTable
              caption={`Riwayat pembelian ${customer.name}`}
              columns={orderColumns}
              data={orders}
              getRowId={(o) => String(o.id)}
              onRowClick={(o) => router.push(`/admin/pesanan/${o.id}`)}
              hidePagination
              className="rounded-none border-0 shadow-none"
              empty={{ title: "Belum ada pesanan", description: "Pelanggan ini belum pernah memesan." }}
            />
            {(stats?.orders_count ?? 0) > orders.length && (
              <p className="border-t border-line px-4 py-3 text-caption text-muted md:px-5">
                <ShoppingBag className="mr-1 inline size-3.5" aria-hidden="true" />
                Menampilkan {orders.length} dari {formatNumber(stats?.orders_count ?? 0)} pesanan.
              </p>
            )}
          </Panel>
          <Panel title="Riwayat poin" description="20 transaksi poin terakhir">
            <PointsHistory items={history} />
          </Panel>
        </div>
      </div>

      {canAdjust && <AdjustPointsDialog customer={customer} open={adjusting} onClose={() => setAdjusting(false)} />}
    </>
  );
}
