"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownCircle, ArrowUpCircle, PackageOpen } from "lucide-react";
import { confirm } from "@/components/admin/ui/confirm";
import { DataTable } from "@/components/admin/ui/data-table";
import { DateRangeFilter, FilterSelect, SearchInput, formatShort } from "@/components/admin/ui/filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RowActions } from "@/components/admin/ui/row-actions";
import { usePeriod } from "@/components/admin/ui/use-period";
import { useTableParams } from "@/components/admin/ui/use-table-params";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { BOOK_METHOD_LABEL, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type CashEntry, type CashType } from "@/lib/admin/finance-types";
import { useCashEntries, useDeleteCashEntry } from "@/lib/admin/finance-queries";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CashEntryDialog } from "./cash-entry-dialog";
import { SummaryTile, formatDay, methodText } from "./shared";

export function CashBook() {
  const [period, setPeriod] = usePeriod("month");
  const { params, update } = useTableParams({ perPage: 20, filterKeys: ["jenis", "metode", "kategori"] });
  const f = params.filters;
  const list = useCashEntries({
    from: period.from,
    to: period.to,
    type: f.jenis || undefined,
    method: f.metode || undefined,
    category: f.kategori || undefined,
    q: params.search || undefined,
    page: params.page,
    per_page: params.perPage,
  });
  const remove = useDeleteCashEntry();
  const [editing, setEditing] = useState<{ entry: CashEntry | null; type: CashType } | null>(null);

  const rows = useMemo(() => list.data?.data ?? [], [list.data]);
  const summary = list.data?.summary;
  const rangeText = period.from === period.to ? formatShort(period.from) : `${formatShort(period.from)} – ${formatShort(period.to)}`;
  const categories = f.jenis === "income" ? INCOME_CATEGORIES : f.jenis === "expense" ? EXPENSE_CATEGORIES : [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  const columns = useMemo<ColumnDef<CashEntry, unknown>[]>(
    () => [
      { id: "date", header: "Tanggal", meta: { className: "whitespace-nowrap" }, cell: ({ row }) => formatDay(row.original.date) },
      {
        id: "description",
        header: "Keterangan",
        meta: { className: "min-w-52" },
        cell: ({ row }) => {
          const e = row.original;
          return (
            <div>
              <p className="font-medium text-ink">{e.description}</p>
              {e.counterparty && <p className="text-caption text-muted">{e.type === "income" ? "Dari" : "Ke"} {e.counterparty}</p>}
              {e.note && <p className="text-caption italic text-muted">{e.note}</p>}
              {e.source === "stock_purchase" && (
                <Badge tone="primary" className="mt-1">
                  <PackageOpen className="size-3" aria-hidden="true" /> Dari belanja stok
                </Badge>
              )}
            </div>
          );
        },
      },
      { id: "category", header: "Kategori", meta: { className: "hidden md:table-cell whitespace-nowrap" }, cell: ({ row }) => row.original.category_label },
      { id: "method", header: "Metode", meta: { className: "whitespace-nowrap" }, cell: ({ row }) => methodText(row.original.method, row.original.bank) },
      {
        id: "in",
        header: "Masuk",
        meta: { align: "right", className: "whitespace-nowrap" },
        cell: ({ row }) => (row.original.type === "income" ? <span className="font-semibold text-success">+{formatRupiah(row.original.amount)}</span> : <span className="text-muted" aria-hidden="true">—</span>),
      },
      {
        id: "out",
        header: "Keluar",
        meta: { align: "right", className: "whitespace-nowrap" },
        cell: ({ row }) => (row.original.type === "expense" ? <span className="font-semibold text-danger">−{formatRupiah(row.original.amount)}</span> : <span className="text-muted" aria-hidden="true">—</span>),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        meta: { className: "w-24" },
        cell: ({ row }) => {
          const e = row.original;
          if (e.source === "stock_purchase")
            return (
              <div className="flex justify-end">
                <Link href="/admin/bahan?tab=belanja" className="inline-flex min-h-11 items-center rounded-lg px-2 text-caption font-semibold text-primary hover:bg-cream md:min-h-9" title="Ubah lewat menu Belanja stok">
                  Lihat belanja
                </Link>
              </div>
            );
          return (
            <RowActions
              label={e.description}
              onEdit={() => setEditing({ entry: e, type: e.type })}
              onDelete={async () => {
                const { ok } = await confirm({ title: "Hapus catatan kas?", description: `${e.description} · ${formatRupiah(e.amount)} (${formatDay(e.date)}). Ringkasan keuangan ikut berubah.` });
                if (ok) remove.mutate(e.id);
              }}
            />
          );
        },
      },
    ],
    [remove],
  );

  return (
    <>
      <PageHeader
        title="Buku kas"
        description="Catatan uang masuk & keluar di luar pesanan online/kasir — penjualan manual, modal, belanja, ongkir, gaji, dll."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing({ entry: null, type: "income" })}>
              <ArrowDownCircle className="size-4 text-success" aria-hidden="true" /> Uang masuk
            </Button>
            <Button size="sm" onClick={() => setEditing({ entry: null, type: "expense" })}>
              <ArrowUpCircle className="size-4" aria-hidden="true" /> Uang keluar
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3" aria-live="polite">
        {summary ? (
          <>
            <SummaryTile label="Masuk" value={formatRupiah(summary.income)} tone="in" hint={rangeText} testId="cash-income" />
            <SummaryTile label="Keluar" value={formatRupiah(summary.expense)} tone="out" hint={rangeText} testId="cash-expense" />
            <SummaryTile label="Saldo" value={formatRupiah(summary.balance)} tone={summary.balance < 0 ? "out" : "neutral"} hint="Masuk − keluar sesuai filter" testId="cash-balance" />
          </>
        ) : (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[92px] rounded-2xl" />)
        )}
      </div>

      {list.isError ? (
        <ErrorState description="Buku kas tidak dapat dimuat." onRetry={() => list.refetch()} />
      ) : (
        <DataTable
          caption={`Buku kas ${rangeText}`}
          columns={columns}
          data={rows}
          total={list.data?.meta.total ?? 0}
          loading={list.isLoading}
          fetching={list.isFetching}
          params={params}
          onParamsChange={update}
          getRowId={(r) => String(r.id)}
          toolbar={
            <>
              <DateRangeFilter preset={period.preset} from={period.from} to={period.to} onChange={setPeriod} />
              <FilterSelect label="Jenis" value={f.jenis ?? ""} onChange={(v) => update({ filters: { jenis: v, kategori: null } })}>
                <option value="">Semua</option>
                <option value="income">Masuk</option>
                <option value="expense">Keluar</option>
              </FilterSelect>
              <FilterSelect label="Metode" value={f.metode ?? ""} onChange={(v) => update({ filters: { metode: v } })}>
                <option value="">Semua metode</option>
                {Object.entries(BOOK_METHOD_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </FilterSelect>
              <FilterSelect label="Kategori" value={f.kategori ?? ""} onChange={(v) => update({ filters: { kategori: v } })}>
                <option value="">Semua kategori</option>
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </FilterSelect>
              <SearchInput value={params.search} onChange={(v) => update({ search: v })} placeholder="Cari keterangan / nama…" label="Cari catatan kas" className={cn("basis-full sm:basis-auto")} />
            </>
          }
          empty={{
            title: "Belum ada catatan",
            description: `Tidak ada catatan kas pada ${rangeText} dengan filter ini.`,
            action: <Button size="sm" onClick={() => setEditing({ entry: null, type: "expense" })}>Catat uang keluar</Button>,
          }}
        />
      )}

      <CashEntryDialog open={Boolean(editing)} entry={editing?.entry ?? null} initialType={editing?.type} onClose={() => setEditing(null)} />
    </>
  );
}
