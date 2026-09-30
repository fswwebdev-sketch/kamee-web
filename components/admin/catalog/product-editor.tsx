"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, ImagePlus, Info, Lock, Save, Trash2 } from "lucide-react";
import { z } from "zod";
import { confirm } from "@/components/admin/ui/confirm";
import { PageHeader, Panel } from "@/components/admin/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select, Switch, Textarea } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { adminApi } from "@/lib/admin/api";
import { applyServerErrors, toFormData, zInt, zOptionalInt, zSlug } from "@/lib/admin/form";
import { can } from "@/lib/admin/permissions";
import { adminKeys, errorMessage, useAdminItem, useAdminList, useAdminSession } from "@/lib/admin/queries";
import type { AdminProduct, Category, OptionGroup } from "@/lib/admin/types";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ACCEPT_ATTR, ProductGalleryEditor, imageFileError } from "./product-gallery-editor";
import { OutletStockList, useManagedOutlets } from "./product-stock";
import { ProductThumb } from "./product-thumb";

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(150, "Nama maksimal 150 karakter."),
  slug: zSlug,
  category_id: z.string().min(1, "Pilih kategori."),
  base_price: zInt({ min: 0, max: 10_000_000, label: "Harga" }),
  short_description: z.string().trim().max(255, "Maksimal 255 karakter."),
  description: z.string().trim(),
  composition: z.string().trim(),
  calories: zOptionalInt({ min: 0, max: 5000, label: "Kalori" }),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  is_best_seller: z.boolean(),
  option_group_ids: z.array(z.number()),
  image: z.custom<File | null>((v) => v === null || (typeof File !== "undefined" && v instanceof File)).superRefine((file, ctx) => {
    const err = file ? imageFileError(file) : null;
    if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
  }),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function defaults(p: AdminProduct | null): FormInput {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    category_id: p ? String(p.category_id) : "",
    base_price: p?.base_price ?? ("" as unknown as number),
    short_description: p?.short_description ?? "",
    description: p?.description ?? "",
    composition: p?.composition ?? "",
    calories: p?.calories ?? "",
    is_active: p?.is_active ?? true,
    is_featured: p?.is_featured ?? false,
    is_best_seller: p?.is_best_seller ?? false,
    option_group_ids: p?.option_group_ids ?? p?.option_groups?.map((g) => g.id) ?? [],
    image: null,
  };
}

function optionSummary(g: OptionGroup): string {
  return g.options.map((o) => (o.price_delta ? `${o.name} (${o.price_delta > 0 ? "+" : "−"}${formatRupiah(Math.abs(o.price_delta))})` : o.name)).join(", ");
}

type SaveResult = { data: AdminProduct; message: string };

function ProductForm({ product, readOnly }: { product: AdminProduct | null; readOnly: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const formId = useId();
  const categories = useAdminList<Category>("categories");
  const groups = useAdminList<OptionGroup>("option-groups");
  const form = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: defaults(product) });
  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = form;

  const imageFile = watch("image");
  const preview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const selectedGroups = watch("option_group_ids");
  const price = Number(watch("base_price"));

  const save = useMutation({
    mutationFn: async (v: FormOutput): Promise<SaveResult> => {
      const body = {
        name: v.name,
        slug: v.slug || null,
        category_id: Number(v.category_id),
        base_price: v.base_price,
        short_description: v.short_description || null,
        description: v.description || null,
        composition: v.composition || null,
        calories: v.calories ?? null,
        is_active: v.is_active,
        is_featured: v.is_featured,
        is_best_seller: v.is_best_seller,
        option_group_ids: v.option_group_ids,
      };
      if (!product) {
        // Produk baru: multipart bila ada gambar utama (slug kosong → dibuat otomatis dari nama)
        const { slug, ...rest } = body;
        const payload = slug ? body : rest;
        return adminApi<SaveResult>("products", { method: "POST", body: v.image ? toFormData({ ...payload, image: v.image }) : payload });
      }
      // Ubah: JSON dulu (agar option_group_ids kosong tetap terkirim), lalu gambar utama via multipart
      const res = await adminApi<SaveResult>(`products/${product.id}`, { method: "PATCH", body });
      if (!v.image) return res;
      return adminApi<SaveResult>(`products/${product.id}`, { method: "PATCH", body: toFormData({ image: v.image }) });
    },
    onSuccess: (res) => {
      qc.setQueryData(adminKeys.item("products", res.data.id), res.data);
      qc.invalidateQueries({ queryKey: adminKeys.resource("products") });
      qc.invalidateQueries({ queryKey: adminKeys.resource("categories") });
      if (!product) {
        toast.success(res.message, { description: "Sekarang Anda bisa menambahkan galeri gambar." });
        router.replace(`/admin/produk/${res.data.id}`);
      } else {
        toast.success(res.message);
        form.reset(defaults(res.data));
      }
    },
    onError: (e) => applyServerErrors(e, form.setError, "Gagal menyimpan produk"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi<{ message: string }>(`products/${id}`, { method: "DELETE" }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: adminKeys.resource("products") });
      toast.success(res.message);
      router.push("/admin/produk");
    },
    onError: (e) => toast.error("Gagal menghapus produk", { description: errorMessage(e) }),
  });

  const onDelete = async () => {
    if (!product) return;
    const { ok } = await confirm({
      title: `Hapus produk "${product.name}"?`,
      description: "Produk disembunyikan dari menu dan panel (soft delete). Riwayat pesanan tetap tersimpan.",
      confirmLabel: "Hapus produk",
    });
    if (ok) remove.mutate(product.id);
  };

  const toggleGroup = (id: number, on: boolean) => {
    const cur = selectedGroups ?? [];
    setValue("option_group_ids", on ? [...cur.filter((g) => g !== id), id] : cur.filter((g) => g !== id), { shouldDirty: true });
  };

  const groupRows = groups.data?.data ?? [];

  return (
    <>
      <PageHeader
        title={product ? product.name : "Tambah produk"}
        description={readOnly ? "Mode lihat saja — hanya Super Admin yang dapat mengubah produk." : product ? `/${product.slug}` : "Isi informasi dasar produk. Galeri gambar bisa ditambahkan setelah produk tersimpan."}
        breadcrumb={[{ label: "Katalog" }, { label: "Produk", href: "/admin/produk" }, { label: product ? "Ubah" : "Baru" }]}
        actions={
          <>
            <Link href="/admin/produk" className={buttonClasses("ghost")}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Kembali
            </Link>
            {!readOnly && product && (
              <Button variant="outline" onClick={onDelete} loading={remove.isPending} className="hover:border-danger hover:text-danger">
                <Trash2 className="size-4" aria-hidden="true" /> Hapus
              </Button>
            )}
            {!readOnly && (
              <Button type="submit" form={formId} loading={save.isPending}>
                <Save className="size-4" aria-hidden="true" /> {product ? "Simpan perubahan" : "Simpan produk"}
              </Button>
            )}
          </>
        }
      />

      {readOnly && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-cream/60 px-4 py-3 text-sm text-ink">
          <Lock className="size-4 shrink-0 text-muted" aria-hidden="true" />
          Anda dapat melihat detail produk dan mengatur stok outlet Anda di panel “Stok outlet”.
        </p>
      )}

      <form id={formId} onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
        <fieldset disabled={readOnly || save.isPending} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <legend className="sr-only">Data produk</legend>
          <div className="flex min-w-0 flex-col gap-4">
            <Panel title="Informasi produk">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Nama produk" required className="sm:col-span-2" error={errors.name?.message} {...register("name")} autoFocus={!product} />
                <Input label="Slug" hint="Kosongkan untuk dibuat otomatis dari nama." error={errors.slug?.message} {...register("slug")} />
                <Select label="Kategori" required error={errors.category_id?.message} {...register("category_id")} value={watch("category_id")} disabled={readOnly || categories.isPending}>
                  <option value="">{categories.isPending ? "Memuat kategori…" : "Pilih kategori"}</option>
                  {(categories.data?.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.is_active ? "" : " (nonaktif)"}</option>
                  ))}
                </Select>
                <Input
                  label="Harga dasar"
                  required
                  prefix="Rp"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={500}
                  hint={Number.isFinite(price) && price > 0 ? formatRupiah(price) : "Harga ukuran standar sebelum opsi."}
                  error={errors.base_price?.message}
                  {...register("base_price")}
                />
                <Input label="Kalori" type="number" inputMode="numeric" min={0} suffix={<span className="pr-2 text-sm text-muted">kkal</span>} error={errors.calories?.message} {...register("calories")} />
                <Textarea label="Deskripsi singkat" rows={2} className="sm:col-span-2" hint="Tampil di kartu menu (maks. 255 karakter)." maxLength={255} error={errors.short_description?.message} {...register("short_description")} />
              </div>
            </Panel>

            <Panel title="Deskripsi & komposisi">
              <div className="grid gap-4">
                <Textarea label="Deskripsi" rows={5} error={errors.description?.message} {...register("description")} />
                <Textarea label="Komposisi" rows={3} hint="Mis. Espresso, susu segar, gula aren." error={errors.composition?.message} {...register("composition")} />
              </div>
            </Panel>

            <Panel title="Grup opsi" description="Pilihan yang ditawarkan saat memesan. Urutan tampil mengikuti urutan Anda mencentang.">
              {groups.isPending ? (
                <div className="grid gap-2 sm:grid-cols-2" aria-hidden="true">
                  {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : groups.isError ? (
                <ErrorState title="Gagal memuat grup opsi" onRetry={() => groups.refetch()} />
              ) : groupRows.length === 0 ? (
                <p className="text-sm text-muted">Belum ada grup opsi. <Link href="/admin/opsi" className="font-semibold text-primary hover:underline">Buat grup opsi</Link>.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {groupRows.map((g) => {
                    const pos = (selectedGroups ?? []).indexOf(g.id);
                    const on = pos >= 0;
                    return (
                      <li key={g.id}>
                        <label className={cn("flex h-full cursor-pointer items-start gap-3 rounded-xl border p-3 transition", on ? "border-primary bg-primary/5" : "border-line hover:border-primary/60", readOnly && "cursor-default")}>
                          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]" checked={on} onChange={(e) => toggleGroup(g.id, e.target.checked)} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold text-ink">{g.name}</span>
                              <Badge>{g.type === "single" ? "Pilih satu" : "Pilih banyak"}</Badge>
                              {g.is_required && <Badge tone="warning">Wajib</Badge>}
                            </span>
                            <span className="mt-1 block text-caption text-muted">{optionSummary(g)}</span>
                          </span>
                          {on && <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-caption font-bold text-on-primary" aria-label={`Urutan ${pos + 1}`}>{pos + 1}</span>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {errors.option_group_ids && <p role="alert" className="mt-2 text-caption text-danger">{errors.option_group_ids.message ?? "Grup opsi tidak valid."}</p>}
            </Panel>
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:flex lg:flex-col">
            <Panel title="Gambar utama" description="Tampil di kartu menu & keranjang.">
              <div className="flex flex-col items-center gap-3">
                <ProductThumb src={preview ?? product?.image_url} alt={product?.name ?? "Pratinjau gambar utama"} sizes="240px" className="aspect-square size-auto w-full max-w-60 rounded-2xl" />
                {!readOnly && (
                  <div className="flex flex-wrap justify-center gap-2">
                    <label className={buttonClasses("outline", "sm", "cursor-pointer focus-within:ring-3 focus-within:ring-primary/30")}>
                      <ImagePlus className="size-4" aria-hidden="true" /> {product?.image_url || imageFile ? "Ganti gambar" : "Pilih gambar"}
                      <input
                        type="file"
                        accept={ACCEPT_ATTR}
                        className="sr-only"
                        aria-label="Pilih gambar utama"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setValue("image", f, { shouldDirty: true, shouldValidate: true });
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {imageFile && (
                      <Button size="sm" variant="ghost" onClick={() => setValue("image", null, { shouldDirty: true, shouldValidate: true })}>Batalkan</Button>
                    )}
                  </div>
                )}
                {errors.image ? (
                  <p role="alert" className="text-center text-caption text-danger">{errors.image.message}</p>
                ) : (
                  !readOnly && <p className="text-center text-caption text-muted">Opsional. JPG, PNG, WebP, atau GIF · maks. 3 MB.{imageFile ? ` Dipilih: ${imageFile.name}` : ""}</p>
                )}
              </div>
            </Panel>

            <Panel title="Status & penanda">
              <div className="flex flex-col gap-4">
                <Switch checked={watch("is_active")} onChange={(v) => setValue("is_active", v, { shouldDirty: true })} label="Aktif (tampil di menu)" disabled={readOnly} />
                <Switch checked={watch("is_featured")} onChange={(v) => setValue("is_featured", v, { shouldDirty: true })} label="Produk unggulan" disabled={readOnly} />
                <Switch checked={watch("is_best_seller")} onChange={(v) => setValue("is_best_seller", v, { shouldDirty: true })} label="Best seller" disabled={readOnly} />
              </div>
            </Panel>

            {!readOnly && (
              <div className="flex flex-col gap-2 md:col-span-2">
                <Button type="submit" loading={save.isPending} className="w-full">
                  <Save className="size-4" aria-hidden="true" /> {product ? "Simpan perubahan" : "Simpan produk"}
                </Button>
                {product && isDirty && <p className="text-center text-caption text-warning">Ada perubahan yang belum disimpan.</p>}
              </div>
            )}
          </div>
        </fieldset>
      </form>
    </>
  );
}

function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat produk">
      <Skeleton className="mb-2 h-4 w-40" />
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

/** Halaman /admin/produk/baru (id kosong) dan /admin/produk/[id]. */
export function ProductEditor({ id }: { id?: number }) {
  const session = useAdminSession();
  const user = session.data;
  const manage = can(user, "catalog.manage");
  const item = useAdminItem<AdminProduct>("products", id ?? null, { enabled: Number.isFinite(id) });
  const outlets = useManagedOutlets(user);

  if (session.isPending) return <EditorSkeleton />;

  if (id === undefined) {
    if (!manage) {
      return (
        <EmptyState
          illustration={<Lock className="size-10 text-muted" aria-hidden="true" />}
          title="Tidak dapat menambah produk"
          description="Hanya Super Admin yang dapat menambah produk. Anda tetap bisa mengatur stok outlet dari daftar produk."
          action={<Link href="/admin/produk" className={buttonClasses("primary")}>Kembali ke daftar produk</Link>}
        />
      );
    }
    return (
      <>
        <ProductForm product={null} readOnly={false} />
        <section className="mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-line bg-surface p-4 text-sm text-muted md:p-5">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <p><span className="font-semibold text-ink">Galeri gambar & stok outlet</span> tersedia setelah produk disimpan. Simpan produk dulu — Anda akan diarahkan ke halaman ubah untuk mengunggah dan mengurutkan galeri.</p>
        </section>
      </>
    );
  }

  if (!Number.isFinite(id)) return <ErrorState title="Produk tidak ditemukan" description="Alamat halaman tidak valid." />;
  if (item.isPending) return <EditorSkeleton />;
  if (item.isError) {
    const notFound = isApiError(item.error) && item.error.status === 404;
    return notFound ? (
      <EmptyState
        title="Produk tidak ditemukan"
        description="Produk mungkin sudah dihapus."
        action={<Link href="/admin/produk" className={buttonClasses("primary")}>Kembali ke daftar produk</Link>}
      />
    ) : (
      <ErrorState onRetry={() => item.refetch()} />
    );
  }

  const product = item.data;
  return (
    <>
      <ProductForm key={product.id} product={product} readOnly={!manage} />
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <ProductGalleryEditor productId={product.id} productName={product.name} images={product.images ?? []} canManage={manage} />
        <Panel title="Stok outlet" description={manage ? "Tandai habis bila bahan di outlet tersebut kosong." : "Tandai habis bila bahan di outlet Anda kosong."}>
          <OutletStockList product={product} outlets={outlets.data} loading={outlets.isPending} />
        </Panel>
      </div>
    </>
  );
}
