"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Award, ChevronDown, Eye, EyeOff, Plus, Star, StarOff, Store, Trash2 } from "lucide-react";
import { confirm } from "@/components/admin/ui/confirm";
import { DataTable } from "@/components/admin/ui/data-table";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/admin/ui/dropdown";
import { FilterSelect, SearchInput } from "@/components/admin/ui/filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ActivePill, RowActions } from "@/components/admin/ui/row-actions";
import { toApiQuery, useTableParams } from "@/components/admin/ui/use-table-params";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/lib/admin/api";
import { can } from "@/lib/admin/permissions";
import { adminKeys, errorMessage, useAdminList, useAdminSave, useAdminSession } from "@/lib/admin/queries";
import type { AdminProduct, Category, Paginated, ProductBulkAction } from "@/lib/admin/types";
import { formatNumber, formatRupiah } from "@/lib/format";
import { useSetAvailability, useManagedOutlets, StockDialog, StockSummary } from "./product-stock";
import { ProductThumb } from "./product-thumb";

const FILTER_MAP = { kategori: "filter[category_id]", status: "filter[is_active]", terhapus: "filter[trashed]" };

const BULK_LABEL: Record<ProductBulkAction, string> = {
  activate: "diaktifkan",
  deactivate: "dinonaktifkan",
  feature: "dijadikan unggulan",
  unfeature: "dihapus dari unggulan",
  best_seller: "ditandai best seller",
  unbest_seller: "dihapus dari best seller",
  delete: "dihapus",
};

function useBulkProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { ids: number[]; action: ProductBulkAction }) =>
      adminApi<{ message: string; data: { action: ProductBulkAction; affected: number } }>("products/bulk", { method: "POST", body: v }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: adminKeys.resource("products") });
      toast.success(`${res.data.affected} produk ${BULK_LABEL[res.data.action]}.`);
    },
    onError: (e) => toast.error("Aksi massal gagal", { description: errorMessage(e) }),
  });
}

export function ProductList() {
  const router = useRouter();
  const { data: user } = useAdminSession();
  const manage = can(user, "catalog.manage");
  const isOutletAdmin = user?.role === "outlet_admin";
  const { params, update } = useTableParams({ perPage: 20, sort: "name", filterKeys: ["kategori", "status", "terhapus"] });

  const list = useAdminList<AdminProduct>("products", toApiQuery(params, FILTER_MAP));
  const page = list.data as Paginated<AdminProduct> | undefined;
  const rows = useMemo(() => page?.data ?? [], [page]);
  const categories = useAdminList<Category>("categories");
  const outlets = useManagedOutlets(user);
  const outletRows = outlets.data;

  const toggle = useAdminSave<AdminProduct>("products", { silent: true });
  const remove = useMutation({
    mutationFn: (id: number) => adminApi<{ message: string }>(`products/${id}`, { method: "DELETE" }),
  });
  const qc = useQueryClient();
  const bulk = useBulkProducts();
  const availability = useSetAvailability();
  const [stockId, setStockId] = useState<number | null>(null);
  const stockProduct = rows.find((r) => r.id === stockId) ?? null;

  const ownOutlet = isOutletAdmin ? outletRows[0] : undefined;

  const columns = useMemo<ColumnDef<AdminProduct, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Produk",
        enableSorting: true,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <ProductThumb src={p.image_url} alt={p.name} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="truncate text-caption text-muted">{p.category?.name ?? "Tanpa kategori"}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.deleted_at && <Badge tone="danger">Dihapus</Badge>}
                  {p.is_featured && <Badge tone="warning"><Star className="size-3" aria-hidden="true" /> Unggulan</Badge>}
                  {p.is_best_seller && <Badge tone="primary"><Award className="size-3" aria-hidden="true" /> Best seller</Badge>}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "base_price",
        header: "Harga",
        enableSorting: true,
        meta: { align: "right", className: "w-32" },
        cell: ({ row }) => <span className="font-semibold">{formatRupiah(row.original.base_price)}</span>,
      },
      {
        accessorKey: "sold_count",
        header: "Terjual",
        enableSorting: true,
        meta: { align: "right", className: "hidden w-24 lg:table-cell" },
        cell: ({ row }) => formatNumber(row.original.sold_count),
      },
      {
        id: "stock",
        header: isOutletAdmin ? "Stok outlet saya" : "Stok outlet",
        meta: { className: "w-44 xl:w-56" },
        cell: ({ row }) => {
          const p = row.original;
          if (p.deleted_at) return <span className="text-caption text-muted">—</span>;
          if (ownOutlet) {
            const available = !p.unavailable_outlet_ids.includes(ownOutlet.id);
            const busy = availability.isPending && availability.variables?.product.id === p.id;
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  label={available ? "Tersedia" : "Habis"}
                  checked={available}
                  disabled={busy}
                  onChange={(v) => availability.mutate({ outletId: ownOutlet.id, product: p, available: v })}
                />
              </div>
            );
          }
          return (
            <div className="flex flex-col items-start gap-1.5" onClick={(e) => e.stopPropagation()}>
              <StockSummary product={p} outlets={outletRows} />
              <button
                type="button"
                onClick={() => setStockId(p.id)}
                className="inline-flex items-center gap-1 rounded-md text-caption font-semibold text-primary hover:underline focus-visible:outline-2"
                aria-label={`Atur stok outlet ${p.name}`}
              >
                <Store className="size-3.5" aria-hidden="true" /> Atur stok
              </button>
            </div>
          );
        },
      },
      {
        id: "is_active",
        header: "Status",
        meta: { className: "w-20 xl:w-28" },
        cell: ({ row }) => {
          const p = row.original;
          if (!manage || p.deleted_at) return <ActivePill active={p.is_active && !p.deleted_at} />;
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                hideLabel
                label={`Aktifkan ${p.name}`}
                checked={p.is_active}
                disabled={toggle.isPending && toggle.variables?.id === p.id}
                onChange={(v) =>
                  toggle.mutate(
                    { id: p.id, body: { is_active: v } },
                    {
                      onSuccess: () => toast.success(v ? `${p.name} diaktifkan` : `${p.name} dinonaktifkan`),
                      onError: (e) => toast.error("Gagal mengubah status", { description: errorMessage(e) }),
                    },
                  )
                }
              />
            </div>
          );
        },
      },
      ...(manage
        ? [
            {
              id: "actions",
              header: () => <span className="sr-only">Aksi</span>,
              meta: { className: "w-24" },
              cell: ({ row }) => {
                const p = row.original;
                if (p.deleted_at) return null;
                return (
                  <RowActions
                    label={p.name}
                    editHref={`/admin/produk/${p.id}`}
                    onDelete={async () => {
                      const { ok } = await confirm({
                        title: `Hapus produk "${p.name}"?`,
                        description: "Produk disembunyikan dari menu dan panel (soft delete). Riwayat pesanan tetap tersimpan.",
                        confirmLabel: "Hapus produk",
                      });
                      if (!ok) return;
                      remove.mutate(p.id, {
                        onSuccess: (res) => {
                          qc.invalidateQueries({ queryKey: adminKeys.resource("products") });
                          toast.success(res.message);
                        },
                        onError: (e) => toast.error("Gagal menghapus", { description: errorMessage(e) }),
                      });
                    }}
                  />
                );
              },
            } satisfies ColumnDef<AdminProduct, unknown>,
          ]
        : []),
    ],
    [manage, isOutletAdmin, ownOutlet, outletRows, availability, toggle, remove, qc],
  );

  const runBulk = async (selected: AdminProduct[], action: ProductBulkAction, clear: () => void) => {
    const ids = selected.filter((p) => !p.deleted_at).map((p) => p.id);
    if (ids.length === 0) return toast.info("Produk yang sudah dihapus tidak dapat diubah.");
    if (action === "delete") {
      const { ok } = await confirm({
        title: `Hapus ${ids.length} produk?`,
        description: "Produk terpilih disembunyikan dari menu dan panel (soft delete). Riwayat pesanan tetap tersimpan.",
        confirmLabel: `Hapus ${ids.length} produk`,
      });
      if (!ok) return;
    }
    bulk.mutate({ ids, action }, { onSuccess: clear });
  };

  const trashed = params.filters.terhapus;

  return (
    <>
      <PageHeader
        title="Produk"
        description={isOutletAdmin ? "Lihat katalog dan tandai produk yang habis di outlet Anda." : "Kelola menu, harga, galeri, dan ketersediaan per outlet."}
        breadcrumb={[{ label: "Katalog" }, { label: "Produk" }]}
        actions={
          manage && (
            <Link href="/admin/produk/baru" className={buttonClasses("primary")}>
              <Plus className="size-4" aria-hidden="true" /> Tambah produk
            </Link>
          )
        }
      />
      {list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : (
        <DataTable
          caption="Daftar produk"
          columns={columns}
          data={rows}
          total={page?.meta?.total ?? 0}
          loading={list.isPending}
          fetching={list.isFetching}
          params={params}
          onParamsChange={update}
          getRowId={(p) => String(p.id)}
          onRowClick={(p) => !p.deleted_at && router.push(`/admin/produk/${p.id}`)}
          toolbar={
            <>
              <SearchInput value={params.search} onChange={(v) => update({ search: v })} placeholder="Cari nama produk…" label="Cari produk" />
              <FilterSelect label="Kategori" value={params.filters.kategori ?? ""} onChange={(v) => update({ filters: { kategori: v } })}>
                <option value="">Semua kategori</option>
                {(categories.data?.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Status" value={params.filters.status ?? ""} onChange={(v) => update({ filters: { status: v } })}>
                <option value="">Semua status</option>
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </FilterSelect>
              {manage && (
                <FilterSelect label="Terhapus" value={trashed ?? ""} onChange={(v) => update({ filters: { terhapus: v } })}>
                  <option value="">Sembunyikan</option>
                  <option value="with">Sertakan</option>
                  <option value="only">Hanya terhapus</option>
                </FilterSelect>
              )}
              <FilterSelect label="Urutkan" value={params.sort} onChange={(v) => update({ sort: v })} className="ml-auto">
                <option value="name">Nama A–Z</option>
                <option value="-name">Nama Z–A</option>
                <option value="-created_at">Terbaru</option>
                <option value="-sold_count">Terlaris</option>
                <option value="base_price">Harga terendah</option>
                <option value="-base_price">Harga tertinggi</option>
              </FilterSelect>
            </>
          }
          bulkActions={
            manage && trashed !== "only"
              ? (selected, clear) => (
                  <>
                    <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => runBulk(selected, "activate", clear)}>
                      <Eye className="size-4" aria-hidden="true" /> Aktifkan
                    </Button>
                    <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => runBulk(selected, "deactivate", clear)}>
                      <EyeOff className="size-4" aria-hidden="true" /> Nonaktifkan
                    </Button>
                    <Dropdown
                      align="start"
                      label={<>Tandai <ChevronDown className="size-4" aria-hidden="true" /></>}
                      buttonClassName={buttonClasses("outline", "sm")}
                    >
                      {(close) => (
                        <>
                          <DropdownItem icon={<Star />} onSelect={() => { close(); runBulk(selected, "feature", clear); }}>Jadikan unggulan</DropdownItem>
                          <DropdownItem icon={<StarOff />} onSelect={() => { close(); runBulk(selected, "unfeature", clear); }}>Hapus dari unggulan</DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem icon={<Award />} onSelect={() => { close(); runBulk(selected, "best_seller", clear); }}>Tandai best seller</DropdownItem>
                          <DropdownItem icon={<Award />} onSelect={() => { close(); runBulk(selected, "unbest_seller", clear); }}>Hapus best seller</DropdownItem>
                        </>
                      )}
                    </Dropdown>
                    <Button size="sm" variant="danger" disabled={bulk.isPending} onClick={() => runBulk(selected, "delete", clear)}>
                      <Trash2 className="size-4" aria-hidden="true" /> Hapus
                    </Button>
                  </>
                )
              : undefined
          }
          empty={{
            title: params.search || Object.keys(params.filters).length ? "Tidak ada produk yang cocok" : "Belum ada produk",
            description: params.search || Object.keys(params.filters).length ? "Ubah kata kunci atau filter pencarian." : undefined,
            action: manage && !params.search && (
              <Link href="/admin/produk/baru" className={buttonClasses("primary")}>Tambah produk</Link>
            ),
          }}
        />
      )}
      <StockDialog product={stockProduct} outlets={outletRows} loading={outlets.isPending} onClose={() => setStockId(null)} />
    </>
  );
}
