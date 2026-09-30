"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { confirm } from "@/components/admin/ui/confirm";
import { PageHeader, Panel } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { applyServerErrors } from "@/lib/admin/form";
import { can } from "@/lib/admin/permissions";
import { useAdminSave, useAdminSession } from "@/lib/admin/queries";
import type { Settings } from "@/lib/admin/types";
import { formatNumber, formatPhone, formatRupiah, normalizePhone } from "@/lib/format";
import { zNumber, zPhoneWa, zTime } from "./shared";
import { useSettings } from "./use-settings";

const schema = z.object({
  delivery_base_fee: zNumber({ min: 0, int: true, label: "Ongkir dasar" }),
  delivery_base_km: zNumber({ min: 0, label: "Jarak dasar" }),
  delivery_per_km_fee: zNumber({ min: 0, int: true, label: "Tarif per km" }),
  default_open_time: zTime,
  default_close_time: zTime,
  points_earn_per_amount: zNumber({ min: 1000, int: true, label: "Belanja per poin" }),
  point_value: zNumber({ min: 1, int: true, label: "Nilai poin" }),
  points_max_redeem_percent: zNumber({ min: 0, max: 100, int: true, label: "Maksimal penukaran" }),
  points_min_redeem: zNumber({ min: 1, int: true, label: "Minimal penukaran" }),
  points_expiry_months: zNumber({ min: 1, max: 60, int: true, label: "Masa berlaku" }),
  payment_timeout_minutes: zNumber({ min: 5, max: 120, int: true, label: "Batas waktu bayar" }),
  service_fee: zNumber({ min: 0, int: true, label: "Biaya layanan" }),
  whatsapp_number: zPhoneWa,
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;
type Key = keyof Settings;

const KEYS = Object.keys(schema.shape) as Key[];

function toForm(s: Settings): FormIn {
  return Object.fromEntries(KEYS.map((k) => [k, String(s[k] ?? "")])) as FormIn;
}

/** Hanya field yang benar-benar berubah dibanding data server. */
function diff(out: FormOut, original: Settings): Partial<Settings> {
  const changed: Record<string, unknown> = {};
  for (const k of KEYS) {
    const next = k === "whatsapp_number" ? normalizePhone(out.whatsapp_number) : out[k];
    const prev = k === "whatsapp_number" ? normalizePhone(original.whatsapp_number) : original[k];
    if (next !== prev) changed[k] = next;
  }
  return changed as Partial<Settings>;
}

/** Sama dengan DeliveryFeeService::feeForDistance di backend. */
function deliveryFee(km: number, base: number, baseKm: number, perKm: number) {
  return base + Math.ceil(Math.max(0, km - baseKm)) * perKm;
}

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Peringatan saat meninggalkan halaman dengan perubahan belum disimpan (tab/refresh + tautan internal). */
function useUnsavedGuard(dirty: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = async (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      e.preventDefault();
      e.stopPropagation();
      const { ok } = await confirm({
        title: "Tinggalkan halaman?",
        description: "Ada perubahan pengaturan yang belum disimpan. Perubahan akan hilang jika Anda meninggalkan halaman ini.",
        confirmLabel: "Tinggalkan",
        cancelLabel: "Tetap di sini",
      });
      if (ok) router.push(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, router]);
}

function SettingsFields({ settings }: { settings: Settings }) {
  const save = useAdminSave<Settings>("settings");
  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema), defaultValues: toForm(settings) });
  const { register, handleSubmit, watch, reset, formState: { errors, isDirty } } = form;
  useUnsavedGuard(isDirty && !save.isPending);

  const v = watch();
  const sim = useMemo(
    () => [1, 3, 5].map((km) => ({ km, fee: deliveryFee(km, num(v.delivery_base_fee), num(v.delivery_base_km), num(v.delivery_per_km_fee)) })),
    [v.delivery_base_fee, v.delivery_base_km, v.delivery_per_km_fee],
  );
  const earn = num(v.points_earn_per_amount);
  const value = num(v.point_value);
  const cashback = earn > 0 ? (value / earn) * 100 : 0;

  const submit = handleSubmit((out) => {
    const body = diff(out, settings);
    if (!Object.keys(body).length) {
      reset(toForm(settings));
      return;
    }
    save.mutate(
      { path: "settings", method: "PUT", body },
      {
        onSuccess: (res) => reset(toForm(res.data)),
        onError: (e) => applyServerErrors(e, form.setError, "Gagal menyimpan pengaturan"),
      },
    );
  });

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Ongkos kirim" description="Dihitung dari jarak outlet ke alamat pelanggan.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Ongkir dasar" required inputMode="numeric" prefix="Rp" error={errors.delivery_base_fee?.message} {...register("delivery_base_fee")} />
            <Input label="Jarak dasar" required inputMode="decimal" suffix={<span className="pr-2 text-sm text-muted">km</span>} hint="Tercakup ongkir dasar." error={errors.delivery_base_km?.message} {...register("delivery_base_km")} />
            <Input label="Tarif per km" required inputMode="numeric" prefix="Rp" hint="Setelah jarak dasar." error={errors.delivery_per_km_fee?.message} {...register("delivery_per_km_fee")} />
          </div>
          <div className="mt-4 rounded-xl bg-cream/70 p-3.5" aria-live="polite">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted">Simulasi ongkir</p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              {sim.map((s) => (
                <div key={s.km} className="rounded-lg bg-surface px-2 py-2.5">
                  <dt className="text-caption text-muted">{s.km} km</dt>
                  <dd className="font-heading font-semibold tabular-nums text-ink">{formatRupiah(s.fee)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-caption text-muted">Jarak dibulatkan ke atas per km setelah jarak dasar.</p>
          </div>
        </Panel>

        <Panel title="Poin loyalitas">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="1 poin setiap belanja" required inputMode="numeric" prefix="Rp" hint="Minimal Rp1.000." error={errors.points_earn_per_amount?.message} {...register("points_earn_per_amount")} />
            <Input label="1 poin bernilai" required inputMode="numeric" prefix="Rp" hint="Potongan saat poin ditukar." error={errors.point_value?.message} {...register("point_value")} />
            <Input label="Maksimal penukaran" required inputMode="numeric" suffix={<span className="pr-2 text-sm text-muted">%</span>} hint="Dari subtotal pesanan." error={errors.points_max_redeem_percent?.message} {...register("points_max_redeem_percent")} />
            <Input label="Minimal penukaran" required inputMode="numeric" suffix={<span className="pr-2 text-sm text-muted">poin</span>} error={errors.points_min_redeem?.message} {...register("points_min_redeem")} />
            <Input label="Masa berlaku poin" required inputMode="numeric" suffix={<span className="pr-2 text-sm text-muted">bulan</span>} hint="1–60 bulan sejak diperoleh." error={errors.points_expiry_months?.message} {...register("points_expiry_months")} />
          </div>
          <p className="mt-4 rounded-xl bg-cream/70 p-3.5 text-sm text-ink" aria-live="polite">
            Pelanggan mendapat <strong>1 poin</strong> setiap belanja <strong>{formatRupiah(earn)}</strong>, dan 1 poin bernilai <strong>{formatRupiah(value)}</strong> — setara cashback{" "}
            <strong>{cashback.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%</strong>. Poin bisa ditukar mulai {formatNumber(num(v.points_min_redeem))} poin, maksimal{" "}
            {formatNumber(num(v.points_max_redeem_percent))}% dari subtotal, dan hangus setelah {formatNumber(num(v.points_expiry_months))} bulan.
          </p>
        </Panel>

        <Panel title="Jam buka default" description="Dipakai sebagai jam awal saat menambah outlet baru.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Jam buka" required type="time" error={errors.default_open_time?.message} {...register("default_open_time")} />
            <Input label="Jam tutup" required type="time" error={errors.default_close_time?.message} {...register("default_close_time")} />
          </div>
          <p className="mt-3 text-caption text-muted">
            Jam operasional masing-masing outlet diatur di halaman{" "}
            <Link href="/admin/outlet" className="font-medium text-primary hover:underline">Outlet</Link>.
          </p>
        </Panel>

        <Panel title="Pesanan & kontak">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Batas waktu pembayaran" required inputMode="numeric" suffix={<span className="pr-2 text-sm text-muted">menit</span>} hint="5–120 menit; pesanan belum dibayar otomatis batal." error={errors.payment_timeout_minutes?.message} {...register("payment_timeout_minutes")} />
            <Input label="Biaya layanan" required inputMode="numeric" prefix="Rp" hint="Per pesanan. Isi 0 bila tidak ada." error={errors.service_fee?.message} {...register("service_fee")} />
            <Input
              label="Nomor WhatsApp utama"
              required
              type="tel"
              inputMode="tel"
              className="sm:col-span-2"
              hint={`Dipakai tombol WhatsApp di website${settings.whatsapp_number ? ` (saat ini ${formatPhone(settings.whatsapp_number)})` : ""}.`}
              error={errors.whatsapp_number?.message}
              {...register("whatsapp_number")}
            />
          </div>
        </Panel>
      </div>

      <div className="sticky bottom-0 z-10 -mx-3 mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-bg/95 px-3 py-3 backdrop-blur md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
        {isDirty && <p className="mr-auto text-sm font-medium text-warning" role="status">Ada perubahan yang belum disimpan.</p>}
        <Button variant="ghost" disabled={!isDirty || save.isPending} onClick={() => reset(toForm(settings))}>
          <Undo2 className="size-4" aria-hidden="true" /> Batalkan perubahan
        </Button>
        <Button type="submit" disabled={!isDirty} loading={save.isPending}>
          <Save className="size-4" aria-hidden="true" /> Simpan pengaturan
        </Button>
      </div>
    </form>
  );
}

export function SettingsForm() {
  const { data: user } = useAdminSession();
  const allowed = can(user, "settings.manage");
  const query = useSettings(allowed);

  return (
    <>
      <PageHeader title="Pengaturan" description="Ongkir, poin loyalitas, pembayaran, dan kontak toko." breadcrumb={[{ label: "Sistem" }, { label: "Pengaturan" }]} />
      {query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : !query.data ? (
        <div className="grid gap-4 xl:grid-cols-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : (
        <SettingsFields settings={query.data} />
      )}
    </>
  );
}
