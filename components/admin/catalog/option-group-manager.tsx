"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { ArrowDown, ArrowUp, Pencil, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { z } from "zod";
import { confirm } from "@/components/admin/ui/confirm";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Switch } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { applyServerErrors, zInt } from "@/lib/admin/form";
import { can } from "@/lib/admin/permissions";
import { adminKeys, useAdminDelete, useAdminList, useAdminSave, useAdminSession } from "@/lib/admin/queries";
import type { OptionGroup } from "@/lib/admin/types";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * Grup opsi (Ukuran, Gula, Es, Topping). PATCH mengirim SEMUA opsi: opsi lama membawa `id`,
 * opsi tanpa `id` dibuat baru, opsi yang tidak dikirim dihapus server. Urutan = urutan array.
 */

const schema = z.object({
  name: z.string().trim().min(1, "Nama grup wajib diisi.").max(100, "Maksimal 100 karakter."),
  type: z.enum(["single", "multi"]),
  is_required: z.boolean(),
  options: z
    .array(
      z.object({
        option_id: z.number().nullable(),
        name: z.string().trim().min(1, "Nama opsi wajib diisi.").max(100, "Maksimal 100 karakter."),
        price_delta: zInt({ min: -1_000_000, max: 1_000_000, label: "Tambahan harga" }),
      }),
    )
    .min(1, "Tambahkan minimal satu opsi."),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function deltaLabel(n: number) {
  if (n === 0) return "Gratis";
  return `${n > 0 ? "+" : "−"}${formatRupiah(Math.abs(n))}`;
}

function OptionGroupForm({ group, onDone }: { group: OptionGroup | null; onDone: () => void }) {
  const save = useAdminSave<OptionGroup>("option-groups", { invalidate: [adminKeys.resource("products")] });
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: group
      ? { name: group.name, type: group.type, is_required: group.is_required, options: group.options.map((o) => ({ option_id: o.id, name: o.name, price_delta: o.price_delta })) }
      : { name: "", type: "single", is_required: true, options: [{ option_id: null, name: "", price_delta: 0 }] },
  });
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = form;
  const { fields, append, remove, move } = useFieldArray({ control, name: "options" });
  const type = watch("type");

  const submit = handleSubmit((v) =>
    save.mutate(
      {
        id: group?.id,
        // Opsi lama membawa `id` agar diperbarui (bukan dibuat ulang)
        body: { ...v, options: v.options.map((o) => (o.option_id ? { id: o.option_id, name: o.name, price_delta: o.price_delta } : { name: o.name, price_delta: o.price_delta })) },
      },
      { onSuccess: onDone, onError: (e) => applyServerErrors(e, form.setError, "Gagal menyimpan grup opsi") },
    ),
  );

  return (
    <form id="option-group-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <Input label="Nama grup" required placeholder="Mis. Ukuran, Gula, Topping" error={errors.name?.message} {...register("name")} autoFocus />

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink">Jenis pilihan</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            { v: "single", t: "Pilih satu", d: "Pelanggan memilih tepat satu (mis. ukuran)." },
            { v: "multi", t: "Pilih banyak", d: "Boleh lebih dari satu (mis. topping)." },
          ] as const).map((o) => (
            <label key={o.v} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition", type === o.v ? "border-primary bg-primary/5" : "border-line hover:border-primary/60")}>
              <input type="radio" value={o.v} {...register("type")} className="mt-0.5 size-4 accent-[var(--color-primary)]" />
              <span>
                <span className="block text-sm font-semibold text-ink">{o.t}</span>
                <span className="block text-caption text-muted">{o.d}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Switch checked={watch("is_required")} onChange={(v) => setValue("is_required", v, { shouldDirty: true })} label="Wajib dipilih pelanggan" />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink">
          Daftar opsi<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
        </legend>
        <div className="hidden grid-cols-[minmax(0,1fr)_10rem_6.5rem] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid">
          <span>Nama opsi</span>
          <span>Tambahan harga</span>
          <span className="sr-only">Aksi</span>
        </div>
        <ol className="flex flex-col gap-2">
          {fields.map((f, i) => (
            <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-xl border border-line bg-bg p-2 sm:grid-cols-[minmax(0,1fr)_10rem_6.5rem] sm:border-0 sm:bg-transparent sm:p-0">
              <Input
                label={`Nama opsi ${i + 1}`}
                className="[&>label]:sr-only"
                placeholder="Mis. Large"
                error={errors.options?.[i]?.name?.message}
                {...register(`options.${i}.name`)}
              />
              <Input
                label={`Tambahan harga opsi ${i + 1}`}
                className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto [&>label]:sr-only"
                prefix="Rp"
                type="number"
                inputMode="numeric"
                step={500}
                error={errors.options?.[i]?.price_delta?.message}
                {...register(`options.${i}.price_delta`)}
              />
              <div className="row-span-2 flex flex-col gap-0.5 sm:row-span-1 sm:flex-row sm:pt-1">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Naikkan opsi ${i + 1}`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-cream hover:text-ink disabled:opacity-30">
                  <ArrowUp className="size-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === fields.length - 1} aria-label={`Turunkan opsi ${i + 1}`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-cream hover:text-ink disabled:opacity-30">
                  <ArrowDown className="size-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => remove(i)} disabled={fields.length === 1} aria-label={`Hapus opsi ${i + 1}`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-30">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
        {errors.options?.message && <p role="alert" className="text-caption text-danger">{errors.options.message}</p>}
        {errors.options?.root?.message && <p role="alert" className="text-caption text-danger">{errors.options.root.message}</p>}
        <Button variant="outline" size="sm" className="self-start" onClick={() => append({ option_id: null, name: "", price_delta: 0 })}>
          <Plus className="size-4" aria-hidden="true" /> Tambah opsi
        </Button>
        <p className="text-caption text-muted">Isi 0 untuk opsi tanpa biaya tambahan; nilai negatif mengurangi harga. Opsi yang dihapus dari daftar ini ikut dihapus saat disimpan.</p>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={save.isPending}>{group ? "Simpan perubahan" : "Tambah grup opsi"}</Button>
      </div>
    </form>
  );
}

export function OptionGroupManager() {
  const { data: user } = useAdminSession();
  const manage = can(user, "catalog.manage");
  const list = useAdminList<OptionGroup>("option-groups");
  const remove = useAdminDelete("option-groups", { invalidate: [adminKeys.resource("products")] });
  const [editing, setEditing] = useState<OptionGroup | null | "new">(null);
  const rows = list.data?.data ?? [];

  const onDelete = async (g: OptionGroup) => {
    const { ok } = await confirm({
      title: `Hapus grup opsi "${g.name}"?`,
      description: "Grup ini beserta opsinya akan dilepas dari semua produk yang memakainya. Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Hapus grup",
    });
    if (ok) remove.mutate(g.id);
  };

  return (
    <>
      <PageHeader
        title="Opsi Varian"
        description="Grup pilihan seperti ukuran, tingkat gula, es, dan topping yang bisa dipasang ke produk."
        breadcrumb={[{ label: "Katalog" }, { label: "Opsi Varian" }]}
        actions={manage && <Button onClick={() => setEditing("new")}><Plus className="size-4" aria-hidden="true" /> Tambah grup opsi</Button>}
      />

      {list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Memuat grup opsi">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          illustration={<SlidersHorizontal className="size-10 text-muted" aria-hidden="true" />}
          title="Belum ada grup opsi"
          description="Buat grup seperti Ukuran atau Topping, lalu pasang ke produk di halaman ubah produk."
          action={manage && <Button onClick={() => setEditing("new")}>Tambah grup opsi</Button>}
        />
      ) : (
        <ul className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", list.isFetching && "opacity-80 transition-opacity")}>
          {rows.map((g) => (
            <li key={g.id} className="flex flex-col rounded-2xl border border-line bg-surface shadow-soft">
              <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
                <div className="min-w-0">
                  <h2 className="truncate font-heading text-base font-semibold text-ink">{g.name}</h2>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>{g.type === "single" ? "Pilih satu" : "Pilih banyak"}</Badge>
                    {g.is_required ? <Badge tone="warning">Wajib</Badge> : <Badge>Opsional</Badge>}
                  </div>
                </div>
                {manage && (
                  <div className="-mr-1 flex shrink-0 gap-0.5">
                    <button type="button" onClick={() => setEditing(g)} aria-label={`Ubah grup ${g.name}`} title="Ubah" className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-cream hover:text-ink">
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => onDelete(g)} aria-label={`Hapus grup ${g.name}`} title="Hapus" className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </header>
              <table className="w-full text-sm">
                <caption className="sr-only">Opsi dalam grup {g.name}</caption>
                <thead className="sr-only">
                  <tr><th scope="col">Opsi</th><th scope="col">Tambahan harga</th></tr>
                </thead>
                <tbody>
                  {g.options.map((o) => (
                    <tr key={o.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 text-ink">{o.name}</td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums", o.price_delta === 0 ? "text-muted" : "font-semibold text-ink")}>{deltaLabel(o.price_delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} size="lg" title={editing === "new" ? "Tambah grup opsi" : "Ubah grup opsi"}>
        {editing !== null && <OptionGroupForm key={editing === "new" ? "new" : editing.id} group={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
    </>
  );
}
