"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Bold, ExternalLink, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Pilcrow, Quote, Trash2, Upload, X, type LucideIcon } from "lucide-react";
import { z } from "zod";
import { confirm } from "@/components/admin/ui/confirm";
import { PageHeader, Panel } from "@/components/admin/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { applyServerErrors, fromLocalInput, toFormData, toLocalInput } from "@/lib/admin/form";
import { can } from "@/lib/admin/permissions";
import { useAdminDelete, useAdminItem, useAdminList, useAdminSave, useAdminSession } from "@/lib/admin/queries";
import type { AdminBlog, BlogCategory } from "@/lib/admin/types";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { site } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { QueryError, checkImage, useNow, useObjectUrl } from "@/components/admin/marketing/shared";
import { BlogPreview } from "./blog-preview";
import { BlogStatusBadge } from "./blog-list";

const META_TITLE_IDEAL = 60;
const META_DESC_IDEAL = 160;

const schema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(200, "Judul maksimal 200 karakter."),
  slug: z.string().trim().max(220, "Slug maksimal 220 karakter.").regex(/^[a-z0-9_-]*$/, "Slug hanya huruf kecil, angka, - dan _."),
  blog_category_id: z.string(),
  excerpt: z.string().trim().max(500, "Ringkasan maksimal 500 karakter."),
  content: z.string().refine((v) => v.trim().length > 0, "Konten artikel wajib diisi."),
  meta_title: z.string().trim().max(255, "Judul SEO maksimal 255 karakter."),
  meta_description: z.string().trim().max(255, "Deskripsi SEO maksimal 255 karakter."),
  status: z.enum(["draft", "published"]),
  published_at: z.string(),
});
type Values = z.infer<typeof schema>;

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

/* ------------------------------------------------------------------ Toolbar HTML */

type Snippet = { label: string; icon: LucideIcon; before: string; after: string; placeholder: string; block?: boolean };
const SNIPPETS: Snippet[] = [
  { label: "Paragraf", icon: Pilcrow, before: "<p>", after: "</p>", placeholder: "Teks paragraf", block: true },
  { label: "Subjudul (H2)", icon: Heading2, before: "<h2>", after: "</h2>", placeholder: "Subjudul", block: true },
  { label: "Sub-subjudul (H3)", icon: Heading3, before: "<h3>", after: "</h3>", placeholder: "Sub-subjudul", block: true },
  { label: "Tebal", icon: Bold, before: "<strong>", after: "</strong>", placeholder: "teks tebal" },
  { label: "Miring", icon: Italic, before: "<em>", after: "</em>", placeholder: "teks miring" },
  { label: "Tautan", icon: Link2, before: '<a href="https://">', after: "</a>", placeholder: "teks tautan" },
  { label: "Daftar poin", icon: List, before: "<ul>\n  <li>", after: "</li>\n  <li>Poin kedua</li>\n</ul>", placeholder: "Poin pertama", block: true },
  { label: "Daftar bernomor", icon: ListOrdered, before: "<ol>\n  <li>", after: "</li>\n  <li>Langkah kedua</li>\n</ol>", placeholder: "Langkah pertama", block: true },
  { label: "Kutipan", icon: Quote, before: "<blockquote>", after: "</blockquote>", placeholder: "Kutipan", block: true },
];

function CharCount({ value, ideal, max }: { value: string; ideal: number; max: number }) {
  const n = value.trim().length;
  return (
    <span className={cn("tabular-nums", n > max ? "text-danger" : n > ideal ? "text-warning" : "text-muted")}>
      {n}/{ideal} karakter{n > ideal && n <= max && " · bisa terpotong di Google"}
    </span>
  );
}

function GooglePreview({ title, slug, description }: { title: string; slug: string; description: string }) {
  const host = env.siteUrl.replace(/^https?:\/\//, "");
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
  return (
    <div className="rounded-xl border border-line bg-bg p-3.5" aria-label="Pratinjau hasil pencarian Google">
      <p className="truncate text-caption text-muted">{host} › blog › {slug || "slug-artikel"}</p>
      <p className="mt-0.5 line-clamp-2 text-[17px] leading-snug text-primary">{cut(`${title || "Judul artikel"} | ${site.name}`, 70)}</p>
      <p className="mt-1 line-clamp-3 text-sm text-muted">{description ? cut(description, META_DESC_IDEAL) : "Deskripsi akan diambil dari ringkasan artikel."}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ Form */

function EditorForm({ blog }: { blog: AdminBlog | null }) {
  const router = useRouter();
  const now = useNow();
  const { data: user } = useAdminSession();
  const canManage = can(user, "blog.manage");
  const categories = useAdminList<BlogCategory>("blog-categories");
  const save = useAdminSave<AdminBlog>("blogs");
  const remove = useAdminDelete("blogs");
  const coverId = useId();
  const coverInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(blog));
  const coverObj = useObjectUrl(coverFile);
  const panelId = useId();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: blog
      ? {
          title: blog.title,
          slug: blog.slug,
          blog_category_id: blog.category?.id ? String(blog.category.id) : "",
          excerpt: blog.excerpt ?? "",
          content: blog.content ?? "",
          // show() mengembalikan meta_title ?? title → sama dengan judul berarti belum diisi khusus
          meta_title: blog.meta_title && blog.meta_title !== blog.title ? blog.meta_title : "",
          meta_description: blog.meta_description && blog.meta_description !== blog.excerpt ? blog.meta_description : "",
          status: blog.status,
          published_at: toLocalInput(blog.published_at),
        }
      : { title: "", slug: "", blog_category_id: "", excerpt: "", content: "", meta_title: "", meta_description: "", status: "draft", published_at: "" },
  });
  const { register, handleSubmit, watch, setValue, getValues, reset, formState: { errors, isDirty } } = form;
  const v = watch();
  const dirty = isDirty || Boolean(coverFile);

  // <select> tak terkendali kehilangan nilainya bila opsi belum dimuat → setel ulang setelah daftar kategori tiba
  const categoriesLoaded = Boolean(categories.data);
  useEffect(() => {
    if (categoriesLoaded) setValue("blog_category_id", getValues("blog_category_id"));
  }, [categoriesLoaded, setValue, getValues]);

  // Peringatan saat meninggalkan halaman dengan perubahan belum disimpan
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const titleReg = register("title", {
    onChange: (e: { target: { value: string } }) => {
      if (!slugTouched) setValue("slug", slugify(e.target.value), { shouldDirty: true });
    },
  });
  const slugReg = register("slug", { onChange: () => setSlugTouched(true), setValueAs: (s: string) => s.toLowerCase() });
  const { ref: contentRef, ...contentReg } = register("content");

  const insert = (s: Snippet) => {
    const ta = textareaRef.current;
    const value = getValues("content");
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || s.placeholder;
    const lead = s.block && start > 0 && !value.slice(0, start).endsWith("\n") ? "\n" : "";
    const next = `${value.slice(0, start)}${lead}${s.before}${selected}${s.after}${value.slice(end)}`;
    setValue("content", next, { shouldDirty: true, shouldValidate: Boolean(errors.content) });
    const selStart = start + lead.length + s.before.length;
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(selStart, selStart + selected.length);
    });
  };

  const submit = handleSubmit((val) => {
    const body: Record<string, unknown> = {
      title: val.title,
      blog_category_id: val.blog_category_id ? Number(val.blog_category_id) : null,
      excerpt: val.excerpt || null,
      content: val.content,
      meta_title: val.meta_title || null,
      meta_description: val.meta_description || null,
      status: val.status,
      published_at: fromLocalInput(val.published_at),
    };
    // Slug kosong: saat membuat → tidak dikirim; saat mengubah → null agar dibuat ulang dari judul
    if (val.slug) body.slug = val.slug;
    else if (blog) body.slug = null;
    if (coverFile) body.cover = coverFile;

    save.mutate(
      { id: blog?.id, body: toFormData(body) },
      {
        onSuccess: (res) => {
          reset(getValues());
          setCoverFile(null);
          if (!blog) router.replace(`/admin/blog/${res.data.id}`);
          else if (res.data.slug !== val.slug) setValue("slug", res.data.slug);
        },
        onError: (e) => applyServerErrors(e, form.setError, "Gagal menyimpan artikel"),
      },
    );
  });

  // Ctrl/Cmd + S untuk menyimpan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canManage && !save.isPending) void submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onDelete = async () => {
    if (!blog) return;
    const { ok } = await confirm({ title: `Hapus artikel "${blog.title}"?`, description: "Artikel akan hilang dari situs. Tindakan ini tidak dapat dibatalkan.", confirmLabel: "Hapus", tone: "danger" });
    if (ok) remove.mutate(blog.id, { onSuccess: () => router.replace("/admin/blog") });
  };

  const publishedIso = fromLocalInput(v.published_at);
  const scheduled = v.status === "published" && publishedIso !== null && new Date(publishedIso).getTime() > now;
  const liveOnSite = blog?.status === "published" && (!blog.published_at || new Date(blog.published_at).getTime() <= now);
  const coverSrc = coverObj ?? blog?.cover_url ?? null;
  const saveLabel = blog ? "Simpan perubahan" : v.status === "published" ? (scheduled ? "Jadwalkan" : "Terbitkan") : "Simpan draft";
  const categoryName = categories.data?.data.find((c) => String(c.id) === v.blog_category_id)?.name ?? null;

  return (
    <>
      <PageHeader
        title={blog ? "Ubah artikel" : "Tulis artikel"}
        description={blog ? <span className="inline-flex flex-wrap items-center gap-2"><BlogStatusBadge status={blog.status} publishedAt={blog.published_at} now={now} />{blog.views.toLocaleString("id-ID")}× dibaca · oleh {blog.author ?? "—"}</span> : "Artikel baru tersimpan sebagai draft sampai Anda menerbitkannya."}
        breadcrumb={[{ label: "Pemasaran" }, { label: "Blog", href: "/admin/blog" }, { label: blog ? blog.title : "Artikel baru" }]}
        actions={
          <>
            {liveOnSite && (
              <a href={`/blog/${blog!.slug}`} target="_blank" rel="noreferrer" className={buttonClasses("ghost")}>
                <ExternalLink className="size-4" aria-hidden="true" /> Lihat di situs
              </a>
            )}
            {blog && canManage && (
              <Button variant="outline" onClick={onDelete} loading={remove.isPending} className="hover:border-danger hover:text-danger">
                <Trash2 className="size-4" aria-hidden="true" /> Hapus
              </Button>
            )}
            {canManage && (
              <Button onClick={() => void submit()} loading={save.isPending}>
                {saveLabel}
              </Button>
            )}
          </>
        }
      />

      {/* Bukan <form>: Tabs bersama tidak memakai type="button" sehingga akan men-submit form. Simpan lewat tombol di header. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Panel>
            <div className="grid gap-4">
              <Input label="Judul" required placeholder="mis. Cara Menyeduh V60 di Rumah" inputClassName="h-12 text-lg font-semibold" error={errors.title?.message} {...titleReg} autoFocus={!blog} />
              <Input
                label="Slug (URL)"
                prefix="/blog/"
                inputClassName="pl-[3.9rem]"
                hint={slugTouched ? "Kosongkan untuk dibuat ulang dari judul." : "Dibuat otomatis dari judul."}
                error={errors.slug?.message}
                spellCheck={false}
                {...slugReg}
              />
              <Textarea label="Ringkasan" rows={3} placeholder="1–2 kalimat yang tampil di kartu blog dan di bawah judul." hint={`${v.excerpt.trim().length}/500 karakter`} error={errors.excerpt?.message} {...register("excerpt")} />
            </div>
          </Panel>

          <Panel
            title="Konten"
            description="Format HTML: <p>, <h2>, <h3>, <strong>, <em>, <a>, <ul>/<ol>, <blockquote>."
            actions={<Tabs label="Mode editor" value={tab} onChange={(t) => setTab(t as "write" | "preview")} panelId={panelId} items={[{ id: "write", label: "Tulis" }, { id: "preview", label: "Pratinjau" }]} />}
          >
            <div id={panelId} role="tabpanel">
              {tab === "write" ? (
                <div className="space-y-2">
                  <div role="toolbar" aria-label="Sisipkan format" className="flex flex-wrap gap-1 rounded-xl border border-line bg-bg p-1">
                    {SNIPPETS.map((s) => (
                      <button key={s.label} type="button" onClick={() => insert(s)} title={s.label} aria-label={s.label} className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-cream hover:text-ink">
                        <s.icon className="size-4" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    label="Isi artikel (HTML)"
                    required
                    rows={22}
                    spellCheck
                    className="[&_label]:sr-only [&_textarea]:font-mono [&_textarea]:text-sm [&_textarea]:leading-relaxed"
                    placeholder={"<p>Paragraf pembuka…</p>\n<h2>Subjudul</h2>\n<p>Isi…</p>"}
                    error={errors.content?.message}
                    ref={(el) => {
                      contentRef(el);
                      textareaRef.current = el;
                    }}
                    {...contentReg}
                  />
                </div>
              ) : (
                <BlogPreview
                  data={{
                    title: v.title,
                    excerpt: v.excerpt,
                    content: v.content,
                    categoryName,
                    author: blog?.author ?? user?.name ?? null,
                    publishedAt: publishedIso ?? (v.status === "published" ? new Date(now).toISOString() : null),
                    coverSrc,
                  }}
                />
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-20">
          <Panel title="Publikasi">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)]">
              <Select label="Status" error={errors.status?.message} {...register("status")}>
                <option value="draft">Draft (tidak tampil)</option>
                <option value="published">Terbit</option>
              </Select>
              <Input
                label="Tanggal terbit"
                type="datetime-local"
                hint={v.status === "published" ? "Waktu WIB. Kosongkan = saat disimpan. Isi tanggal mendatang untuk menjadwalkan." : "Waktu WIB. Dipakai saat artikel diterbitkan."}
                error={errors.published_at?.message}
                {...register("published_at")}
              />
              {canManage && (
                <Button className="w-full sm:col-span-2 lg:col-span-1" onClick={() => void submit()} loading={save.isPending} disabled={Boolean(blog) && !dirty}>
                  {saveLabel}
                </Button>
              )}
              {v.status === "published" && (
                <p className={cn("rounded-xl p-3 text-caption sm:col-span-2 lg:col-span-1", scheduled ? "bg-warning/15 text-ink" : "bg-success/10 text-ink")}>
                  {scheduled ? <>Terjadwal: tampil otomatis pada <strong>{formatDateTime(publishedIso!)}</strong>.</> : "Artikel tampil di situs setelah disimpan."}
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Kategori & sampul">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)]">
              <Select label="Kategori" error={errors.blog_category_id?.message} {...register("blog_category_id")}>
                <option value="">Tanpa kategori</option>
                {categories.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={coverId} className="text-sm font-medium text-ink">Gambar sampul</label>
                <div className="relative aspect-[1200/630] overflow-hidden rounded-xl bg-cream ring-1 ring-line">
                  {coverSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element -- pratinjau object URL
                    <img src={coverSrc} alt="Pratinjau sampul" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-muted"><ImagePlus className="size-7" aria-hidden="true" /></div>
                  )}
                  {coverFile && <Badge tone="primary" className="absolute left-2 top-2">Belum disimpan</Badge>}
                </div>
                <input
                  ref={coverInput}
                  id={coverId}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    const problem = checkImage(f);
                    if (problem) toast.error("Gambar tidak valid", { description: problem });
                    else setCoverFile(f);
                  }}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => coverInput.current?.click()}>
                    <Upload className="size-4" aria-hidden="true" /> {coverSrc ? "Ganti sampul" : "Pilih sampul"}
                  </Button>
                  {coverFile && (
                    <Button variant="ghost" size="sm" onClick={() => setCoverFile(null)} aria-label="Batalkan sampul baru">
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <p className="text-caption text-muted">Rasio 1200×630 (juga untuk pratinjau media sosial). Maks 4 MB.</p>
                {(errors as Record<string, { message?: string } | undefined>).cover?.message && (
                  <p role="alert" className="text-caption text-danger">{(errors as Record<string, { message?: string } | undefined>).cover?.message}</p>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="SEO" description="Kosongkan untuk memakai judul & ringkasan artikel.">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
              <Input label="Judul SEO" placeholder={v.title || "Judul untuk mesin pencari"} hint={<CharCount value={v.meta_title || v.title} ideal={META_TITLE_IDEAL} max={255} />} error={errors.meta_title?.message} {...register("meta_title")} />
              <Textarea label="Deskripsi SEO" rows={3} placeholder={v.excerpt || "Deskripsi singkat untuk hasil pencarian"} hint={<CharCount value={v.meta_description || v.excerpt} ideal={META_DESC_IDEAL} max={255} />} error={errors.meta_description?.message} {...register("meta_description")} />
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Pratinjau Google</p>
                <GooglePreview title={v.meta_title || v.title} slug={v.slug} description={v.meta_description || v.excerpt} />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

export function BlogEditor({ id }: { id: number | null }) {
  const item = useAdminItem<AdminBlog>("blogs", id);

  if (id !== null && item.isError) {
    return (
      <>
        <PageHeader title="Ubah artikel" breadcrumb={[{ label: "Pemasaran" }, { label: "Blog", href: "/admin/blog" }]} actions={<Link href="/admin/blog" className={buttonClasses("outline")}>Kembali ke daftar</Link>} />
        <QueryError error={item.error} onRetry={() => item.refetch()} />
      </>
    );
  }
  if (id !== null && !item.data) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Memuat artikel">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[560px] rounded-2xl" />
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </div>
    );
  }
  return <EditorForm key={id ?? "new"} blog={item.data ?? null} />;
}
