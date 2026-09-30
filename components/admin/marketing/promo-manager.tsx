"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { confirm } from "@/components/admin/ui/confirm";
import { DataTable } from "@/components/admin/ui/data-table";
import { FilterSelect } from "@/components/admin/ui/filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ActivePill, RowActions } from "@/components/admin/ui/row-actions";
import { toApiQuery, useTableParams } from "@/components/admin/ui/use-table-params";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { formatNumber, formatRupiah } from "@/lib/format";
import { can } from "@/lib/admin/permissions";
import { errorMessage, useAdminDelete, useAdminList, useAdminSave, useAdminSession, useOutletsRef } from "@/lib/admin/queries";
import type { AdminPromotion, Paginated } from "@/lib/admin/types";
import type { PromotionType } from "@/types/api";
import { PromoForm } from "./promo-form";
import { PROMO_TYPE_LABEL, promoValueText } from "./promo-preview";
import { QueryError, ScheduleBadge, ScheduleRange, scheduleState, useNow } from "./shared";

export function PromoManager() {
  const { data: user } = useAdminSession();
  const manage = can(user, "promotions.manage");
  const now = useNow();
  const outlets = useOutletsRef();
  const outletName = useMemo(() => new Map((outlets.data ?? []).map((o) => [o.id, o.name])), [outlets.data]);
  const { params, update } = useTableParams({ perPage: 20, sort: "-id", filterKeys: ["type", "is_active", "outlet_id"] });
  const list = useAdminList<AdminPromotion>("promotions", toApiQuery(params));
  const data = list.data as Paginated<AdminPromotion> | undefined;
  const toggle = useAdminSave<AdminPromotion>("promotions", { silent: true });
  const remove = useAdminDelete("promotions");
  const [editing, setEditing] = useState<AdminPromotion | "new" | null>(null);

  const columns = useMemo<ColumnDef<AdminPromotion, unknown>[]>(
    () => [
      {
        id: "id",
        header: "Kode",
        enableSorting: true,
        meta: { className: "hidden xl:table-cell" },
        cell: ({ row }) =>
          row.original.code ? (
            <span className="rounded-md border border-dashed border-primary/60 px-2 py-0.5 whitespace-nowrap font-heading text-xs font-semibold tracking-wide text-primary">{row.original.code}</span>
          ) : (
            <Badge tone="success">Otomatis</Badge>
          ),
      },
      {
        accessorKey: "name",
        header: "Promo",
        cell: ({ row }) => (
          <div className="min-w-32 max-w-60">
            {/* Di tablet kolom Kode disembunyikan → kode tampil di sini */}
            <p className="mb-1 xl:hidden">
              {row.original.code ? (
                <span className="rounded-md border border-dashed border-primary/60 px-1.5 py-0.5 font-heading text-[11px] font-semibold tracking-wide text-primary">{row.original.code}</span>
              ) : (
                <Badge tone="success">Otomatis</Badge>
              )}
            </p>
            <p className="font-semibold leading-snug">{row.original.name}</p>
            <p className="text-caption text-muted">
              {row.original.type_label || PROMO_TYPE_LABEL[row.original.type]}
              <span className="2xl:hidden"> · {row.original.outlet_id ? outletName.get(row.original.outlet_id) ?? `Outlet #${row.original.outlet_id}` : "Semua outlet"}</span>
            </p>
          </div>
        ),
      },
      {
        id: "value",
        header: "Nilai",
        meta: { align: "right" },
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="whitespace-nowrap">
              <p className="font-semibold">{promoValueText(p)}</p>
              {p.max_discount != null && p.type !== "fixed" && <p className="text-caption text-muted">maks. {formatRupiah(p.max_discount)}</p>}
              {p.min_spend > 0 && <p className="text-caption text-muted 2xl:hidden">min. belanja {formatRupiah(p.min_spend)}</p>}
            </div>
          );
        },
      },
      {
        id: "min_spend",
        header: "Min. belanja",
        meta: { align: "right", className: "hidden 2xl:table-cell" },
        cell: ({ row }) => (row.original.min_spend ? formatRupiah(row.original.min_spend) : <span className="text-muted">—</span>),
      },
      {
        id: "usage",
        header: "Terpakai",
        meta: { align: "right", className: "hidden xl:table-cell" },
        cell: ({ row }) => {
          const { used, quota } = row.original;
          const full = quota != null && used >= quota;
          return (
            <span className={full ? "font-semibold text-danger" : undefined} title={full ? "Kuota habis" : undefined}>
              {formatNumber(used)}/{quota != null ? formatNumber(quota) : "∞"}
            </span>
          );
        },
      },
      {
        id: "outlet",
        header: "Outlet",
        meta: { className: "hidden 2xl:table-cell" },
        cell: ({ row }) => (row.original.outlet_id ? outletName.get(row.original.outlet_id) ?? `Outlet #${row.original.outlet_id}` : <span className="text-muted">Semua</span>),
      },
      {
        id: "starts_at",
        header: "Jadwal tayang",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <ScheduleBadge state={scheduleState(row.original, now)} />
            <ScheduleRange starts_at={row.original.starts_at} ends_at={row.original.ends_at} />
          </div>
        ),
      },
      {
        id: "is_active",
        header: "Aktif",
        cell: ({ row }) =>
          manage ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                hideLabel
                label={`Aktifkan promo ${row.original.name}`}
                checked={row.original.is_active}
                disabled={toggle.isPending}
                onChange={(v) =>
                  toggle.mutate(
                    { id: row.original.id, body: { is_active: v } },
                    {
                      onSuccess: () => toast.success(v ? `Promo "${row.original.name}" diaktifkan` : `Promo "${row.original.name}" dinonaktifkan`),
                      onError: (e) => toast.error("Gagal mengubah status promo", { description: errorMessage(e) }),
                    },
                  )
                }
              />
            </div>
          ) : (
            <ActivePill active={row.original.is_active} />
          ),
      },
      ...(manage
        ? [
            {
              id: "actions",
              header: () => <span className="sr-only">Aksi</span>,
              meta: { className: "w-24" },
              cell: ({ row }) => (
                <RowActions
                  label={row.original.name}
                  onEdit={() => setEditing(row.original)}
                  onDelete={async () => {
                    const p = row.original;
                    const { ok } = await confirm({
                      title: `Hapus promo "${p.name}"?`,
                      description: p.used
                        ? `Promo ini sudah dipakai ${p.used}× sehingga riwayatnya disimpan: server akan menonaktifkannya, bukan menghapus.`
                        : "Promo akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.",
                      confirmLabel: p.used ? "Nonaktifkan" : "Hapus",
                      tone: "danger",
                    });
                    if (ok)
                      remove.mutate(p.id, {
                        // Backend selalu menjawab "berhasil dihapus"; bila sudah dipakai, promo sebenarnya hanya dinonaktifkan.
                        onSuccess: () => {
                          if (p.used) toast.info("Promo dinonaktifkan", { description: "Riwayat pemakaian tetap tersimpan." });
                        },
                      });
                  }}
                />
              ),
            } satisfies ColumnDef<AdminPromotion, unknown>,
          ]
        : []),
    ],
    [manage, toggle, remove, now, outletName],
  );

  const toolbar = (
    <>
      <FilterSelect label="Urutkan" value={params.sort} onChange={(v) => update({ sort: v })}>
        <option value="-id">Terbaru dibuat</option>
        <option value="id">Terlama dibuat</option>
        <option value="-starts_at">Mulai paling baru</option>
        <option value="starts_at">Mulai paling awal</option>
        <option value="ends_at">Segera berakhir</option>
        <option value="-ends_at">Berakhir paling lambat</option>
      </FilterSelect>
      <FilterSelect label="Tipe" value={params.filters.type ?? ""} onChange={(v) => update({ filters: { type: v } })}>
        <option value="">Semua tipe</option>
        {(Object.keys(PROMO_TYPE_LABEL) as PromotionType[]).map((t) => <option key={t} value={t}>{PROMO_TYPE_LABEL[t]}</option>)}
      </FilterSelect>
      <FilterSelect label="Status" value={params.filters.is_active ?? ""} onChange={(v) => update({ filters: { is_active: v } })}>
        <option value="">Semua status</option>
        <option value="1">Aktif</option>
        <option value="0">Nonaktif</option>
      </FilterSelect>
      <FilterSelect label="Outlet" value={params.filters.outlet_id ?? ""} onChange={(v) => update({ filters: { outlet_id: v } })}>
        <option value="">Semua</option>
        {outlets.data?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </FilterSelect>
    </>
  );

  return (
    <>
      <PageHeader
        title="Promo & Voucher"
        description="Kode voucher dan promo otomatis yang berlaku di checkout website & WhatsApp."
        breadcrumb={[{ label: "Pemasaran" }, { label: "Promo & Voucher" }]}
        actions={manage && <Button onClick={() => setEditing("new")}><Plus className="size-4" aria-hidden="true" /> Buat promo</Button>}
      />
      {list.isError ? (
        <QueryError error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <DataTable
          caption="Daftar promo dan voucher"
          columns={columns}
          data={data?.data ?? []}
          total={data?.meta?.total ?? 0}
          loading={list.isPending}
          fetching={list.isFetching}
          params={params}
          onParamsChange={update}
          toolbar={toolbar}
          getRowId={(p) => String(p.id)}
          onRowClick={manage ? (p) => setEditing(p) : undefined}
          empty={{
            title: Object.keys(params.filters).length ? "Tidak ada promo yang cocok" : "Belum ada promo",
            description: Object.keys(params.filters).length ? "Coba ubah atau hapus filter." : "Buat voucher pertama untuk menarik pelanggan.",
            action: manage && !Object.keys(params.filters).length && <Button onClick={() => setEditing("new")}>Buat promo</Button>,
          }}
        />
      )}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="xl"
        title={editing === "new" ? "Buat promo" : "Ubah promo"}
        description="Pratinjau menampilkan kartu voucher seperti di halaman Promo pelanggan."
      >
        {editing !== null && <PromoForm key={editing === "new" ? "new" : editing.id} promo={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
    </>
  );
}
