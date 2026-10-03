"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  ClipboardCheck,
  History,
  MoreVertical,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { confirm } from "@/components/admin/ui/confirm";
import { DataTable } from "@/components/admin/ui/data-table";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/admin/ui/dropdown";
import { SearchInput } from "@/components/admin/ui/filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RowActions } from "@/components/admin/ui/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import type { Ingredient, IngredientKind } from "@/lib/admin/finance-types";
import { useDeleteIngredient } from "@/lib/admin/finance-queries";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  IngredientDialog,
  MovementsDialog,
  OpnameDialog,
  UnitCostHelp,
} from "./ingredient-dialogs";
import { Note, formatQtyUnit, formatUnitCost } from "./shared";
import { useIngredientList } from "./hooks";
import { PurchaseDialog, PurchaseList } from "./stock-purchase";

type TabId = "bahan" | "kemasan" | "belanja";
const TABS: { id: TabId; label: string }[] = [
  { id: "bahan", label: "Bahan" },
  { id: "kemasan", label: "Kemasan" },
  { id: "belanja", label: "Riwayat belanja" },
];
const PANEL_ID = "bahan-panel";

const iconBtn =
  "grid size-9 place-items-center rounded-lg text-muted transition hover:bg-cream hover:text-ink";

export function IngredientsView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: TabId = (TABS.find((t) => t.id === sp.get("tab"))?.id ??
    "bahan") as TabId;
  const setTab = (id: string) => {
    const next = new URLSearchParams(sp.toString());
    if (id === "bahan") next.delete("tab");
    else next.set("tab", id);
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const list = useIngredientList();
  // Ponsel (< md): kartu, agar stok & harga per unit tidak tersembunyi di kanan tabel
  const remove = useDeleteIngredient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{
    ingredient: Ingredient | null;
    kind: IngredientKind;
  } | null>(null);
  const [opname, setOpname] = useState<Ingredient | null>(null);
  const [history, setHistory] = useState<Ingredient | null>(null);
  const [buying, setBuying] = useState(false);

  const all = useMemo(() => list.data ?? [], [list.data]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter(
      (i) => i.kind === tab && (!term || i.name.toLowerCase().includes(term)),
    );
  }, [all, tab, q]);
  const warnings = all.filter((i) => i.stock_qty <= 0 || i.low_stock);

  const askDelete = useCallback(
    async (i: Ingredient) => {
      const { ok } = await confirm({
        title: `Hapus ${i.name}?`,
        description:
          "Bahan dihapus dari daftar dan dari semua resep yang memakainya. Riwayat belanja tetap tersimpan.",
      });
      if (ok) remove.mutate(i.id);
    },
    [remove],
  );

  const columns = useMemo<ColumnDef<Ingredient, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Nama",
        enableSorting: true,
        meta: { className: "min-w-44" },
        cell: ({ row }) => {
          const i = row.original;
          return (
            <div>
              <p className="font-semibold text-ink">{i.name}</p>
              {i.note && (
                <p className="max-w-64 text-caption text-muted">{i.note}</p>
              )}
            </div>
          );
        },
      },
      {
        id: "pack",
        header: "Isi kemasan",
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => row.original.pack_label,
      },
      {
        id: "pack_price",
        accessorKey: "pack_price",
        header: "Harga kemasan",
        enableSorting: true,
        meta: { align: "right", className: "whitespace-nowrap" },
        cell: ({ row }) =>
          row.original.pack_price > 0 ? (
            formatRupiah(row.original.pack_price)
          ) : (
            <Badge tone="warning">Belum diisi</Badge>
          ),
      },
      {
        id: "cost",
        header: "Harga per unit",
        meta: { align: "right", className: "whitespace-nowrap" },
        cell: ({ row }) =>
          formatUnitCost(row.original.cost_per_unit, row.original.unit),
      },
      {
        id: "stock",
        accessorKey: "stock_qty",
        header: "Stok",
        enableSorting: true,
        meta: { align: "right", className: "whitespace-nowrap" },
        cell: ({ row }) => {
          const i = row.original;
          return (
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  i.stock_qty <= 0 ? "text-danger" : "text-ink",
                )}
                data-testid="stock-qty"
              >
                {formatQtyUnit(i.stock_qty, i.unit)}
              </span>
              {i.stock_qty <= 0 ? (
                <Badge tone="danger">Habis</Badge>
              ) : i.low_stock ? (
                <Badge tone="warning">Stok menipis</Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        meta: { className: "w-44" },
        cell: ({ row }) => {
          const i = row.original;
          return (
            <RowActions
              label={i.name}
              onEdit={() => setEditing({ ingredient: i, kind: i.kind })}
              onDelete={() => askDelete(i)}
            >
              <button
                type="button"
                className={iconBtn}
                onClick={() => setOpname(i)}
                aria-label={`Stok opname ${i.name}`}
                title="Stok opname"
              >
                <ClipboardCheck className="size-4" />
              </button>
              <button
                type="button"
                className={iconBtn}
                onClick={() => setHistory(i)}
                aria-label={`Riwayat stok ${i.name}`}
                title="Riwayat stok"
              >
                <History className="size-4" />
              </button>
            </RowActions>
          );
        },
      },
    ],
    [askDelete],
  );

  return (
    <>
      <PageHeader
        title="Bahan & stok"
        description="Daftar bahan baku & kemasan, harga beli, dan stok. Stok berkurang otomatis dari penjualan sesuai resep."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setEditing({
                  ingredient: null,
                  kind: tab === "kemasan" ? "kemasan" : "bahan",
                })
              }
            >
              <Plus className="size-4" aria-hidden="true" />{" "}
              {tab === "kemasan" ? "Tambah kemasan" : "Tambah bahan"}
            </Button>
            <Button size="sm" onClick={() => setBuying(true)}>
              <ShoppingCart className="size-4" aria-hidden="true" /> Catat
              belanja stok
            </Button>
          </>
        }
      />

      {warnings.length > 0 && (
        <Note tone="warning" icon={<AlertTriangle />} className="mb-4">
          <p className="font-semibold">{warnings.length} bahan perlu dicek</p>
          <p className="mt-0.5 text-muted">
            {warnings
              .map((w) => `${w.name} (${formatQtyUnit(w.stock_qty, w.unit)})`)
              .join(", ")}
          </p>
        </Note>
      )}

      <Tabs
        label="Kelompok"
        items={TABS}
        value={tab}
        onChange={setTab}
        panelId={PANEL_ID}
        className="mb-4 w-full md:w-fit"
      />

      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-label={TABS.find((t) => t.id === tab)!.label}
        className="flex flex-col gap-4"
      >
        {tab === "belanja" ? (
          <PurchaseList onCreate={() => setBuying(true)} />
        ) : list.isError ? (
          <ErrorState
            description="Daftar bahan tidak dapat dimuat."
            onRetry={() => list.refetch()}
          />
        ) : (
          <>
            {/* Ponsel: kartu; md ke atas: tabel. Diatur CSS agar tidak berkedip saat hidrasi. */}
            <div className="md:hidden">
              <IngredientCards
                rows={rows}
                loading={list.isLoading}
                q={q}
                onSearch={setQ}
                searchLabel={`Cari ${tab}`}
                emptyTitle={
                  q
                    ? "Tidak ditemukan"
                    : tab === "bahan"
                      ? "Belum ada bahan"
                      : "Belum ada kemasan"
                }
                onEdit={(i) => setEditing({ ingredient: i, kind: i.kind })}
                onOpname={setOpname}
                onHistory={setHistory}
                onDelete={askDelete}
              />
            </div>
            <div className="hidden md:block">
              <DataTable
                key={tab}
                caption={
                  tab === "bahan" ? "Daftar bahan baku" : "Daftar kemasan"
                }
                columns={columns}
                data={rows}
                loading={list.isLoading}
                fetching={list.isFetching}
                getRowId={(r) => String(r.id)}
                perPageOptions={[20, 50, 100]}
                toolbar={
                  <SearchInput
                    value={q}
                    onChange={setQ}
                    placeholder={`Cari ${tab}…`}
                    label={`Cari ${tab}`}
                  />
                }
                empty={{
                  title: q
                    ? "Tidak ditemukan"
                    : tab === "bahan"
                      ? "Belum ada bahan"
                      : "Belum ada kemasan",
                  description: q
                    ? "Coba kata kunci lain."
                    : "Tambahkan bahan beserta harga kemasan dan stok awal.",
                  action: !q ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        setEditing({
                          ingredient: null,
                          kind: tab === "kemasan" ? "kemasan" : "bahan",
                        })
                      }
                    >
                      {tab === "kemasan" ? "Tambah kemasan" : "Tambah bahan"}
                    </Button>
                  ) : undefined,
                }}
              />
            </div>
          </>
        )}
        <UnitCostHelp />
      </div>

      <IngredientDialog
        open={Boolean(editing)}
        ingredient={editing?.ingredient ?? null}
        initialKind={editing?.kind}
        onClose={() => setEditing(null)}
      />
      <OpnameDialog ingredient={opname} onClose={() => setOpname(null)} />
      <MovementsDialog ingredient={history} onClose={() => setHistory(null)} />
      <PurchaseDialog open={buying} onClose={() => setBuying(false)} />
    </>
  );
}

/* ------------------------------------------------------------------ Kartu (ponsel) */

function IngredientCards({
  rows,
  loading,
  q,
  onSearch,
  searchLabel,
  emptyTitle,
  onEdit,
  onOpname,
  onHistory,
  onDelete,
}: {
  rows: Ingredient[];
  loading: boolean;
  q: string;
  onSearch: (v: string) => void;
  searchLabel: string;
  emptyTitle: string;
  onEdit: (i: Ingredient) => void;
  onOpname: (i: Ingredient) => void;
  onHistory: (i: Ingredient) => void;
  onDelete: (i: Ingredient) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        value={q}
        onChange={onSearch}
        placeholder={`${searchLabel}…`}
        label={searchLabel}
        className="sm:max-w-none"
      />
      {loading ? (
        Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))
      ) : rows.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={
            q
              ? "Coba kata kunci lain."
              : "Tambahkan bahan beserta harga kemasan dan stok awal."
          }
        />
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Daftar bahan">
          {rows.map((i) => {
            const empty = i.stock_qty <= 0;
            return (
              <li
                key={i.id}
                className="rounded-2xl border border-line bg-surface p-4 shadow-soft"
                aria-label={i.name}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{i.name}</p>
                    <p className="text-caption text-muted">{i.pack_label}</p>
                  </div>
                  <Dropdown
                    ariaLabel={`Aksi ${i.name}`}
                    label={
                      <MoreVertical className="size-5" aria-hidden="true" />
                    }
                    buttonClassName="-mr-2 -mt-1 grid size-11 place-items-center rounded-lg text-muted transition hover:bg-cream hover:text-ink"
                  >
                    {(close) => (
                      <>
                        <DropdownItem
                          icon={<Pencil />}
                          onSelect={() => {
                            close();
                            onEdit(i);
                          }}
                        >
                          Ubah
                        </DropdownItem>
                        <DropdownItem
                          icon={<ClipboardCheck />}
                          onSelect={() => {
                            close();
                            onOpname(i);
                          }}
                        >
                          Stok opname
                        </DropdownItem>
                        <DropdownItem
                          icon={<History />}
                          onSelect={() => {
                            close();
                            onHistory(i);
                          }}
                        >
                          Riwayat stok
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem
                          icon={<Trash2 />}
                          danger
                          onSelect={() => {
                            close();
                            onDelete(i);
                          }}
                        >
                          Hapus
                        </DropdownItem>
                      </>
                    )}
                  </Dropdown>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                    <dt className="text-muted">Harga kemasan</dt>
                    <dd className="text-ink tabular-nums">
                      {i.pack_price > 0 ? (
                        formatRupiah(i.pack_price)
                      ) : (
                        <Badge tone="warning">Belum diisi</Badge>
                      )}
                    </dd>
                    <dt className="text-muted">Per unit</dt>
                    <dd className="text-ink tabular-nums">
                      {formatUnitCost(i.cost_per_unit, i.unit)}
                    </dd>
                  </dl>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-caption text-muted">Stok</span>
                    <span
                      className={cn(
                        "font-heading text-xl font-bold leading-6 tabular-nums",
                        empty
                          ? "text-danger"
                          : i.low_stock
                            ? "text-[#7A4500] dark:text-warning"
                            : "text-ink",
                      )}
                      data-testid="stock-qty-card"
                    >
                      {formatQtyUnit(i.stock_qty, i.unit)}
                    </span>
                    {empty ? (
                      <Badge tone="danger">Habis</Badge>
                    ) : i.low_stock ? (
                      <Badge tone="warning">Stok menipis</Badge>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
