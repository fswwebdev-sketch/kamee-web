"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { BarChart3, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { DataTable } from "@/components/admin/ui/data-table";
import { DateRangeFilter, formatShort } from "@/components/admin/ui/filters";
import { OutletFilter } from "@/components/admin/ui/outlet-filter";
import { PageHeader, Panel } from "@/components/admin/ui/page-header";
import { StatCard } from "@/components/admin/ui/stat-card";
import { usePeriod } from "@/components/admin/ui/use-period";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { can } from "@/lib/admin/permissions";
import { useAdminSession, useEffectiveOutlet, useOutletsRef, useSalesReport } from "@/lib/admin/queries";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ExportMenu } from "./export-menu";
import { reportColumns } from "./report-columns";
import { formatShare } from "./report-format";
import { DEFAULT_TAB, REPORT_TABS, isPeriodGroup, type ReportSlug } from "./report-types";

const ReportChart = dynamic(() => import("./report-chart"), { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> });

const PANEL_ID = "laporan-panel";

/** Catatan cara hitung bila jumlah baris tidak sama dengan total pendapatan pesanan. */
const BASIS_NOTE: Partial<Record<string, string>> = {
  product: "Pendapatan produk dihitung dari subtotal item (sebelum diskon, ongkir, dan biaya layanan), sehingga bisa berbeda dari total pendapatan pesanan.",
  payment_method: "Pendapatan per metode dihitung dari pembayaran yang lunas.",
};

export function ReportView() {
  const { data: user } = useAdminSession();
  const outletId = useEffectiveOutlet(user);
  const outlets = useOutletsRef(can(user, "outlets.switch"));
  const [period, setPeriod] = usePeriod("30d");
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Admin Outlet tidak melihat tab "Per outlet"
  const tabs = useMemo(() => REPORT_TABS.filter((t) => t.group !== "outlet" || !user || can(user, "outlets.switch")), [user]);
  const tab = tabs.find((t) => t.slug === sp.get("jenis")) ?? DEFAULT_TAB;

  const setTab = useCallback(
    (slug: string) => {
      const next = new URLSearchParams(sp.toString());
      if (slug === DEFAULT_TAB.slug) next.delete("jenis");
      else next.set("jenis", slug as ReportSlug);
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [sp, router, pathname],
  );

  const report = useSalesReport({ outlet_id: outletId, from: period.from, to: period.to, group_by: tab.group });
  // keepPreviousData: abaikan data tab lain saat berpindah tab agar kolom/grafik tidak salah bentuk
  const data = report.data?.group_by === tab.group ? report.data : undefined;
  const loading = !data && !report.isError;

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const maxShare = rows.reduce((m, r) => Math.max(m, r.share), 0);
  const columns = useMemo(() => reportColumns(tab, maxShare), [tab, maxShare]);
  const totals = data?.totals;
  const rowRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const rowQty = rows.reduce((s, r) => s + (r.qty ?? 0), 0);
  const empty = !!data && data.totals.orders === 0 && rowRevenue === 0;
  const aov = totals && totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0;

  const outletName = outletId ? (outlets.data?.find((o) => o.id === outletId)?.name ?? user?.outlet?.name ?? "Outlet") : "Semua outlet";
  const rangeText = period.from === period.to ? formatShort(period.from) : `${formatShort(period.from)} – ${formatShort(period.to)}`;
  const period_ = isPeriodGroup(tab.group);
  const chartTitle = period_ ? `Pendapatan ${tab.group === "day" ? "harian" : "bulanan"}` : tab.group === "product" ? "Top 10 produk berdasarkan pendapatan" : `Kontribusi pendapatan ${tab.label.toLowerCase()}`;
  const note = data && rowRevenue !== data.totals.revenue ? BASIS_NOTE[tab.group] : undefined;

  return (
    <>
      <PageHeader
        title="Laporan penjualan"
        description={`${outletName} · ${rangeText}`}
        actions={<ExportMenu tab={tab} outletId={outletId} from={period.from} to={period.to} />}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-3 shadow-soft md:p-4" role="group" aria-label="Filter laporan">
        {user && <OutletFilter user={user} />}
        <DateRangeFilter preset={period.preset} from={period.from} to={period.to} onChange={setPeriod} />
      </div>

      <Tabs label="Jenis laporan" items={tabs.map((t) => ({ id: t.slug, label: t.label }))} value={tab.slug} onChange={setTab} panelId={PANEL_ID} className="mb-5 w-full md:w-fit" />

      <div id={PANEL_ID} role="tabpanel" aria-label={tab.label} className="flex flex-col gap-5">
        {report.isError ? (
          <ErrorState description="Laporan tidak dapat dimuat. Coba lagi beberapa saat." onRetry={() => report.refetch()} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Total pendapatan" icon={<Wallet />} loading={loading} value={totals && formatRupiah(totals.revenue)} />
              <StatCard label="Total pesanan" icon={<ShoppingBag />} loading={loading} value={totals && formatNumber(totals.orders)} />
              <StatCard label="Rata-rata per pesanan" icon={<Receipt />} loading={loading} value={totals && formatRupiah(aov)} />
            </div>

            {empty ? (
              <EmptyState
                illustration={<BarChart3 className="size-10 text-muted" aria-hidden="true" />}
                title="Belum ada penjualan"
                description={`Tidak ada pesanan yang dihitung sebagai penjualan pada ${rangeText}. Coba pilih periode lain.`}
              />
            ) : (
              <>
                <Panel title={chartTitle} description={data ? (period_ ? `${formatRupiah(rowRevenue)} · ${rows.length} ${tab.noun}` : `${formatNumber(rows.length)} ${tab.noun} · arahkan kursor ke bar untuk rincian`) : " "}>
                  {!data ? (
                    <Skeleton className="h-[300px] rounded-xl" />
                  ) : (
                    <div
                      className={cn("[&_.recharts-surface]:outline-none", report.isFetching && "opacity-70 transition-opacity")}
                      role="img"
                      aria-label={`${chartTitle}, ${rangeText}. Total ${formatRupiah(rowRevenue)}. Rincian nilai tersedia di tabel di bawah.`}
                    >
                      <ReportChart rows={rows} group={tab.group} />
                    </div>
                  )}
                </Panel>

                <div>
                  <DataTable
                    key={tab.group}
                    caption={`Rincian laporan ${tab.label.toLowerCase()}, ${rangeText}`}
                    columns={columns}
                    data={rows}
                    loading={loading}
                    fetching={report.isFetching}
                    getRowId={(r) => r.key}
                    empty={{ title: "Belum ada data", description: "Tidak ada penjualan pada periode ini." }}
                    className="rounded-b-none"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-b-2xl border border-t-0 border-line bg-cream/50 px-4 py-3 text-sm shadow-soft" aria-live="polite">
                    <span className="font-heading font-semibold text-ink">Total</span>
                    {data ? (
                      <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 tabular-nums">
                        <div className="flex gap-1.5"><dt className="text-muted">Pesanan</dt><dd className="font-semibold text-ink">{formatNumber(data.totals.orders)}</dd></div>
                        {tab.group === "product" && <div className="flex gap-1.5"><dt className="text-muted">Qty</dt><dd className="font-semibold text-ink">{formatNumber(rowQty)}</dd></div>}
                        <div className="flex gap-1.5"><dt className="text-muted">Pendapatan</dt><dd className="font-semibold text-ink">{formatRupiah(rowRevenue)}</dd></div>
                        <div className="flex gap-1.5"><dt className="text-muted">Kontribusi</dt><dd className="font-semibold text-ink">{formatShare(rows.length ? 100 : 0)}</dd></div>
                      </dl>
                    ) : (
                      <Skeleton className="h-4 w-72" />
                    )}
                  </div>
                  {note && <p className="mt-2 text-caption text-muted">{note}</p>}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
