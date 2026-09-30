"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { z } from "zod";
import { confirm } from "@/components/admin/ui/confirm";
import { DataTable } from "@/components/admin/ui/data-table";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ActivePill, RowActions } from "@/components/admin/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Switch } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { applyServerErrors, compact, zInt, zSlug } from "@/lib/admin/form";
import { can } from "@/lib/admin/permissions";
import { errorMessage, useAdminDelete, useAdminList, useAdminSave, useAdminSession } from "@/lib/admin/queries";
import type { Category } from "@/lib/admin/types";

/*
 * POLA REFERENSI HALAMAN CRUD ADMIN
 * - Data: useAdminList (TanStack Query) → DataTable (mode klien untuk daftar kecil tanpa paginasi server).
 * - Form: Dialog + React Hook Form + Zod; error 422 Laravel dipetakan ke field (applyServerErrors).
 * - Hapus: selalu lewat confirm() lalu useAdminDelete (toast otomatis).
 * - Tombol tulis disembunyikan bila !can(user, "...manage"), backend tetap memvalidasi.
 */

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
  slug: zSlug,
  icon: z.string().trim().max(100).optional().or(z.literal("")),
  sort_order: zInt({ min: 0, label: "Urutan" }),
  is_active: z.boolean(),
});
type Values = z.infer<typeof schema>;

function CategoryForm({ category, nextOrder, onDone }: { category: Category | null; nextOrder: number; onDone: () => void }) {
  const save = useAdminSave<Category>("categories");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: category
      ? { name: category.name, slug: category.slug, icon: category.icon ?? "", sort_order: category.sort_order, is_active: category.is_active }
      : { name: "", slug: "", icon: "", sort_order: nextOrder, is_active: true },
  });
  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;

  const submit = handleSubmit((v) =>
    save.mutate(
      { id: category?.id, body: compact({ ...v, icon: v.icon || null }) },
      { onSuccess: onDone, onError: (e) => applyServerErrors(e, form.setError, "Gagal menyimpan kategori") },
    ),
  );

  return (
    <form id="category-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Input label="Nama kategori" required className="sm:col-span-2" error={errors.name?.message} {...register("name")} autoFocus />
      <Input label="Slug" hint="Kosongkan untuk dibuat otomatis dari nama." error={errors.slug?.message} {...register("slug")} />
      <Input label="Ikon" hint="Nama ikon, mis. coffee, tea, dessert." error={errors.icon?.message} {...register("icon")} />
      <Input label="Urutan tampil" type="number" min={0} inputMode="numeric" error={errors.sort_order?.message} {...register("sort_order")} />
      <div className="flex items-end pb-2">
        <Switch checked={watch("is_active")} onChange={(v) => setValue("is_active", v, { shouldDirty: true })} label="Tampilkan di menu" />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={save.isPending}>{category ? "Simpan perubahan" : "Tambah kategori"}</Button>
      </div>
    </form>
  );
}

export function CategoryManager() {
  const { data: user } = useAdminSession();
  const manage = can(user, "catalog.manage");
  const list = useAdminList<Category>("categories");
  const toggle = useAdminSave<Category>("categories", { silent: true });
  const remove = useAdminDelete("categories");
  const [editing, setEditing] = useState<Category | null | "new">(null);

  const rows = useMemo(() => list.data?.data ?? [], [list.data]);

  const columns = useMemo<ColumnDef<Category, unknown>[]>(
    () => [
      { accessorKey: "sort_order", header: "Urutan", enableSorting: true, meta: { className: "w-24", align: "center" } },
      {
        accessorKey: "name",
        header: "Kategori",
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.name}</p>
            <p className="text-caption text-muted">/{row.original.slug}</p>
          </div>
        ),
      },
      { accessorKey: "products_count", header: "Produk", enableSorting: true, meta: { align: "right", className: "w-28" } },
      {
        id: "is_active",
        header: "Status",
        cell: ({ row }) =>
          manage ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                hideLabel
                label={`Tampilkan ${row.original.name} di menu`}
                checked={row.original.is_active}
                disabled={toggle.isPending}
                onChange={(v) =>
                  toggle.mutate(
                    { id: row.original.id, body: { is_active: v } },
                    {
                      onSuccess: () => toast.success(v ? `${row.original.name} ditampilkan` : `${row.original.name} disembunyikan`),
                      onError: (e) => toast.error("Gagal mengubah status", { description: errorMessage(e) }),
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
                    const c = row.original;
                    const { ok } = await confirm({
                      title: `Hapus kategori "${c.name}"?`,
                      description: c.products_count ? `Kategori ini masih berisi ${c.products_count} produk. Pindahkan produknya dulu atau server akan menolak penghapusan.` : "Tindakan ini tidak dapat dibatalkan.",
                      confirmLabel: "Hapus",
                    });
                    if (ok) remove.mutate(c.id);
                  }}
                />
              ),
            } satisfies ColumnDef<Category, unknown>,
          ]
        : []),
    ],
    [manage, toggle, remove],
  );

  return (
    <>
      <PageHeader
        title="Kategori"
        description="Kelompok menu yang tampil sebagai chip di halaman Menu."
        breadcrumb={[{ label: "Katalog" }, { label: "Kategori" }]}
        actions={manage && <Button onClick={() => setEditing("new")}><Plus className="size-4" aria-hidden="true" /> Tambah kategori</Button>}
      />
      {list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : (
        <DataTable
          caption="Daftar kategori"
          columns={columns}
          data={rows}
          loading={list.isPending}
          fetching={list.isFetching}
          getRowId={(c) => String(c.id)}
          onRowClick={manage ? (c) => setEditing(c) : undefined}
          empty={{ title: "Belum ada kategori", action: manage && <Button onClick={() => setEditing("new")}>Tambah kategori</Button> }}
        />
      )}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Tambah kategori" : "Ubah kategori"}>
        {editing !== null && (
          <CategoryForm
            key={editing === "new" ? "new" : editing.id}
            category={editing === "new" ? null : editing}
            nextOrder={Math.max(0, ...rows.map((r) => r.sort_order)) + 1}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </>
  );
}
