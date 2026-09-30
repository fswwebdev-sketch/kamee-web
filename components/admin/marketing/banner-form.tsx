"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ImagePlus, Link2, Upload, X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Switch } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { applyServerErrors, fromLocalInput, toFormData, toLocalInput } from "@/lib/admin/form";
import { useAdminSave } from "@/lib/admin/queries";
import type { AdminBanner } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { BannerPreview } from "./banner-preview";
import { checkImage, useObjectUrl } from "./shared";

const schema = z
  .object({
    title: z.string().trim().min(2, "Judul minimal 2 karakter.").max(150, "Judul maksimal 150 karakter."),
    subtitle: z.string().trim().max(255, "Subjudul maksimal 255 karakter."),
    link_url: z
      .string()
      .trim()
      .max(255, "Link maksimal 255 karakter.")
      .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), "Awali dengan / (halaman situs) atau https://."),
    placement: z.string().trim().min(1, "Isi penempatan banner.").max(50).regex(/^[a-z0-9_-]+$/, "Hanya huruf kecil, angka, - dan _."),
    sort_order: z.string().trim().regex(/^\d+$/, "Urutan harus angka 0 atau lebih."),
    image_desktop: z.string().trim().max(255, "URL maksimal 255 karakter."),
    starts_at: z.string(),
    ends_at: z.string(),
    is_active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.starts_at && v.ends_at && v.ends_at <= v.starts_at) ctx.addIssue({ code: "custom", path: ["ends_at"], message: "Waktu berakhir harus setelah waktu mulai." });
  });
type Values = z.infer<typeof schema>;

function FilePicker({ label, hint, file, currentSrc, onPick, onClear, error, hideLabel }: { label: string; hint: string; file: File | null; currentSrc: string | null; onPick: (f: File) => void; onClear?: () => void; error?: string; hideLabel?: boolean }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-medium text-ink"}>{label}</label>
      <div className={cn("flex items-center gap-3 rounded-xl border border-dashed p-2.5", error ? "border-danger" : "border-line")}>
        <div className="grid h-12 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream text-muted">
          {currentSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- thumbnail object URL
            <img src={currentSrc} alt={`Gambar ${label.toLowerCase()} saat ini`} className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">{file ? file.name : currentSrc ? "Gambar saat ini" : "Belum ada berkas"}</p>
          <p className="text-caption text-muted">{hint}</p>
        </div>
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-invalid={Boolean(error) || undefined}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const problem = checkImage(f);
            if (problem) toast.error("Gambar tidak valid", { description: problem });
            else onPick(f);
          }}
        />
        <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
          <Upload className="size-4" aria-hidden="true" /> Pilih
        </Button>
        {onClear && (
          <button type="button" onClick={onClear} aria-label={`Hapus pilihan ${label.toLowerCase()}`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-cream hover:text-ink">
            <X className="size-4" />
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-caption text-danger">{error}</p>}
    </div>
  );
}

export function BannerForm({ banner, placements, nextOrder, onDone }: { banner: AdminBanner | null; placements: string[]; nextOrder: number; onDone: () => void }) {
  const save = useAdminSave<AdminBanner>("banners");
  const listId = useId();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: banner
      ? {
          title: banner.title,
          subtitle: banner.subtitle ?? "",
          link_url: banner.link_url ?? "",
          placement: banner.placement,
          sort_order: String(banner.sort_order),
          image_desktop: "",
          starts_at: toLocalInput(banner.starts_at),
          ends_at: toLocalInput(banner.ends_at),
          is_active: banner.is_active,
        }
      : { title: "", subtitle: "", link_url: "", placement: "home", sort_order: String(nextOrder), image_desktop: "", starts_at: "", ends_at: "", is_active: true },
  });
  const { register, handleSubmit, watch, setValue, setError, clearErrors, formState: { errors } } = form;
  const values = watch();

  const [desktopMode, setDesktopMode] = useState<"file" | "url">("file");
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  // Resource mengembalikan image_mobile_url = desktop bila mobile kosong → beda URL berarti mobile diisi terpisah
  const hasOwnMobile = Boolean(banner && banner.image_mobile_url !== banner.image_desktop_url);
  const [dropMobile, setDropMobile] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const desktopObj = useObjectUrl(desktopFile);
  const mobileObj = useObjectUrl(mobileFile);

  const urlValue = values.image_desktop.trim();
  const desktopSrc = desktopMode === "file" ? desktopObj ?? banner?.image_desktop_url ?? null : /^https?:\/\//i.test(urlValue) ? urlValue : banner?.image_desktop_url ?? null;
  const mobileSrc = mobileObj ?? (hasOwnMobile && !dropMobile ? banner!.image_mobile_url : null);

  const submit = handleSubmit((v) => {
    const hasDesktop = desktopMode === "file" ? Boolean(desktopFile) : Boolean(v.image_desktop);
    if (!banner && !hasDesktop) {
      if (desktopMode === "url") setError("image_desktop", { type: "manual", message: "Isi URL gambar desktop." });
      else setPickError("Pilih gambar desktop.");
      return;
    }
    const body: Record<string, unknown> = {
      title: v.title,
      subtitle: v.subtitle || null,
      link_url: v.link_url || null,
      placement: v.placement,
      sort_order: Number(v.sort_order),
      starts_at: fromLocalInput(v.starts_at),
      ends_at: fromLocalInput(v.ends_at),
      is_active: v.is_active,
    };
    // Kirim field gambar HANYA bila berubah: image_desktop kosong pada PATCH akan menghapus gambar lama.
    if (desktopMode === "file" && desktopFile) body.image_desktop_file = desktopFile;
    if (desktopMode === "url" && v.image_desktop) body.image_desktop = v.image_desktop;
    if (mobileFile) body.image_mobile_file = mobileFile;
    else if (dropMobile) body.image_mobile = null;

    save.mutate(
      { id: banner?.id, body: toFormData(body) },
      { onSuccess: onDone, onError: (e) => applyServerErrors(e, form.setError, "Gagal menyimpan banner") },
    );
  });

  // Error server untuk field berkas (tidak terdaftar di RHF) tetap tersimpan di objek errors
  const serverErr = errors as Record<string, { message?: string } | undefined>;

  return (
    <div className="grid gap-6">
      <section aria-labelledby="banner-preview-title" className="rounded-2xl bg-bg p-3 ring-1 ring-line md:p-4">
        <h3 id="banner-preview-title" className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Pratinjau langsung</h3>
        <BannerPreview data={{ title: values.title, subtitle: values.subtitle, link_url: values.link_url, desktopSrc, mobileSrc }} />
      </section>

      <form id="banner-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Judul" required className="sm:col-span-2" placeholder="mis. Ngopi Hemat 20%" error={errors.title?.message} {...register("title")} autoFocus />
        <Input label="Subjudul" className="sm:col-span-2" placeholder="mis. Pakai kode KAMEEHEMAT untuk semua menu" error={errors.subtitle?.message} {...register("subtitle")} />

        <div className="flex flex-col gap-2 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink">Gambar desktop{!banner && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}</span>
            {/* Tabs bersama tidak memakai type="button" → cegah submit form tanpa menghalangi onClick tab */}
            <div onClickCapture={(e) => e.preventDefault()}>
            <Tabs
              label="Sumber gambar desktop"
              value={desktopMode}
              onChange={(v) => {
                setDesktopMode(v as "file" | "url");
                setPickError(null);
                clearErrors(["image_desktop"]);
              }}
              items={[
                { id: "file", label: <span className="inline-flex items-center gap-1.5"><Upload className="size-3.5" aria-hidden="true" />Unggah</span> },
                { id: "url", label: <span className="inline-flex items-center gap-1.5"><Link2 className="size-3.5" aria-hidden="true" />URL</span> },
              ]}
              className="[&_button]:h-8 [&_button]:px-3"
            />
            </div>
          </div>
          {desktopMode === "file" ? (
            <FilePicker
              hideLabel
              label="Gambar desktop"
              hint="Rasio 21:9, min. 1600 px lebar. Maks 4 MB."
              file={desktopFile}
              currentSrc={desktopObj ?? banner?.image_desktop_url ?? null}
              onPick={(f) => {
                setDesktopFile(f);
                setPickError(null);
                clearErrors(["image_desktop"]);
              }}
              onClear={desktopFile ? () => setDesktopFile(null) : undefined}
              error={pickError ?? serverErr.image_desktop_file?.message ?? serverErr.image_desktop?.message}
            />
          ) : (
            <Input
              label="URL gambar desktop"
              placeholder="https://… atau banners/nama-file.jpg"
              hint={banner ? "Kosongkan untuk tetap memakai gambar saat ini." : "URL penuh gambar, atau path di storage."}
              error={errors.image_desktop?.message}
              {...register("image_desktop")}
            />
          )}
        </div>

        <div className="sm:col-span-2">
          <FilePicker
            label="Gambar mobile"
            hint={mobileFile || (hasOwnMobile && !dropMobile) ? "Rasio 4:5. Maks 4 MB." : "Opsional (rasio 4:5). Tanpa ini, gambar desktop dipakai."}
            file={mobileFile}
            currentSrc={mobileSrc}
            onPick={(f) => {
              setMobileFile(f);
              setDropMobile(false);
            }}
            onClear={mobileFile ? () => setMobileFile(null) : hasOwnMobile && !dropMobile ? () => setDropMobile(true) : undefined}
            error={serverErr.image_mobile_file?.message ?? serverErr.image_mobile?.message}
          />
        </div>

        <Input label="Link tujuan" placeholder="/promo atau https://…" hint="Tombol “Lihat detail” muncul bila diisi." error={errors.link_url?.message} {...register("link_url")} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Penempatan" required list={listId} error={errors.placement?.message} {...register("placement")} />
          <datalist id={listId}>
            {Array.from(new Set(["home", ...placements])).map((p) => <option key={p} value={p} />)}
          </datalist>
          <Input label="Urutan" type="number" min={0} inputMode="numeric" error={errors.sort_order?.message} {...register("sort_order")} />
        </div>
        <Input label="Mulai tayang" type="datetime-local" hint="Waktu WIB. Kosongkan = langsung tayang." error={errors.starts_at?.message} {...register("starts_at")} />
        <Input label="Berakhir" type="datetime-local" hint="Waktu WIB. Kosongkan = tanpa batas." min={values.starts_at || undefined} error={errors.ends_at?.message} {...register("ends_at")} />
        <div className="sm:col-span-2">
          <Switch checked={values.is_active} onChange={(v) => setValue("is_active", v, { shouldDirty: true })} label="Banner aktif" />
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
          <Button variant="ghost" onClick={onDone}>Batal</Button>
          <Button type="submit" loading={save.isPending}>{banner ? "Simpan perubahan" : "Tambah banner"}</Button>
        </div>
      </form>
    </div>
  );
}
