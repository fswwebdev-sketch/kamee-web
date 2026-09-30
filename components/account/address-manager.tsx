"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { AddressMap } from "@/components/checkout/address-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { useAddresses, useDeleteAddress, useSaveAddress } from "@/lib/queries/account";
import { addressSchema, type AddressValues } from "@/lib/schemas/forms";
import type { CustomerAddress } from "@/types/api";

export function AddressManager() {
  const { data = [], isLoading } = useAddresses();
  const save = useSaveAddress();
  const remove = useDeleteAddress();
  const [editing, setEditing] = useState<CustomerAddress | "new" | null>(null);
  const form = useForm<AddressValues>({ resolver: zodResolver(addressSchema) });
  const lat = form.watch("lat");
  const lng = form.watch("lng");

  const open = (a: CustomerAddress | "new") => {
    setEditing(a);
    form.reset(a === "new" ? { label: "", address: "", note: "", lat: null, lng: null, is_default: data.length === 0 } : { label: a.label, address: a.address, note: a.note ?? "", lat: a.lat, lng: a.lng, is_default: a.is_default });
  };

  const submit = form.handleSubmit((v) =>
    save.mutate(
      { ...(editing && editing !== "new" ? { id: editing.id } : {}), ...v, note: v.note || null },
      {
        onSuccess: (r) => {
          toast.success(r.message);
          setEditing(null);
        },
        onError: (e) => toast.error(isApiError(e) ? e.message : "Gagal menyimpan alamat."),
      },
    ),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h2">Alamat Tersimpan</h1>
        <Button onClick={() => open("new")}><Plus className="size-4" aria-hidden="true" /> Tambah</Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-32 rounded-3xl" />
      ) : data.length === 0 ? (
        <EmptyState illustration={<MapPin className="size-12 text-muted" aria-hidden="true" />} title="Belum ada alamat" description="Simpan alamat rumah atau kantor agar checkout lebih cepat." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
              <div className="flex items-center gap-2">
                <p className="font-heading font-semibold text-ink">{a.label}</p>
                {a.is_default && <Badge tone="primary">Utama</Badge>}
              </div>
              <p className="text-sm text-muted">{a.address}</p>
              {a.note && <p className="text-caption text-muted">Catatan: {a.note}</p>}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => open(a)}><Pencil className="size-4" aria-hidden="true" /> Ubah</Button>
                <Button size="sm" variant="ghost" className="text-danger" loading={remove.isPending && remove.variables === a.id} onClick={() => remove.mutate(a.id, { onSuccess: (r) => toast.success(r.message) })}>
                  <Trash2 className="size-4" aria-hidden="true" /> Hapus
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Tambah alamat" : "Ubah alamat"}
        size="lg"
        footer={<Button size="lg" className="w-full" loading={save.isPending} onClick={submit}>Simpan Alamat</Button>}
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Input label="Label" placeholder="Rumah, Kantor, Kos" required error={form.formState.errors.label?.message} {...form.register("label")} />
          <AddressMap value={lat != null && lng != null ? { lat, lng } : null} onChange={(la, ln) => { form.setValue("lat", la); form.setValue("lng", ln); }} />
          <Textarea label="Alamat lengkap" rows={2} required error={form.formState.errors.address?.message} {...form.register("address")} />
          <Input label="Catatan untuk kurir" {...form.register("note")} />
          <Checkbox label="Jadikan alamat utama" {...form.register("is_default")} />
        </form>
      </Dialog>
    </div>
  );
}
