"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { confirm } from "@/components/admin/ui/confirm";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { applyServerErrors, zSlug } from "@/lib/admin/form";
import { adminKeys, useAdminDelete, useAdminList, useAdminSave } from "@/lib/admin/queries";
import type { BlogCategory } from "@/lib/admin/types";
import { QueryError } from "@/components/admin/marketing/shared";

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100, "Nama maksimal 100 karakter."),
  slug: zSlug,
});
type Values = z.infer<typeof schema>;

function CategoryForm({ category, onDone }: { category: BlogCategory | null; onDone: () => void }) {
  const save = useAdminSave<BlogCategory>("blog-categories", { invalidate: [adminKeys.resource("blogs")] });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: category?.name ?? "", slug: category?.slug ?? "" } });
  const { register, handleSubmit, reset, formState: { errors } } = form;
  const submit = handleSubmit((v) =>
    save.mutate(
      { id: category?.id, body: category ? { name: v.name, slug: v.slug || null } : { name: v.name, ...(v.slug ? { slug: v.slug } : {}) } },
      {
        onSuccess: () => {
          reset({ name: "", slug: "" });
          onDone();
        },
        onError: (e) => applyServerErrors(e, form.setError, "Gagal menyimpan kategori"),
      },
    ),
  );
  return (
    <form onSubmit={submit} noValidate className="grid gap-3 rounded-xl border border-line bg-bg p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
      <Input label={category ? "Nama kategori" : "Kategori baru"} placeholder="mis. Tips Kopi" required error={errors.name?.message} {...register("name")} autoFocus={Boolean(category)} />
      <Input label="Slug" placeholder="otomatis" hint={category ? undefined : "Kosongkan = dari nama."} error={errors.slug?.message} {...register("slug")} />
      <div className="flex gap-2 sm:pt-7">
        {category && <Button variant="ghost" onClick={onDone}>Batal</Button>}
        <Button type="submit" loading={save.isPending}>{category ? "Simpan" : "Tambah"}</Button>
      </div>
    </form>
  );
}

export function BlogCategoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const list = useAdminList<BlogCategory>("blog-categories", undefined, { enabled: open });
  const remove = useAdminDelete("blog-categories", { invalidate: [adminKeys.resource("blogs")] });
  const [editing, setEditing] = useState<BlogCategory | null>(null);
  const rows = list.data?.data ?? [];

  return (
    <Dialog open={open} onClose={onClose} size="lg" title="Kategori blog" description="Kelompok artikel yang tampil sebagai filter di halaman Blog.">
      <div className="space-y-4">
        {editing ? (
          <CategoryForm key={editing.id} category={editing} onDone={() => setEditing(null)} />
        ) : (
          <CategoryForm key="new" category={null} onDone={() => undefined} />
        )}
        {list.isError ? (
          <QueryError error={list.error} onRetry={() => list.refetch()} />
        ) : list.isPending ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Belum ada kategori. Tambahkan kategori pertama di atas.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line" aria-label="Daftar kategori blog">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{c.name}</p>
                  <p className="truncate text-caption text-muted">/{c.slug} · {c.blogs_count ?? 0} artikel</p>
                </div>
                <button type="button" onClick={() => setEditing(c)} aria-label={`Ubah kategori ${c.name}`} className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-cream hover:text-ink">
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Hapus kategori ${c.name}`}
                  className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
                  onClick={async () => {
                    const { ok } = await confirm({
                      title: `Hapus kategori "${c.name}"?`,
                      description: c.blogs_count ? `${c.blogs_count} artikel di kategori ini akan menjadi tanpa kategori.` : "Tindakan ini tidak dapat dibatalkan.",
                      confirmLabel: "Hapus",
                      tone: "danger",
                    });
                    if (!ok) return;
                    remove.mutate(c.id, {
                      onSuccess: () => {
                        if (editing?.id === c.id) setEditing(null);
                      },
                    });
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
