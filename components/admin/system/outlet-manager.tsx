"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, ExternalLink, MapPin, MessageCircle, Navigation, Pencil, Plus, Store, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { confirm } from "@/components/admin/ui/confirm";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Switch, Textarea } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { applyServerErrors, zSlug } from "@/lib/admin/form";
import { can } from "@/lib/admin/permissions";
import { adminKeys, errorMessage, useAdminDelete, useAdminList, useAdminSave, useAdminSession } from "@/lib/admin/queries";
import type { Outlet } from "@/lib/admin/types";
import { formatHour, formatNumber, formatPhone, normalizePhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { mapsHref, zNumber, zPhoneWa, zTime } from "./shared";
import { useSettings } from "./use-settings";

const schema = z.object({
  name: z.string().trim().min(2, "Nama outlet minimal 2 karakter.").max(150),
  slug: zSlug,
  address: z.string().trim().min(5, "Alamat wajib diisi.").max(500),
  city: z.string().trim().min(2, "Kota wajib diisi.").max(100),
  lat: zNumber({ min: -90, max: 90, label: "Latitude" }),
  lng: zNumber({ min: -180, max: 180, label: "Longitude" }),
  phone_wa: zPhoneWa,
  open_time: zTime,
  close_time: zTime,
  delivery_radius_km: zNumber({ min: 0, max: 50, label: "Radius antar" }),
  is_open: z.boolean(),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

/** Ikut invalidasi daftar referensi outlet (filter outlet di halaman lain). */
const INVALIDATE = [adminKeys.list("outlets", { ref: 1 })];

function OutletForm({ outlet, onDone }: { outlet: Outlet | null; onDone: () => void }) {
  const save = useAdminSave<Outlet>("outlets", { invalidate: INVALIDATE });
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: outlet
      ? {
          name: outlet.name,
          slug: outlet.slug,
          address: outlet.address,
          city: outlet.city,
          lat: String(outlet.lat),
          lng: String(outlet.lng),
          phone_wa: outlet.phone_wa,
          open_time: outlet.open_time,
          close_time: outlet.close_time,
          delivery_radius_km: String(outlet.delivery_radius_km),
          is_open: outlet.is_open,
        }
      : { name: "", slug: "", address: "", city: "Tangerang", lat: "", lng: "", phone_wa: "", open_time: "10:00", close_time: "17:00", delivery_radius_km: "5", is_open: true },
  });
  const { register, handleSubmit, watch, setValue, getFieldState, formState: { errors } } = form;
  // Outlet baru: jam awal mengikuti "Jam buka default" di Pengaturan.
  const defaults = useSettings(outlet === null);
  useEffect(() => {
    if (!defaults.data) return;
    if (!getFieldState("open_time").isDirty) setValue("open_time", defaults.data.default_open_time);
    if (!getFieldState("close_time").isDirty) setValue("close_time", defaults.data.default_close_time);
  }, [defaults.data, getFieldState, setValue]);
  const lat = watch("lat");
  const lng = watch("lng");
  const coordsOk = lat !== "" && lng !== "" && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

  const submit = handleSubmit((v) => {
    const body = { ...v, phone_wa: normalizePhone(v.phone_wa), slug: v.slug || undefined };
    save.mutate({ id: outlet?.id, body }, { onSuccess: onDone, onError: (e) => applyServerErrors(e, form.setError, "Gagal menyimpan outlet") });
  });

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Input label="Nama outlet" required error={errors.name?.message} {...register("name")} autoFocus placeholder="Kamee Coffee BSD" />
      <Input label="Slug" hint="Kosongkan untuk dibuat otomatis." error={errors.slug?.message} {...register("slug")} />
      <Textarea label="Alamat lengkap" required rows={2} className="sm:col-span-2" error={errors.address?.message} {...register("address")} />
      <Input label="Kota" required error={errors.city?.message} {...register("city")} />
      <Input label="Nomor WhatsApp" required type="tel" inputMode="tel" placeholder="0812xxxxxxxx" error={errors.phone_wa?.message} {...register("phone_wa")} />
      <Input label="Latitude" required inputMode="decimal" placeholder="-6.2088" error={errors.lat?.message} {...register("lat")} />
      <Input label="Longitude" required inputMode="decimal" placeholder="106.6365" error={errors.lng?.message} {...register("lng")} />
      <p className="-mt-2 text-caption text-muted sm:col-span-2">
        Salin koordinat dari Google Maps (klik kanan titik lokasi → angka pertama latitude, kedua longitude).{" "}
        {coordsOk && (
          <a href={mapsHref(lat, lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            Lihat di Google Maps <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        )}
      </p>
      <Input label="Jam buka" required type="time" error={errors.open_time?.message} {...register("open_time")} />
      <Input label="Jam tutup" required type="time" error={errors.close_time?.message} {...register("close_time")} />
      <Input label="Radius antar" required inputMode="decimal" suffix={<span className="pr-2 text-sm text-muted">km</span>} hint="0–50 km dari outlet." error={errors.delivery_radius_km?.message} {...register("delivery_radius_km")} />
      <div className="flex items-end pb-2">
        <Switch checked={watch("is_open")} onChange={(v) => setValue("is_open", v, { shouldDirty: true })} label="Terima pesanan" />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={save.isPending}>{outlet ? "Simpan perubahan" : "Tambah outlet"}</Button>
      </div>
    </form>
  );
}

function Info({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
      <div className="min-w-0 text-ink [overflow-wrap:anywhere]">{children}</div>
    </li>
  );
}

function OutletCard({ outlet, manage, onEdit }: { outlet: Outlet; manage: boolean; onEdit: () => void }) {
  const toggle = useAdminSave<Outlet>("outlets", { silent: true, invalidate: INVALIDATE });
  const remove = useAdminDelete("outlets", { invalidate: INVALIDATE });

  const onDelete = async () => {
    const { ok } = await confirm({
      title: `Hapus outlet "${outlet.name}"?`,
      description: "Outlet yang sudah memiliki pesanan tidak dapat dihapus — nonaktifkan \"Terima pesanan\" sebagai gantinya. Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Hapus outlet",
      typeToConfirm: outlet.name,
    });
    if (ok) remove.mutate(outlet.id);
  };

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-surface shadow-soft" aria-labelledby={`outlet-${outlet.id}`}>
      <header className="flex items-start justify-between gap-3 border-b border-line p-4 md:px-5">
        <div className="min-w-0">
          <h2 id={`outlet-${outlet.id}`} className="font-heading text-base font-semibold text-ink">{outlet.name}</h2>
          <p className="text-caption text-muted">/{outlet.slug}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {outlet.is_open ? (
            outlet.is_open_now ? <Badge tone="success">Sedang buka</Badge> : <Badge>Di luar jam buka</Badge>
          ) : (
            <Badge tone="danger">Tutup sementara</Badge>
          )}
        </div>
      </header>
      <ul className="flex-1 space-y-2.5 p-4 md:px-5">
        <Info icon={MapPin}>
          {outlet.address}
          <span className="block text-caption text-muted">{outlet.city}</span>
          <a href={mapsHref(outlet.lat, outlet.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline">
            Lihat di Google Maps <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </Info>
        <Info icon={MessageCircle}>
          <a href={`https://wa.me/${normalizePhone(outlet.phone_wa)}`} target="_blank" rel="noopener noreferrer" className="tabular-nums hover:text-primary hover:underline">
            {formatPhone(outlet.phone_wa)}
          </a>
        </Info>
        <Info icon={Clock}>
          <span className="tabular-nums">{formatHour(outlet.open_time)}–{formatHour(outlet.close_time)} WIB</span>
        </Info>
        <Info icon={Navigation}>Radius antar {formatNumber(outlet.delivery_radius_km)} km</Info>
      </ul>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line p-3 md:px-5">
        {manage ? (
          <>
            <Switch
              label="Terima pesanan"
              checked={outlet.is_open}
              disabled={toggle.isPending}
              onChange={(v) =>
                toggle.mutate(
                  { id: outlet.id, body: { is_open: v } },
                  {
                    onSuccess: () => toast.success(v ? `${outlet.name} kembali menerima pesanan` : `${outlet.name} berhenti menerima pesanan`),
                    onError: (e) => toast.error("Gagal mengubah status outlet", { description: errorMessage(e) }),
                  },
                )
              }
            />
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Ubah ${outlet.name}`}>
                <Pencil className="size-4" aria-hidden="true" /> Ubah
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} loading={remove.isPending} aria-label={`Hapus ${outlet.name}`} className="hover:bg-danger/10 hover:text-danger">
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </>
        ) : (
          <p className={cn("text-sm font-medium", outlet.is_open ? "text-success" : "text-danger")}>
            {outlet.is_open ? "Menerima pesanan" : "Tidak menerima pesanan"}
          </p>
        )}
      </footer>
    </article>
  );
}

export function OutletManager() {
  const { data: user } = useAdminSession();
  const manage = can(user, "outlets.manage");
  const list = useAdminList<Outlet>("outlets");
  const [editing, setEditing] = useState<Outlet | null | "new">(null);
  const rows = list.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Outlet"
        description={manage ? "Lokasi, jam operasional, dan radius pengantaran tiap outlet." : "Informasi outlet Anda. Perubahan dilakukan oleh Admin (akses penuh)."}
        breadcrumb={[{ label: "Sistem" }, { label: "Outlet" }]}
        actions={manage && <Button onClick={() => setEditing("new")}><Plus className="size-4" aria-hidden="true" /> Tambah outlet</Button>}
      />
      {list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          illustration={<Store className="size-12 text-muted" aria-hidden="true" />}
          title="Belum ada outlet"
          action={manage && <Button onClick={() => setEditing("new")}>Tambah outlet</Button>}
        />
      ) : (
        <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", list.isFetching && "opacity-80 transition-opacity")}>
          {rows.map((o) => <OutletCard key={o.id} outlet={o} manage={manage} onEdit={() => setEditing(o)} />)}
        </div>
      )}
      {manage && (
        <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Tambah outlet" : "Ubah outlet"} size="lg">
          {editing !== null && <OutletForm key={editing === "new" ? "new" : editing.id} outlet={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
        </Dialog>
      )}
    </>
  );
}
