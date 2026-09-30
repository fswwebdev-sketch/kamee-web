"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ReportRow } from "@/lib/admin/types";
import { formatNumber, formatRupiah } from "@/lib/format";
import { formatShare } from "./report-format";
import { isPeriodGroup, type ReportTab } from "./report-types";

/** Kolom tabel detail laporan (mode klien, sortable). */
export function reportColumns(tab: ReportTab, maxShare: number): ColumnDef<ReportRow, unknown>[] {
  // Bar kecil diskalakan terhadap kontribusi terbesar agar perbedaan terbaca; angka % tetap nilai sebenarnya
  const scale = maxShare > 0 ? 100 / maxShare : 0;
  const period = isPeriodGroup(tab.group);
  const cols: ColumnDef<ReportRow, unknown>[] = [
    {
      id: "label",
      header: tab.heading,
      // Periode diurutkan menurut kunci (YYYY-MM[-DD]) agar kronologis, bukan alfabetis nama hari
      accessorFn: (r) => (period ? r.key : r.label),
      enableSorting: true,
      sortingFn: period ? "basic" : "alphanumeric",
      cell: ({ row }) => <span className="font-medium text-ink">{row.original.label}</span>,
    },
    {
      id: "orders",
      header: "Pesanan",
      accessorKey: "orders",
      enableSorting: true,
      sortDescFirst: true,
      meta: { align: "right" },
      cell: ({ row }) => formatNumber(row.original.orders),
    },
  ];
  if (tab.group === "product") {
    cols.push({
      id: "qty",
      header: "Qty terjual",
      accessorFn: (r) => r.qty ?? 0,
      enableSorting: true,
      sortDescFirst: true,
      meta: { align: "right" },
      cell: ({ row }) => formatNumber(row.original.qty ?? 0),
    });
  }
  cols.push(
    {
      id: "revenue",
      header: "Pendapatan",
      accessorKey: "revenue",
      enableSorting: true,
      sortDescFirst: true,
      meta: { align: "right" },
      cell: ({ row }) => <span className="font-semibold">{formatRupiah(row.original.revenue)}</span>,
    },
    {
      id: "share",
      header: "Kontribusi",
      accessorKey: "share",
      enableSorting: true,
      sortDescFirst: true,
      meta: { align: "right", className: "lg:w-44" },
      cell: ({ row }) => (
        <span className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
          <span className="h-1.5 w-8 shrink-0 overflow-hidden rounded-full bg-line/70 lg:w-16" aria-hidden="true">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, row.original.share * scale))}%` }} />
          </span>
          <span className="w-12 tabular-nums text-ink">{formatShare(row.original.share)}</span>
        </span>
      ),
    },
  );
  return cols;
}
