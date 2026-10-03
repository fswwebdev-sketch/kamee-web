"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Info, PiggyBank, Scale, ShoppingBag, TrendingUp } from "lucide-react";
import { DataTable } from "@/components/admin/ui/data-table";
import { DateRangeFilter, formatShort } from "@/components/admin/ui/filters";
import { OutletFilter } from "@/components/admin/ui/outlet-filter";
import { PageHeader, Panel } from "@/components/admin/ui/page-header";
import { usePeriod } from "@/components/admin/ui/use-period";
import { buttonClasses } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinanceSummary } from "@/lib/admin/finance-types";
import { useFinanceSummary } from "@/lib/admin/finance-queries";
import { useAdminSession, useEffectiveOutlet } from "@/lib/admin/queries";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { METHOD_ICON, Note } from "./shared";

const FinanceChart = dynamic(() => import("./finance-chart"), { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> });

type ProductRow = FinanceSummary["products"][number] & { rank: number };

function FinanceStat({ label, value, hint, icon, loading, tone = "neutral", testId }: { label: string; value?: ReactNode; hint?: ReactNode; icon: ReactNode; loading: boolean; tone?: "neutral" | "good" | "bad"; testId?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-soft md:p-5" data-testid={testId}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className="grid size-9 place-items-center rounded-xl bg-cream text-primary [&>svg]:size-[18px]" aria-hidden="true">{icon}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <p className={cn("font-heading text-[1.5rem] font-semibold leading-8 tabular-nums", tone === "bad" ? "text-danger" : "text-ink")}>{value}</p>
      )}
      <div className="min-h-5 text-caption text-muted">{loading ? <Skeleton className="h-4 w-40" /> : hint}</div>
    </div>
  );
}

/** Daftar nilai dengan bar proporsional (bukan warna saja: nominal & persen tertulis). */
function BreakdownList({ rows, total, label, empty, testId }: { rows: { key: string; label: ReactNode; amount: number; sub?: ReactNode; icon?: ReactNode }[]; total: number; label: string; empty: string; testId?: string }) {
  if (!rows.length || total <= 0) return <p className="py-4 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3.5" aria-label={label} data-testid={testId}>
      {rows.map((r) => {
        const pct = total > 0 ? (r.amount / total) * 100 : 0;
        return (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                {r.icon && <span className="text-primary" aria-hidden="true">{r.icon}</span>}
                <span className="truncate">{r.label}</span>
              </span>
              <span className="shrink-0 font-semibold text-ink tabular-nums">{formatRupiah(r.amount)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 1)}%` }} />
              </div>
              <span className="w-12 text-right text-caption text-muted tabular-nums">{pct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</span>
            </div>
            {r.sub && <p className="mt-0.5 text-caption text-muted">{r.sub}</p>}
          </li>
        );
      })}
    </ul>
  );
}

export function FinanceSummaryView() {
  const { data: user } = useAdminSession();
  const outletId = useEffectiveOutlet(user);
  const [period, setPeriod] = usePeriod("month");
  const summary = useFinanceSummary({ from: period.from, to: period.to, outlet_id: outletId });
  // useFinanceSummary tidak memberi tipe eksplisit pada useQuery (keepPreviousData melebar tipenya)
  const d = summary.data as FinanceSummary | undefined;
  const loading = !d && !summary.isError;
  const rangeText = period.from === period.to ? formatShort(period.from) : `${formatShort(period.from)} – ${formatShort(period.to)}`;

  const products = useMemo<ProductRow[]>(() => [...(d?.products ?? [])].sort((a, b) => b.qty - a.qty).map((p, i) => ({ ...p, rank: i + 1 })), [d]);

  const columns = useMemo<ColumnDef<ProductRow, unknown>[]>(
    () => [
      { id: "rank", header: "#", meta: { className: "w-10" }, cell: ({ row }) => <span className="font-semibold text-muted tabular-nums">{row.original.rank}</span> },
      {
        id: "name",
        header: "Menu",
        cell: ({ row }) => (
          <div className="min-w-36">
            <p className="font-semibold text-ink">{row.original.name}</p>
            <p className="text-caption text-muted">{row.original.category}</p>
          </div>
        ),
      },
      { id: "qty", accessorKey: "qty", header: "Terjual", enableSorting: true, meta: { align: "right" }, cell: ({ row }) => formatNumber(row.original.qty) },
      {
        id: "variants",
        header: "Per ukuran",
        meta: { className: "min-w-40" },
        cell: ({ row }) => {
          const v = row.original.variants.filter((x) => x.qty > 0);
          if (!v.length || (v.length === 1 && !v[0]!.option_name)) return <span className="text-muted">—</span>;
          return (
            <ul className="flex flex-col gap-0.5 text-caption">
              {v.map((x) => (
                <li key={x.option_name ?? "-"} className="flex justify-between gap-3 tabular-nums">
                  <span className="text-ink">{x.option_name ?? "Tanpa ukuran"}</span>
                  <span className="text-muted">{formatNumber(x.qty)} · {formatRupiah(x.revenue)}</span>
                </li>
              ))}
            </ul>
          );
        },
      },
      { id: "revenue", accessorKey: "revenue", header: "Omzet", enableSorting: true, meta: { align: "right" }, cell: ({ row }) => formatRupiah(row.original.revenue) },
      { id: "hpp", accessorKey: "hpp", header: "HPP", enableSorting: true, meta: { align: "right" }, cell: ({ row }) => formatRupiah(row.original.hpp) },
      {
        id: "profit",
        accessorKey: "profit",
        header: "Laba",
        enableSorting: true,
        meta: { align: "right" },
        cell: ({ row }) => <span className={cn("font-semibold", row.original.profit < 0 ? "text-danger" : "text-ink")}>{formatRupiah(row.original.profit)}</span>,
      },
    ],
    [],
  );

  const incomeRows = (d?.income_by_method ?? [])
    .filter((m) => m.amount > 0)
    .map((m) => {
      const sales = d?.sales.by_method.find((x) => x.method === m.method)?.amount ?? 0;
      const other = d?.other_income.by_method.find((x) => x.method === m.method)?.amount ?? 0;
      return { key: m.method, label: m.label, amount: m.amount, icon: METHOD_ICON[m.method], sub: `Pesanan ${formatRupiah(sales)} · Buku kas ${formatRupiah(other)}` };
    });
  const expenseRows = (d?.expenses.by_category ?? []).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount).map((c) => ({ key: c.category, label: c.label, amount: c.amount }));
  // Penjualan yang dicatat di buku kas tidak punya HPP → perkiraan laba bersih terlalu tinggi
  const bookSales = d?.other_income.by_category.find((c) => c.category === "penjualan")?.amount ?? 0;
  const otherRows = (d?.other_income.by_category ?? []).filter((c) => c.amount > 0).map((c) => ({ key: c.category, label: c.label, amount: c.amount }));

  return (
    <>
      <PageHeader
        title="Ringkasan keuangan"
        description={rangeText}
        actions={
          <>
            <Link href="/admin/keuangan/kas" className={buttonClasses("outline", "sm")}>Buku kas</Link>
            <Link href="/admin/kasir" className={buttonClasses("primary", "sm")}>Buka kasir</Link>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-3 shadow-soft md:p-4" role="group" aria-label="Filter periode">
        {user && <OutletFilter user={user} />}
        <DateRangeFilter preset={period.preset} from={period.from} to={period.to} onChange={setPeriod} />
      </div>

      {summary.isError ? (
        <ErrorState description="Ringkasan keuangan tidak dapat dimuat." onRetry={() => summary.refetch()} />
      ) : (
        <div className={cn("flex flex-col gap-5", summary.isFetching && !loading && "opacity-80 transition-opacity")} aria-busy={summary.isFetching}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <FinanceStat
              label="Pemasukan total"
              icon={<ArrowDownCircle />}
              loading={loading}
              value={d && formatRupiah(d.income_total)}
              hint={d && `Penjualan ${formatRupiah(d.sales.total)} + lain-lain ${formatRupiah(d.other_income.total)}`}
              testId="stat-income"
            />
            <FinanceStat
              label="Penjualan (pesanan)"
              icon={<ShoppingBag />}
              loading={loading}
              value={d && formatRupiah(d.sales.total)}
              hint={d && `${formatNumber(d.sales.orders_count)} pesanan · ${formatNumber(d.sales.items_count)} item`}
            />
            <FinanceStat
              label="Pengeluaran"
              icon={<ArrowUpCircle />}
              loading={loading}
              value={d && formatRupiah(d.expenses.total)}
              hint={d && `Belanja stok ${formatRupiah(d.stock_purchases_total)} · operasional ${formatRupiah(d.operating_expenses)}`}
              testId="stat-expense"
            />
            <FinanceStat
              label="Laba kotor"
              icon={<TrendingUp />}
              loading={loading}
              value={d && formatRupiah(d.gross_profit)}
              tone={d && d.gross_profit < 0 ? "bad" : "neutral"}
              hint={d && `Penjualan − HPP ${formatRupiah(d.hpp_total)}`}
            />
            <FinanceStat
              label="Perkiraan laba bersih"
              icon={<PiggyBank />}
              loading={loading}
              value={d && formatRupiah(d.net_profit_estimate)}
              tone={d && d.net_profit_estimate < 0 ? "bad" : "neutral"}
              hint={
                <>
                  {bookSales > 0 && (
                    <span className="mb-1 flex items-start gap-1 font-medium text-[#7A4500] dark:text-warning" data-testid="net-profit-caveat">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      Penjualan dari buku kas belum dikurangi HPP — laba sebenarnya lebih kecil.
                    </span>
                  )}
                  Laba kotor + pemasukan lain (non-modal) − biaya operasional
                </>
              }
            />
            <FinanceStat
              label="Arus kas"
              icon={<Scale />}
              loading={loading}
              value={d && formatRupiah(d.cash_flow)}
              tone={d && d.cash_flow < 0 ? "bad" : "neutral"}
              hint="Semua uang masuk − semua uang keluar"
            />
          </div>

          {d && d.missing_recipes.length > 0 && (
            <Note tone="warning" icon={<AlertTriangle />}>
              <p className="font-semibold">Menu terjual tanpa resep — HPP dianggap Rp0</p>
              <p className="mt-0.5 text-muted">{d.missing_recipes.join(", ")}</p>
              <Link href="/admin/resep" className="mt-1 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline md:min-h-0">
                Lengkapi resep di Resep &amp; HPP
              </Link>
            </Note>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Pemasukan per metode" description="Pesanan terbayar + pemasukan di buku kas">
              {loading ? <Skeleton className="h-32" /> : <BreakdownList rows={incomeRows} total={d!.income_total} label="Pemasukan per metode" empty="Belum ada pemasukan." testId="income-by-method" />}
              {otherRows.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-ink">Pemasukan dari buku kas</h3>
                  <BreakdownList rows={otherRows} total={d!.other_income.total} label="Pemasukan buku kas per kategori" empty="" />
                </div>
              )}
            </Panel>
            <Panel title="Pengeluaran per kategori" description={d ? `Total ${formatRupiah(d.expenses.total)}` : " "}>
              {loading ? <Skeleton className="h-32" /> : <BreakdownList rows={expenseRows} total={d!.expenses.total} label="Pengeluaran per kategori" empty="Belum ada pengeluaran." testId="expense-by-category" />}
            </Panel>
          </div>

          <Panel title="Arus harian" description="Pemasukan (penjualan + pemasukan lain) dibanding pengeluaran per hari">
            {!d ? (
              <Skeleton className="h-[300px] rounded-xl" />
            ) : (
              <div
                className="[&_.recharts-surface]:outline-none"
                role="img"
                aria-label={`Grafik harian ${rangeText}: pemasukan ${formatRupiah(d.income_total)}, pengeluaran ${formatRupiah(d.expenses.total)}.`}
              >
                <FinanceChart daily={d.daily} />
              </div>
            )}
          </Panel>

          <section aria-labelledby="menu-terlaris">
            <h2 id="menu-terlaris" className="mb-3 font-heading text-base font-semibold text-ink">Menu terlaris</h2>
            <DataTable
              caption={`Menu terlaris ${rangeText}`}
              columns={columns}
              data={products}
              loading={loading}
              getRowId={(r) => String(r.product_id)}
              empty={{ title: "Belum ada menu terjual", description: "Penjualan dari pesanan (web, WhatsApp, kasir) akan tampil di sini." }}
            />
          </section>

          <Note icon={<Info />}>
            <p className="font-semibold">Cara menghitung</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-muted">
              <li><strong className="text-ink">HPP</strong> = jumlah terjual × HPP resep saat ini (takaran bahan × harga per unit). Menu tanpa resep dihitung Rp0.</li>
              <li><strong className="text-ink">Laba kotor</strong> = penjualan pesanan − HPP.</li>
              <li><strong className="text-ink">Perkiraan laba bersih</strong> = laba kotor + pemasukan lain (bukan modal) − biaya operasional. Belanja bahan &amp; kemasan <em>bukan</em> biaya operasional karena sudah tercermin di HPP.</li>
              <li>Penjualan yang dicatat di buku kas tidak punya rincian menu, sehingga tidak masuk tabel menu terlaris maupun HPP.</li>
              <li>Agar HPP, laba, dan menu terlaris lengkap, catat penjualan langsung lewat <Link href="/admin/kasir" className="font-semibold text-primary underline-offset-2 hover:underline">Kasir</Link>, bukan sebagai pemasukan di buku kas.</li>
              <li><strong className="text-ink">Arus kas</strong> = semua uang masuk − semua uang keluar (termasuk belanja stok dan modal).</li>
            </ul>
          </Note>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{d ? `Data ${rangeText} dimuat.` : ""}</span>
    </>
  );
}
