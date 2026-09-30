"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Info } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Select, Switch } from "@/components/ui/field";
import { applyServerErrors, fromLocalInput, toLocalInput } from "@/lib/admin/form";
import { useAdminSave, useOutletsRef } from "@/lib/admin/queries";
import type { AdminPromotion } from "@/lib/admin/types";
import type { PromotionType } from "@/types/api";
import { PROMO_TYPE_LABEL, PromoPreview, ruleSummary, type PromoPreviewData } from "./promo-preview";

const TYPES = Object.keys(PROMO_TYPE_LABEL) as PromotionType[];

/** Semua isian disimpan sebagai string agar tipe input = output; konversi angka saat submit. */
const intText = z.string().trim().regex(/^\d*$/, "Isi dengan angka bulat tanpa titik/koma.");

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .max(50, "Kode maksimal 50 karakter.")
      .regex(/^[A-Za-z0-9_-]*$/, "Kode hanya huruf, angka, - dan _ (tanpa spasi)."),
    name: z.string().trim().min(3, "Nama promo minimal 3 karakter.").max(150, "Nama promo maksimal 150 karakter."),
    type: z.enum(["percent", "fixed", "bogo", "free_delivery"]),
    value: intText,
    min_spend: intText,
    max_discount: intText,
    quota: intText,
    per_customer_limit: intText,
    outlet_id: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    is_active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const num = (s: string) => (s === "" ? null : Number(s));
    const value = num(v.value);
    if (v.type === "percent" && (value === null || value < 1 || value > 100)) ctx.addIssue({ code: "custom", path: ["value"], message: "Persentase diskon harus 1–100." });
    if (v.type === "fixed" && (value === null || value < 1)) ctx.addIssue({ code: "custom", path: ["value"], message: "Isi nominal potongan (minimal Rp1)." });
    for (const f of ["quota", "per_customer_limit"] as const) {
      const n = num(v[f]);
      if (n !== null && n < 1) ctx.addIssue({ code: "custom", path: [f], message: "Minimal 1, atau kosongkan untuk tanpa batas." });
    }
    if (v.starts_at && v.ends_at && v.ends_at <= v.starts_at) ctx.addIssue({ code: "custom", path: ["ends_at"], message: "Waktu berakhir harus setelah waktu mulai." });
  });
type Values = z.infer<typeof schema>;

const str = (n: number | null | undefined) => (n == null ? "" : String(n));
const hasValue = (t: PromotionType) => t === "percent" || t === "fixed";
const hasCap = (t: PromotionType) => t !== "fixed";

function toPreview(v: Values): PromoPreviewData {
  const n = (s: string) => (s && /^\d+$/.test(s) ? Number(s) : null);
  return {
    code: v.code.trim() ? v.code.trim().toUpperCase() : null,
    name: v.name.trim(),
    type: v.type,
    value: n(v.value) ?? 0,
    min_spend: n(v.min_spend) ?? 0,
    max_discount: hasCap(v.type) ? n(v.max_discount) : null,
    per_customer_limit: n(v.per_customer_limit),
    quota: n(v.quota),
    ends_at: fromLocalInput(v.ends_at),
  };
}

export function PromoForm({ promo, onDone }: { promo: AdminPromotion | null; onDone: () => void }) {
  const save = useAdminSave<AdminPromotion>("promotions");
  const outlets = useOutletsRef();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: promo
      ? {
          code: promo.code ?? "",
          name: promo.name,
          type: promo.type,
          value: hasValue(promo.type) ? str(promo.value) : "",
          min_spend: promo.min_spend ? String(promo.min_spend) : "",
          max_discount: str(promo.max_discount),
          quota: str(promo.quota),
          per_customer_limit: str(promo.per_customer_limit),
          outlet_id: str(promo.outlet_id),
          starts_at: toLocalInput(promo.starts_at),
          ends_at: toLocalInput(promo.ends_at),
          is_active: promo.is_active,
        }
      : { code: "", name: "", type: "percent", value: "", min_spend: "", max_discount: "", quota: "", per_customer_limit: "", outlet_id: "", starts_at: "", ends_at: "", is_active: true },
  });
  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = form;
  // <select> outlet kehilangan nilainya bila opsi belum dimuat → setel ulang setelah daftar outlet tiba
  const outletsLoaded = Boolean(outlets.data);
  useEffect(() => {
    if (outletsLoaded) setValue("outlet_id", getValues("outlet_id"));
  }, [outletsLoaded, setValue, getValues]);
  const values = watch();
  const preview = toPreview(values);
  const type = values.type;

  const submit = handleSubmit((v) => {
    const n = (s: string) => (s === "" ? null : Number(s));
    const body = {
      code: v.code.trim() ? v.code.trim().toUpperCase() : null,
      name: v.name.trim(),
      type: v.type,
      // bogo & gratis ongkir tidak memakai nilai, tapi kolomnya wajib (integer) di backend
      value: hasValue(v.type) ? Number(v.value) : 0,
      min_spend: n(v.min_spend) ?? 0,
      max_discount: hasCap(v.type) ? n(v.max_discount) : null,
      quota: n(v.quota),
      per_customer_limit: n(v.per_customer_limit),
      outlet_id: v.outlet_id ? Number(v.outlet_id) : null,
      starts_at: fromLocalInput(v.starts_at),
      ends_at: fromLocalInput(v.ends_at),
      is_active: v.is_active,
    };
    save.mutate({ id: promo?.id, body }, { onSuccess: onDone, onError: (e) => applyServerErrors(e, form.setError, "Gagal menyimpan promo") });
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form id="promo-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Nama promo" required className="sm:col-span-2" placeholder="mis. Hemat 20% maks 15rb" error={errors.name?.message} {...register("name")} autoFocus />
        <Input
          label="Kode voucher"
          placeholder="mis. KAMEEHEMAT"
          hint="Kosongkan untuk promo otomatis (diterapkan tanpa kode)."
          error={errors.code?.message}
          inputClassName="uppercase tracking-wider"
          autoCapitalize="characters"
          spellCheck={false}
          {...register("code")}
        />
        <Select label="Tipe promo" required error={errors.type?.message} {...register("type")}>
          {TYPES.map((t) => <option key={t} value={t}>{PROMO_TYPE_LABEL[t]}</option>)}
        </Select>

        {type === "percent" && (
          <Input label="Besar diskon" required type="number" inputMode="numeric" min={1} max={100} suffix={<span className="pr-2 text-sm font-semibold text-muted">%</span>} error={errors.value?.message} {...register("value")} />
        )}
        {type === "fixed" && (
          <Input label="Nominal potongan" required type="number" inputMode="numeric" min={1} prefix="Rp" error={errors.value?.message} {...register("value")} />
        )}
        {hasCap(type) && (
          <Input
            label="Maksimal potongan"
            type="number"
            inputMode="numeric"
            min={0}
            prefix="Rp"
            hint={type === "free_delivery" ? "Batas ongkir yang ditanggung. Kosongkan bila penuh." : "Kosongkan bila tanpa batas."}
            error={errors.max_discount?.message}
            {...register("max_discount")}
          />
        )}
        {!hasValue(type) && (
          <p className="flex items-start gap-2 rounded-xl bg-cream/60 p-3 text-caption text-muted sm:self-end">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {type === "bogo" ? "Beli 1 gratis 1 tidak memakai nilai diskon: setiap 2 item yang sama, 1 gratis." : "Gratis ongkir menanggung ongkos kirim pesanan delivery."}
          </p>
        )}

        <Input label="Minimal belanja" type="number" inputMode="numeric" min={0} prefix="Rp" hint="Kosongkan bila tanpa minimum." error={errors.min_spend?.message} {...register("min_spend")} />
        <Select label="Berlaku di outlet" error={errors.outlet_id?.message} {...register("outlet_id")}>
          <option value="">Semua outlet</option>
          {outlets.data?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Select>
        <Input label="Kuota total" type="number" inputMode="numeric" min={1} hint={promo ? `Sudah terpakai ${promo.used}×. Kosongkan = tanpa batas.` : "Kosongkan = tanpa batas."} error={errors.quota?.message} {...register("quota")} />
        <Input label="Batas per pelanggan" type="number" inputMode="numeric" min={1} hint="Kosongkan = tanpa batas." error={errors.per_customer_limit?.message} {...register("per_customer_limit")} />

        <Input label="Mulai berlaku" type="datetime-local" hint="Waktu WIB. Kosongkan = langsung berlaku." error={errors.starts_at?.message} {...register("starts_at")} />
        <Input label="Berakhir" type="datetime-local" hint="Waktu WIB. Kosongkan = tanpa batas." min={values.starts_at || undefined} error={errors.ends_at?.message} {...register("ends_at")} />

        <div className="sm:col-span-2">
          <Switch checked={values.is_active} onChange={(v) => setValue("is_active", v, { shouldDirty: true })} label="Promo aktif" />
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
          <Button variant="ghost" onClick={onDone}>Batal</Button>
          <Button type="submit" loading={save.isPending}>{promo ? "Simpan perubahan" : "Buat promo"}</Button>
        </div>
      </form>

      <aside aria-labelledby="promo-preview-title" className="order-first lg:order-none">
        <div className="lg:sticky lg:top-0">
          <h3 id="promo-preview-title" className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Pratinjau pelanggan</h3>
          <div className="rounded-2xl bg-bg p-3 ring-1 ring-line">
            <PromoPreview promo={preview} />
          </div>
          <p className="mt-3 text-caption text-muted">{ruleSummary(preview)}</p>
        </div>
      </aside>
    </div>
  );
}
