"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { confirm } from "@/components/admin/ui/confirm";
import { DataTable } from "@/components/admin/ui/data-table";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ActivePill, RowActions } from "@/components/admin/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { can } from "@/lib/admin/permissions";
import { errorMessage, useAdminDelete, useAdminList, useAdminSave, useAdminSession } from "@/lib/admin/queries";
import type { AdminBanner } from "@/lib/admin/types";
import { BannerForm } from "./banner-form";
import { QueryError, ScheduleBadge, ScheduleRange, scheduleState, useNow } from "./shared";

const PLACEMENT_LABEL: Record<string, string> = { home: "Beranda (carousel promo)" };

export function BannerManager() {
  const { data: user } = useAdminSession();
  const manage = can(user, "banners.manage");
  const now = useNow();
  const list = useAdminList<AdminBanner>("banners");
  const toggle = useAdminSave<AdminBanner>("banners", { silent: true });
  const remove = useAdminDelete("banners");
  const [editing, setEditing] = useState<AdminBanner | "new" | null>(null);

  const rows = useMemo(() => list.data?.data ?? [], [list.data]);
  const groups = useMemo(() => {
    const map = new Map<string, AdminBanner[]>();
    for (const b of rows) map.set(b.placement, [...(map.get(b.placement) ?? []), b]);
    return Array.from(map, ([placement, items]) => ({ placement, items: [...items].sort((a, b) => a.sort_order - b.sort_order) }));
  }, [rows]);

  const columns = useMemo<ColumnDef<AdminBanner, unknown>[]>(
    () => [
      { accessorKey: "sort_order", header: "Urutan", meta: { className: "hidden w-20 xl:table-cell", align: "center" } },
      {
        id: "image",
        header: "Gambar",
        meta: { className: "w-24 xl:w-32" },
        cell: ({ row }) => (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnail kecil dari storage
          <img src={row.original.image_desktop_url} alt={`Banner ${row.original.title}`} loading="lazy" className="aspect-[21/9] w-20 min-w-20 rounded-lg xl:w-28 xl:min-w-28 bg-cream object-cover ring-1 ring-line" />
        ),
      },
      {
        accessorKey: "title",
        header: "Judul",
        cell: ({ row }) => (
          <div className="min-w-32 max-w-72">
            <p className="font-semibold leading-snug">{row.original.title}</p>
            {row.original.subtitle && <p className="line-clamp-2 text-caption text-muted">{row.original.subtitle}</p>}
          </div>
        ),
      },
      {
        id: "link",
        header: "Link",
        meta: { className: "hidden lg:table-cell" },
        cell: ({ row }) =>
          row.original.link_url ? (
            <a
              href={row.original.link_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex max-w-48 items-center gap-1 truncate text-sm text-primary underline-offset-2 hover:underline"
            >
              <span className="truncate">{row.original.link_url}</span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">(buka di tab baru)</span>
            </a>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        id: "schedule",
        header: "Jadwal",
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <ScheduleBadge state={scheduleState(row.original, now)} runningLabel="Tayang" />
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
                label={`Aktifkan banner ${row.original.title}`}
                checked={row.original.is_active}
                disabled={toggle.isPending}
                onChange={(v) =>
                  toggle.mutate(
                    { id: row.original.id, body: { is_active: v } },
                    {
                      onSuccess: () => toast.success(v ? `Banner "${row.original.title}" diaktifkan` : `Banner "${row.original.title}" dinonaktifkan`),
                      onError: (e) => toast.error("Gagal mengubah status banner", { description: errorMessage(e) }),
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
                  label={row.original.title}
                  onEdit={() => setEditing(row.original)}
                  onDelete={async () => {
                    const b = row.original;
                    const { ok } = await confirm({ title: `Hapus banner "${b.title}"?`, description: "Banner akan hilang dari situs. Tindakan ini tidak dapat dibatalkan.", confirmLabel: "Hapus", tone: "danger" });
                    if (ok) remove.mutate(b.id);
                  }}
                />
              ),
            } satisfies ColumnDef<AdminBanner, unknown>,
          ]
        : []),
    ],
    [manage, toggle, remove, now],
  );

  const addButton = manage && (
    <Button onClick={() => setEditing("new")}>
      <Plus className="size-4" aria-hidden="true" /> Tambah banner
    </Button>
  );

  const editingPlacement = editing && editing !== "new" ? editing.placement : "home";
  const nextOrder = Math.max(-1, ...rows.filter((r) => r.placement === editingPlacement).map((r) => r.sort_order)) + 1;

  return (
    <>
      <PageHeader
        title="Banner"
        description="Gambar promo yang tampil di carousel beranda. Urutan kecil tampil lebih dulu."
        breadcrumb={[{ label: "Pemasaran" }, { label: "Banner" }]}
        actions={addButton}
      />
      {list.isError ? (
        <QueryError error={list.error} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : groups.length === 0 ? (
        <DataTable caption="Daftar banner" columns={columns} data={[]} empty={{ title: "Belum ada banner", description: "Tambahkan banner untuk carousel promo di beranda.", action: addButton }} />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.placement} aria-labelledby={`placement-${g.placement}`}>
              <h2 id={`placement-${g.placement}`} className="mb-2 flex items-baseline gap-2 font-heading text-base font-semibold text-ink">
                {PLACEMENT_LABEL[g.placement] ?? g.placement}
                <span className="text-caption font-normal text-muted">
                  {g.items.length} banner · penempatan <code className="rounded bg-cream px-1">{g.placement}</code>
                </span>
              </h2>
              <DataTable
                caption={`Banner penempatan ${g.placement}`}
                columns={columns}
                data={g.items}
                fetching={list.isFetching}
                getRowId={(b) => String(b.id)}
                onRowClick={manage ? (b) => setEditing(b) : undefined}
                hidePagination
              />
            </section>
          ))}
        </div>
      )}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} size="xl" title={editing === "new" ? "Tambah banner" : "Ubah banner"}>
        {editing !== null && (
          <BannerForm
            key={editing === "new" ? "new" : editing.id}
            banner={editing === "new" ? null : editing}
            placements={groups.map((g) => g.placement)}
            nextOrder={nextOrder}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </>
  );
}
