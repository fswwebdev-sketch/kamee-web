"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, Receipt, ShoppingBag, Table2, UserPlus, Wallet } from "lucide-react";
import { DataTable } from "@/components/admin/ui/data-table";
import { DateRangeFilter, addDays, daysBetween, formatShort, previousRange } from "@/components/admin/ui/filters";
import { OutletFilter } from "@/components/admin/ui/outlet-filter";
import { PageHeader, Panel } from "@/components/admin/ui/page-header";
import { StatCard, percentChange } from "@/components/admin/ui/stat-card";
import { usePeriod } from "@/components/admin/ui/use-period";
import { orderColumns } from "@/components/admin/orders/order-columns";
import { buttonClasses } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminList, useAdminSession, useDashboardSummary, useEffectiveOutlet, useOutletsRef, useRevenue, useTopProducts } from "@/lib/admin/queries";
import type { AdminOrder, Paginated, RevenuePoint } from "@/lib/admin/types";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TopProducts } from "./top-products";
import { periodLabel } from "./revenue-chart";

const RevenueChart = dynamic(() => import("./revenue-chart"), { ssr: false, loading: () => <Skeleton className="h-[280px] rounded-xl" /> });

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: React.ReactNode }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-bg p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-sm font-medium transition", value === o.value ? "bg-primary text-on-primary shadow-soft" : "text-muted hover:text-ink")}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RevenueTable({ data, interval }: { data: RevenuePoint[]; interval: "day" | "month" }) {
  return (
    <div className="max-h-[280px] overflow-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <caption className="sr-only">Pendapatan per {interval === "day" ? "hari" : "bulan"}</caption>
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="px-3 py-2">{interval === "day" ? "Tanggal" : "Bulan"}</th>
            <th scope="col" className="px-3 py-2 text-right">Pesanan</th>
            <th scope="col" className="px-3 py-2 text-right">Pendapatan</th>
          </tr>
        </thead>
        <tbody>
          {[...data].reverse().map((d) => (
            <tr key={d.period} className="border-b border-line last:border-0">
              <td className="px-3 py-2">{periodLabel(d.period, interval, true)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(d.orders)}</td>
              <td className="px-3 py-2 text-right font-medium tabular-nums">{formatRupiah(d.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardView() {
  const { data: user } = useAdminSession();
  const outletId = useEffectiveOutlet(user);
  const [period, setPeriod] = usePeriod("30d");
  const [interval, setChartInterval] = useState<"day" | "month">("day");
  const [view, setView] = useState<"chart" | "table">("chart");
  const outlets = useOutletsRef(user?.role === "super_admin");

  const range = { outlet_id: outletId, from: period.from, to: period.to };
  const prev = previousRange(period.from, period.to);
  const summary = useDashboardSummary(range);
  const previous = useDashboardSummary({ outlet_id: outletId, ...prev });

  // Harian: minimal 14 hari agar grafik bermakna; Bulanan: 12 bulan terakhir s.d. akhir periode
  const dailyFrom = daysBetween(period.from, period.to) < 14 ? addDays(period.to, -13) : period.from;
  const monthlyFrom = `${String(Number(period.to.slice(0, 4)) - 1)}-${period.to.slice(5, 7)}-01`;
  const revenue = useRevenue({ outlet_id: outletId, from: interval === "day" ? dailyFrom : addDays(monthlyFrom, 31).slice(0, 8) + "01", to: period.to, interval });
  const top = useTopProducts({ ...range, limit: 5 });
  const recent = useAdminList<AdminOrder>("orders", { per_page: 8, sort: "-created_at", "filter[outlet_id]": outletId ?? undefined });

  const s = summary.data;
  const p = previous.data;
  const compare = `vs ${formatShort(prev.from)}–${formatShort(prev.to)}`;
  const outletName = outletId ? (outlets.data?.find((o) => o.id === outletId)?.name ?? user?.outlet?.name) : "Semua outlet";
  const columns = useMemo(() => orderColumns({ showOutlet: !outletId }).filter((c) => c.id !== "payment"), [outletId]);
  const recentRows = (recent.data as Paginated<AdminOrder> | undefined)?.data ?? [];

  const revenueTotal = revenue.data?.reduce((sum, d) => sum + d.revenue, 0) ?? 0;

  return (
    <>
      <PageHeader
        title={`Halo, ${user?.name.split(" ")[0] ?? "Admin"} 👋`}
        description={`${outletName} · ${period.from === period.to ? formatShort(period.from) : `${formatShort(period.from)} – ${formatShort(period.to)}`}`}
        actions={
          <Link href="/admin/laporan" className={buttonClasses("outline", "sm")}>
            <BarChart3 className="size-4" aria-hidden="true" /> Laporan lengkap
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-3 shadow-soft md:p-4" role="group" aria-label="Filter ringkasan">
        {user && <OutletFilter user={user} />}
        <DateRangeFilter preset={period.preset} from={period.from} to={period.to} onChange={setPeriod} />
      </div>

      {summary.isError ? (
        <ErrorState onRetry={() => summary.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total penjualan" icon={<Wallet />} loading={!s} value={s && formatRupiah(s.revenue)} delta={s && p ? percentChange(s.revenue, p.revenue) : undefined} compareLabel={compare} />
          <StatCard label="Total pesanan" icon={<ShoppingBag />} loading={!s} value={s && formatNumber(s.orders)} delta={s && p ? percentChange(s.orders, p.orders) : undefined} compareLabel={compare} />
          <StatCard label="Rata-rata per pesanan (AOV)" icon={<Receipt />} loading={!s} value={s && formatRupiah(s.average_order_value)} delta={s && p ? percentChange(s.average_order_value, p.average_order_value) : undefined} compareLabel={compare} />
          <StatCard label="Pelanggan baru" icon={<UserPlus />} loading={!s} value={s && formatNumber(s.new_customers)} delta={s && p ? percentChange(s.new_customers, p.new_customers) : undefined} compareLabel={compare} />
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title="Pendapatan"
          description={revenue.data ? `${formatRupiah(revenueTotal)} · ${interval === "day" ? `${revenue.data.length} hari` : "12 bulan terakhir"}` : " "}
          actions={
            <div className="flex flex-wrap gap-2">
              <Segmented label="Interval grafik" value={interval} onChange={setChartInterval} options={[{ value: "day", label: "Harian" }, { value: "month", label: "Bulanan" }]} />
              <Segmented
                label="Tampilan"
                value={view}
                onChange={setView}
                options={[
                  { value: "chart", label: "Grafik", icon: <BarChart3 className="size-3.5" aria-hidden="true" /> },
                  { value: "table", label: "Tabel", icon: <Table2 className="size-3.5" aria-hidden="true" /> },
                ]}
              />
            </div>
          }
        >
          {!revenue.data ? (
            <Skeleton className="h-[280px] rounded-xl" />
          ) : view === "chart" ? (
            <div className={cn(revenue.isFetching && "opacity-70 transition-opacity")} role="img" aria-label={`Grafik pendapatan ${interval === "day" ? "harian" : "bulanan"}, total ${formatRupiah(revenueTotal)}. Pilih Tabel untuk nilai rinci.`}>
              <RevenueChart data={revenue.data} interval={interval} />
            </div>
          ) : (
            <RevenueTable data={revenue.data} interval={interval} />
          )}
        </Panel>

        <Panel title="Top 5 produk terlaris" description="Berdasarkan jumlah terjual pada periode ini">
          <TopProducts data={top.data} loading={!top.data} />
        </Panel>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-ink">Pesanan terbaru</h2>
          <Link href="/admin/pesanan" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Semua pesanan <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <DataTable caption="Pesanan terbaru" columns={columns} data={recentRows} loading={recent.isPending} fetching={recent.isFetching} hidePagination empty={{ title: "Belum ada pesanan" }} />
      </div>
    </>
  );
}
