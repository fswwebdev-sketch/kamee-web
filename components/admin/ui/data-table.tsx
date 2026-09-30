"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TableParams } from "./use-table-params";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Kelas untuk <th>/<td>, mis. "hidden lg:table-cell" untuk kolom sekunder di tablet */
    className?: string;
    /** Kunci sort server (bila beda dari id kolom) */
    sortKey?: string;
    align?: "left" | "right" | "center";
  }
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** Total baris di server (mode server). */
  total?: number;
  loading?: boolean;
  /** Sedang memuat ulang dengan data lama masih tampil */
  fetching?: boolean;
  /** Mode server: state dikendalikan (URL). Tanpa ini → sort & paginasi di klien. */
  params?: TableParams;
  onParamsChange?: (patch: { page?: number; perPage?: number; sort?: string }) => void;
  getRowId?: (row: T) => string;
  /** Aktifkan checkbox & aksi massal */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  toolbar?: ReactNode;
  empty?: { title: string; description?: string; action?: ReactNode };
  onRowClick?: (row: T) => void;
  caption: string;
  className?: string;
  perPageOptions?: number[];
  hidePagination?: boolean;
}

function SortIcon({ dir }: { dir: false | "asc" | "desc" }) {
  if (dir === "asc") return <ArrowUp className="size-3.5" aria-hidden="true" />;
  if (dir === "desc") return <ArrowDown className="size-3.5" aria-hidden="true" />;
  return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />;
}

function pageList(page: number, last: number): (number | "…")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(last - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < last - 1) out.push("…");
  out.push(last);
  return out;
}

/**
 * Tabel data berbasis TanStack Table.
 * Mode server (params + total): sort/paginasi dikirim ke API (Spatie QueryBuilder).
 * Mode klien: untuk daftar kecil yang tidak dipaginasi server (kategori, outlet, …).
 */
export function DataTable<T>({
  columns: baseColumns,
  data,
  total,
  loading,
  fetching,
  params,
  onParamsChange,
  getRowId,
  bulkActions,
  toolbar,
  empty,
  onRowClick,
  caption,
  className,
  perPageOptions = [10, 20, 50],
  hidePagination,
}: DataTableProps<T>) {
  const server = Boolean(params);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [clientSorting, setClientSorting] = useState<SortingState>([]);
  const [clientPage, setClientPage] = useState({ pageIndex: 0, pageSize: perPageOptions[1] ?? 20 });

  const sorting: SortingState = useMemo(() => {
    if (!server) return clientSorting;
    if (!params?.sort) return [];
    const desc = params.sort.startsWith("-");
    const key = params.sort.replace(/^-/, "");
    const col = baseColumns.find((c) => (c.meta?.sortKey ?? c.id ?? (c as { accessorKey?: string }).accessorKey) === key);
    return [{ id: col?.id ?? (col as { accessorKey?: string } | undefined)?.accessorKey ?? key, desc }];
  }, [server, params?.sort, clientSorting, baseColumns]);

  // Reset pilihan saat data halaman berubah
  const dataKey = server ? `${params?.page}-${params?.perPage}-${params?.sort}-${params?.search}-${JSON.stringify(params?.filters)}` : "";
  useEffect(() => setRowSelection({}), [dataKey]);

  const columns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!bulkActions) return baseColumns;
    return [
      {
        id: "_select",
        enableSorting: false,
        meta: { className: "w-10" },
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Pilih semua baris di halaman ini"
            className="size-4 accent-[var(--color-primary)]"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomePageRowsSelected();
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label="Pilih baris"
            className="size-4 accent-[var(--color-primary)]"
            checked={row.getIsSelected()}
            onClick={(e) => e.stopPropagation()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      ...baseColumns,
    ];
  }, [baseColumns, bulkActions]);

  const table = useReactTable({
    data,
    columns,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: { sorting, rowSelection, ...(server ? {} : { pagination: clientPage }) },
    enableRowSelection: Boolean(bulkActions),
    onRowSelectionChange: setRowSelection,
    manualSorting: server,
    manualPagination: server,
    enableSortingRemoval: true,
    // Kolom harus mengaktifkan sort secara eksplisit (hanya yang didukung API)
    defaultColumn: { enableSorting: false },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (!server) return setClientSorting(next);
      const s = next[0];
      if (!s) return onParamsChange?.({ sort: "" });
      const col = baseColumns.find((c) => (c.id ?? (c as { accessorKey?: string }).accessorKey) === s.id);
      const key = col?.meta?.sortKey ?? s.id;
      onParamsChange?.({ sort: s.desc ? `-${key}` : key });
    },
    onPaginationChange: server ? undefined : setClientPage,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: server ? undefined : getSortedRowModel(),
    getPaginationRowModel: server || hidePagination ? undefined : getPaginationRowModel(),
  });

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
  const rows = table.getRowModel().rows;
  const totalRows = server ? total ?? 0 : data.length;
  const page = server ? params!.page : clientPage.pageIndex + 1;
  const perPage = server ? params!.perPage : clientPage.pageSize;
  const lastPage = Math.max(1, Math.ceil(totalRows / perPage));
  const from = totalRows === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(totalRows, page * perPage);

  const goTo = (p: number) => (server ? onParamsChange?.({ page: p }) : setClientPage((s) => ({ ...s, pageIndex: p - 1 })));
  const setPerPage = (n: number) => (server ? onParamsChange?.({ perPage: n }) : setClientPage({ pageIndex: 0, pageSize: n }));

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-line bg-surface shadow-soft", className)}>
      {toolbar && <div className="flex flex-wrap items-end gap-3 border-b border-line p-3 md:p-4">{toolbar}</div>}

      {bulkActions && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-cream/60 px-4 py-2.5" role="region" aria-label="Aksi massal">
          <span className="text-sm font-semibold text-ink">{selected.length} dipilih</span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions(selected, () => setRowSelection({}))}</div>
          <button type="button" onClick={() => setRowSelection({})} className="ml-auto text-sm font-medium text-muted hover:text-ink">Batal pilih</button>
        </div>
      )}

      <div className={cn("relative overflow-x-auto", fetching && !loading && "opacity-70 transition-opacity")} aria-busy={loading || fetching}>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-bg/60">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-line">
                {hg.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sortable = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : sortable ? "none" : undefined}
                      className={cn(
                        "whitespace-nowrap px-3 py-3 text-left xl:px-4 text-xs font-semibold uppercase tracking-wide text-muted",
                        meta?.align === "right" && "text-right",
                        meta?.align === "center" && "text-center",
                        meta?.className,
                      )}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn("-mx-1 inline-flex items-center gap-1.5 rounded px-1 uppercase hover:text-ink", dir && "text-ink", meta?.align === "right" && "flex-row-reverse")}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon dir={dir} />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: Math.min(perPage, 8) }, (_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {columns.map((c, j) => (
                      <td key={j} className={cn("px-3 py-3.5 xl:px-4", c.meta?.className)}>
                        <Skeleton className={cn("h-4", j === 0 ? "w-4" : "w-full max-w-40")} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className={cn(
                      "border-b border-line transition-colors last:border-0 data-[state=selected]:bg-cream/50",
                      onRowClick && "cursor-pointer hover:bg-cream/40",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "px-3 py-3 align-middle text-ink xl:px-4",
                            meta?.align === "right" && "text-right tabular-nums",
                            meta?.align === "center" && "text-center",
                            meta?.className,
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Inbox className="size-10 text-muted" aria-hidden="true" />
            <p className="mt-3 font-heading font-semibold text-ink">{empty?.title ?? "Belum ada data"}</p>
            {empty?.description && <p className="mt-1 max-w-sm text-sm text-muted">{empty.description}</p>}
            {empty?.action && <div className="mt-4">{empty.action}</div>}
          </div>
        )}
      </div>

      {!hidePagination && totalRows > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
          <p className="text-muted" aria-live="polite">
            Menampilkan <span className="font-semibold text-ink">{from}–{to}</span> dari <span className="font-semibold text-ink">{totalRows}</span>
          </p>
          <div className="flex items-center gap-3">
            <label className="hidden items-center gap-2 text-muted sm:flex">
              Per halaman
              <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="h-9 rounded-lg border border-line bg-bg px-2 text-ink">
                {perPageOptions.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <nav aria-label="Paginasi" className="flex items-center gap-1">
              <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya" className="grid size-9 place-items-center rounded-lg border border-line text-ink transition hover:border-primary disabled:opacity-40">
                <ChevronLeft className="size-4" />
              </button>
              {pageList(page, lastPage).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-1 text-muted" aria-hidden="true">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goTo(p)}
                    aria-current={p === page ? "page" : undefined}
                    aria-label={`Halaman ${p}`}
                    className={cn("hidden h-9 min-w-9 rounded-lg px-2 font-semibold transition sm:block", p === page ? "bg-primary text-on-primary" : "text-ink hover:bg-cream")}
                  >
                    {p}
                  </button>
                ),
              )}
              <span className="px-2 text-muted sm:hidden">{page}/{lastPage}</span>
              <button type="button" onClick={() => goTo(page + 1)} disabled={page >= lastPage} aria-label="Halaman berikutnya" className="grid size-9 place-items-center rounded-lg border border-line text-ink transition hover:border-primary disabled:opacity-40">
                <ChevronRight className="size-4" />
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
