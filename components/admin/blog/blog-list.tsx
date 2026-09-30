"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FolderTree, ImageOff, PenLine } from "lucide-react";
import { confirm } from "@/components/admin/ui/confirm";
import { DataTable } from "@/components/admin/ui/data-table";
import { FilterSelect } from "@/components/admin/ui/filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RowActions } from "@/components/admin/ui/row-actions";
import { toApiQuery, useTableParams } from "@/components/admin/ui/use-table-params";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/lib/format";
import { can } from "@/lib/admin/permissions";
import { useAdminDelete, useAdminList, useAdminSession } from "@/lib/admin/queries";
import type { AdminBlog, BlogCategory, Paginated } from "@/lib/admin/types";
import { QueryError, useNow } from "@/components/admin/marketing/shared";
import { BlogCategoryDialog } from "./blog-category-dialog";

/** Draft / Terbit / Terjadwal (terbit dengan tanggal di masa depan). */
export function BlogStatusBadge({ status, publishedAt, now }: { status: AdminBlog["status"]; publishedAt: string | null; now: number }) {
  if (status === "draft") return <Badge>Draft</Badge>;
  if (publishedAt && new Date(publishedAt).getTime() > now) return <Badge tone="warning">Terjadwal</Badge>;
  return <Badge tone="success">Terbit</Badge>;
}

export function BlogList() {
  const router = useRouter();
  const { data: user } = useAdminSession();
  const manage = can(user, "blog.manage");
  const now = useNow();
  const { params, update } = useTableParams({ perPage: 20, sort: "-created_at", filterKeys: ["status", "blog_category_id"] });
  const list = useAdminList<AdminBlog>("blogs", toApiQuery(params));
  const data = list.data as Paginated<AdminBlog> | undefined;
  const categories = useAdminList<BlogCategory>("blog-categories");
  const remove = useAdminDelete("blogs");
  const [catOpen, setCatOpen] = useState(false);

  const columns = useMemo<ColumnDef<AdminBlog, unknown>[]>(
    () => [
      {
        id: "created_at",
        header: "Artikel",
        enableSorting: true,
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="flex min-w-60 max-w-[24rem] items-center gap-3">
              <div className="grid aspect-[1200/630] w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream text-muted ring-1 ring-line">
                {b.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- thumbnail kecil dari storage
                  <img src={b.cover_url} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <ImageOff className="size-5" aria-label="Tanpa sampul" />
                )}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 font-semibold leading-snug">{b.title}</p>
                <p className="truncate text-caption text-muted">/blog/{b.slug}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Kategori",
        meta: { className: "hidden lg:table-cell" },
        cell: ({ row }) => row.original.category?.name ?? <span className="text-muted">—</span>,
      },
      {
        id: "published_at",
        header: "Status",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1 whitespace-nowrap">
            <BlogStatusBadge status={row.original.status} publishedAt={row.original.published_at} now={now} />
            {row.original.published_at && <span className="text-caption text-muted">{formatDate(row.original.published_at, { day: "numeric", month: "short", year: "numeric" })}</span>}
          </div>
        ),
      },
      {
        id: "views",
        header: "Dibaca",
        enableSorting: true,
        meta: { align: "right", className: "hidden xl:table-cell" },
        cell: ({ row }) => formatNumber(row.original.views),
      },
      {
        id: "author",
        header: "Penulis",
        meta: { className: "hidden 2xl:table-cell whitespace-nowrap" },
        cell: ({ row }) => row.original.author ?? <span className="text-muted">—</span>,
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
                  editHref={`/admin/blog/${row.original.id}`}
                  onDelete={async () => {
                    const b = row.original;
                    const { ok } = await confirm({
                      title: `Hapus artikel "${b.title}"?`,
                      description: b.status === "published" ? "Artikel ini sudah terbit dan akan hilang dari situs. Tindakan ini tidak dapat dibatalkan." : "Tindakan ini tidak dapat dibatalkan.",
                      confirmLabel: "Hapus",
                      tone: "danger",
                    });
                    if (ok) remove.mutate(b.id);
                  }}
                />
              ),
            } satisfies ColumnDef<AdminBlog, unknown>,
          ]
        : []),
    ],
    [manage, remove, now],
  );

  const filtered = Object.keys(params.filters).length > 0;

  return (
    <>
      <PageHeader
        title="Blog"
        description="Artikel untuk situs Kamee Coffee: tips kopi, cerita, dan info promo."
        breadcrumb={[{ label: "Pemasaran" }, { label: "Blog" }]}
        actions={
          manage && (
            <>
              <Button variant="outline" onClick={() => setCatOpen(true)}>
                <FolderTree className="size-4" aria-hidden="true" /> Kategori
              </Button>
              <Link href="/admin/blog/baru" className={buttonClasses("primary")}>
                <PenLine className="size-4" aria-hidden="true" /> Tulis artikel
              </Link>
            </>
          )
        }
      />
      {list.isError ? (
        <QueryError error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <DataTable
          caption="Daftar artikel blog"
          columns={columns}
          data={data?.data ?? []}
          total={data?.meta?.total ?? 0}
          loading={list.isPending}
          fetching={list.isFetching}
          params={params}
          onParamsChange={update}
          getRowId={(b) => String(b.id)}
          onRowClick={manage ? (b) => router.push(`/admin/blog/${b.id}`) : undefined}
          toolbar={
            <>
              <FilterSelect label="Status" value={params.filters.status ?? ""} onChange={(v) => update({ filters: { status: v } })}>
                <option value="">Semua status</option>
                <option value="draft">Draft</option>
                <option value="published">Terbit / terjadwal</option>
              </FilterSelect>
              <FilterSelect label="Kategori" value={params.filters.blog_category_id ?? ""} onChange={(v) => update({ filters: { blog_category_id: v } })}>
                <option value="">Semua kategori</option>
                {categories.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Urutkan" value={params.sort} onChange={(v) => update({ sort: v })}>
                <option value="-created_at">Terbaru dibuat</option>
                <option value="-published_at">Terbaru terbit</option>
                <option value="published_at">Terlama terbit</option>
                <option value="-views">Paling banyak dibaca</option>
              </FilterSelect>
            </>
          }
          empty={{
            title: filtered ? "Tidak ada artikel yang cocok" : "Belum ada artikel",
            description: filtered ? "Coba ubah atau hapus filter." : "Tulis artikel pertama untuk blog Kamee.",
            action: manage && !filtered && <Link href="/admin/blog/baru" className={buttonClasses("primary")}>Tulis artikel</Link>,
          }}
        />
      )}
      {manage && <BlogCategoryDialog open={catOpen} onClose={() => setCatOpen(false)} />}
    </>
  );
}
