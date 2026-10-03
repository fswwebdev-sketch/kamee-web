"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { confirm } from "@/components/admin/ui/confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { applyServerErrors } from "@/lib/admin/form";
import type { BookMethod, Ingredient } from "@/lib/admin/finance-types";
import { useCreateStockPurchase, useDeleteStockPurchase, useStockPurchases } from "@/lib/admin/finance-queries";
import { formatRupiah } from "@/lib/format";
import { MethodPicker, RupiahInput, UNIT_LABEL, formatDay, formatQty, formatQtyUnit, methodText, parseDecimal, todayYmd } from "./shared";
import { useIngredientList } from "./hooks";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi."),
  supplier: z.string().trim().max(100, "Maksimal 100 karakter."),
  method: z.enum(["cash", "qris", "bank_transfer"]),
  bank: z.string().trim().max(50),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter."),
  items: z
    .array(
      z.object({
        ingredient_id: z.string().min(1, "Pilih bahan."),
        packs: z
          .string()
          .trim()
          .refine((s) => parseDecimal(s) > 0, "Jumlah kemasan harus lebih dari 0."),
        pack_price: z.number({ invalid_type_error: "Isi harga." }).int().min(0).nullable(),
      }),
    )
    .min(1, "Tambahkan minimal satu bahan."),
});
type Values = z.infer<typeof schema>;

const emptyRow = { ingredient_id: "", packs: "1", pack_price: null };

function PurchaseForm({ onDone }: { onDone: () => void }) {
  const ingredients = useIngredientList();
  const create = useCreateStockPurchase();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayYmd(), supplier: "", method: "cash", bank: "", note: "", items: [emptyRow] },
  });
  const { register, handleSubmit, watch, setValue, setError, control, formState: { errors } } = form;
  const rows = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const all = ingredients.data ?? [];
  const byId = new Map(all.map((i) => [String(i.id), i]));
  const subtotal = (i: Values["items"][number]) => {
    const p = parseDecimal(i.packs);
    return p > 0 && i.pack_price != null ? Math.round(p * i.pack_price) : 0;
  };
  const total = items.reduce((s, i) => s + subtotal(i), 0);

  const submit = handleSubmit((v) =>
    create.mutate(
      {
        date: v.date,
        supplier: v.supplier || null,
        method: v.method,
        bank: v.method === "bank_transfer" ? v.bank || null : null,
        note: v.note || null,
        items: v.items.map((i) => ({ ingredient_id: Number(i.ingredient_id), packs: parseDecimal(i.packs), pack_price: i.pack_price ?? 0 })),
      },
      { onSuccess: onDone, onError: (e) => applyServerErrors(e, setError, "Gagal menyimpan belanja") },
    ),
  );

  const options = (kind: Ingredient["kind"]) =>
    all
      .filter((i) => i.kind === kind)
      .map((i) => (
        <option key={i.id} value={i.id}>
          {i.name} ({i.pack_label})
        </option>
      ));

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Tanggal belanja" type="date" required error={errors.date?.message} {...register("date")} />
        <Input label="Toko / pemasok (opsional)" placeholder="mis. Toko Bahan Kopi" maxLength={100} error={errors.supplier?.message} {...register("supplier")} />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium text-ink">Barang yang dibeli</legend>
        {rows.fields.map((f, idx) => {
          const it = items[idx];
          const ing = it ? byId.get(it.ingredient_id) : undefined;
          const err = errors.items?.[idx];
          return (
            <div key={f.id} className="rounded-xl border border-line bg-bg p-3">
              <div className="flex items-start gap-2">
                <Select
                  label={`Bahan ${idx + 1}`}
                  required
                  className="flex-1"
                  error={err?.ingredient_id?.message}
                  {...register(`items.${idx}.ingredient_id`, {
                    onChange: (e) => {
                      const picked = byId.get(e.target.value);
                      if (picked) setValue(`items.${idx}.pack_price`, picked.pack_price || null);
                    },
                  })}
                >
                  <option value="">{ingredients.isLoading ? "Memuat…" : "Pilih bahan/kemasan"}</option>
                  <optgroup label="Bahan">{options("bahan")}</optgroup>
                  <optgroup label="Kemasan">{options("kemasan")}</optgroup>
                </Select>
                {rows.fields.length > 1 && (
                  <button type="button" onClick={() => rows.remove(idx)} aria-label={`Hapus baris ${idx + 1}`} className="mt-7 grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger">
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Input
                  label="Jumlah kemasan"
                  required
                  inputMode="decimal"
                  error={err?.packs?.message}
                  hint={ing ? `= ${formatQtyUnit((parseDecimal(it?.packs ?? "") || 0) * ing.pack_size, ing.unit)}` : undefined}
                  {...register(`items.${idx}.packs`)}
                />
                <Controller
                  control={control}
                  name={`items.${idx}.pack_price`}
                  render={({ field }) => <RupiahInput label="Harga / kemasan" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={err?.pack_price?.message} />}
                />
              </div>
              <p className="mt-2 text-right text-sm text-muted">
                Subtotal <strong className="text-ink tabular-nums">{formatRupiah(it ? subtotal(it) : 0)}</strong>
              </p>
            </div>
          );
        })}
        {errors.items?.root?.message && <p role="alert" className="text-caption text-danger">{errors.items.root.message}</p>}
        <Button variant="outline" size="sm" className="self-start" onClick={() => rows.append(emptyRow)}>
          <Plus className="size-4" aria-hidden="true" /> Tambah baris
        </Button>
      </fieldset>

      <MethodPicker method={watch("method")} bank={watch("bank")} onMethod={(m: BookMethod) => setValue("method", m)} onBank={(b) => setValue("bank", b)} label="Dibayar dengan" />
      <Textarea label="Catatan (opsional)" rows={2} maxLength={500} error={errors.note?.message} {...register("note")} />

      <div className="flex items-center justify-between rounded-xl bg-cream/60 px-3.5 py-3" aria-live="polite">
        <span className="text-sm font-medium text-ink">Total belanja</span>
        <span className="font-heading text-lg font-bold text-ink tabular-nums">{formatRupiah(total)}</span>
      </div>
      <p className="text-caption text-muted">Stok bertambah sesuai jumlah × isi kemasan, harga kemasan bahan diperbarui, dan total belanja otomatis tercatat sebagai uang keluar di Buku Kas.</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={create.isPending}>Simpan belanja</Button>
      </div>
    </form>
  );
}

export function PurchaseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Catat belanja stok" size="lg">
      {open && <PurchaseForm onDone={onClose} />}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Riwayat belanja */

export function PurchaseList({ onCreate }: { onCreate: () => void }) {
  const [page, setPage] = useState(1);
  const list = useStockPurchases({ page });
  const remove = useDeleteStockPurchase();
  const meta = list.data?.meta;

  if (list.isError) return <ErrorState description="Riwayat belanja tidak dapat dimuat." onRetry={() => list.refetch()} />;
  if (list.isLoading) return <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>;
  if (!list.data?.data.length)
    return (
      <EmptyState
        illustration={<ShoppingCart className="size-10 text-muted" aria-hidden="true" />}
        title="Belum ada belanja stok"
        description="Catat belanja bahan & kemasan agar stok dan HPP selalu sesuai."
        action={<Button onClick={onCreate}>Catat belanja stok</Button>}
      />
    );

  return (
    <div className="flex flex-col gap-3">
      <ul className={list.isFetching ? "flex flex-col gap-3 opacity-70" : "flex flex-col gap-3"}>
        {list.data.data.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-surface shadow-soft">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <p className="font-heading font-semibold text-ink">
                  {formatDay(p.date)} {p.supplier && <span className="font-normal text-muted">· {p.supplier}</span>}
                </p>
                <p className="text-caption text-muted">
                  Belanja #{p.id} · {methodText(p.method, p.bank)}
                  {p.created_by && ` · dicatat ${p.created_by.name}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-bold text-ink tabular-nums">{formatRupiah(p.total)}</span>
                <button
                  type="button"
                  aria-label={`Batalkan belanja #${p.id}`}
                  title="Batalkan belanja"
                  className="grid size-11 place-items-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger md:size-9"
                  onClick={async () => {
                    const { ok } = await confirm({
                      title: `Batalkan belanja #${p.id}?`,
                      description: `Stok dari belanja ini (${p.items.length} barang) dikurangi kembali dan catatan uang keluar ${formatRupiah(p.total)} di Buku Kas ikut dihapus.`,
                      confirmLabel: "Ya, batalkan belanja",
                    });
                    if (ok) remove.mutate(p.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </header>
            <ul className="divide-y divide-line px-4">
              {p.items.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {i.ingredient_name} {i.kind === "kemasan" && <Badge className="ml-1">Kemasan</Badge>}
                    </p>
                    <p className="text-caption text-muted tabular-nums">
                      {formatQty(i.packs)} × {i.pack_label} @ {formatRupiah(i.pack_price)} = +{formatQty(i.qty)} {UNIT_LABEL[i.unit]}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-ink tabular-nums">{formatRupiah(i.subtotal)}</span>
                </li>
              ))}
            </ul>
            {p.note && <p className="border-t border-line px-4 py-2.5 text-caption italic text-muted">{p.note}</p>}
          </li>
        ))}
      </ul>
      {meta && meta.last_page > 1 && (
        <nav aria-label="Paginasi belanja" className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setPage((x) => x - 1)} disabled={page <= 1}>
            <ChevronLeft className="size-4" aria-hidden="true" /> Sebelumnya
          </Button>
          <span className="text-sm text-muted tabular-nums">{meta.page}/{meta.last_page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((x) => x + 1)} disabled={page >= meta.last_page}>
            Berikutnya <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}
