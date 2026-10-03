"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { applyServerErrors } from "@/lib/admin/form";
import type { Ingredient, IngredientKind, IngredientUnit } from "@/lib/admin/finance-types";
import { useAdjustStock, useIngredientMovements, useSaveIngredient } from "@/lib/admin/finance-queries";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Note, RupiahInput, Segmented, UNIT_LABEL, formatQty, formatQtyUnit, formatUnitCost, parseDecimal } from "./shared";

/* ------------------------------------------------------------------ Tambah / ubah bahan */

const decimalText = (label: string, opts: { required?: boolean; positive?: boolean } = {}) =>
  z
    .string()
    .trim()
    .superRefine((s, ctx) => {
      if (!s) {
        if (opts.required) ctx.addIssue({ code: "custom", message: `${label} wajib diisi.` });
        return;
      }
      const n = parseDecimal(s);
      if (Number.isNaN(n)) ctx.addIssue({ code: "custom", message: `${label} harus angka (boleh desimal, mis. 2,5).` });
      else if (opts.positive && n <= 0) ctx.addIssue({ code: "custom", message: `${label} harus lebih dari 0.` });
      else if (n < 0) ctx.addIssue({ code: "custom", message: `${label} tidak boleh minus.` });
    });

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100, "Nama maksimal 100 karakter."),
  kind: z.enum(["bahan", "kemasan"]),
  unit: z.enum(["ml", "gram", "pcs"]),
  pack_size: decimalText("Isi per kemasan", { required: true, positive: true }),
  pack_label: z.string().trim().max(60, "Label kemasan maksimal 60 karakter."),
  pack_price: z.number().int().min(0).nullable(),
  opening_stock: decimalText("Stok awal"),
  min_stock: decimalText("Batas minimum"),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter."),
});
type Values = z.infer<typeof schema>;

const str = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

function IngredientForm({ ingredient, initialKind, onDone }: { ingredient: Ingredient | null; initialKind: IngredientKind; onDone: () => void }) {
  const save = useSaveIngredient();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: ingredient
      ? {
          name: ingredient.name,
          kind: ingredient.kind,
          unit: ingredient.unit,
          pack_size: str(ingredient.pack_size),
          pack_label: ingredient.pack_label,
          pack_price: ingredient.pack_price,
          opening_stock: "",
          min_stock: str(ingredient.min_stock),
          note: ingredient.note ?? "",
        }
      : { name: "", kind: initialKind, unit: initialKind === "kemasan" ? "pcs" : "gram", pack_size: "", pack_label: "", pack_price: null, opening_stock: "", min_stock: "", note: "" },
  });
  const { register, handleSubmit, watch, setValue, setError, control, formState: { errors } } = form;
  const unit = watch("unit") as IngredientUnit;
  const size = parseDecimal(watch("pack_size"));
  const price = watch("pack_price");
  const perUnit = size > 0 && price != null ? Math.round((price / size) * 100) / 100 : null;

  const submit = handleSubmit((v) => {
    const size = parseDecimal(v.pack_size);
    const num = (s: string) => (s ? parseDecimal(s) : null);
    save.mutate(
      {
        id: ingredient?.id,
        body: {
          name: v.name,
          kind: v.kind,
          unit: v.unit,
          pack_size: size,
          pack_label: v.pack_label || `${formatQty(size)} ${UNIT_LABEL[v.unit]}`,
          pack_price: v.pack_price ?? 0,
          min_stock: num(v.min_stock),
          note: v.note || null,
          ...(ingredient ? {} : { opening_stock: num(v.opening_stock) }),
        },
      },
      { onSuccess: onDone, onError: (e) => applyServerErrors(e, setError, "Gagal menyimpan bahan") },
    );
  });

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <Input label="Nama" required placeholder="mis. Sirup Gula Aren" maxLength={100} error={errors.name?.message} {...register("name")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Segmented<IngredientKind>
          label="Jenis"
          value={watch("kind")}
          onChange={(k) => setValue("kind", k)}
          options={[
            { value: "bahan", label: "Bahan" },
            { value: "kemasan", label: "Kemasan" },
          ]}
        />
        <Select label="Satuan" required error={errors.unit?.message} {...register("unit")}>
          <option value="ml">ml (cair)</option>
          <option value="gram">gram</option>
          <option value="pcs">pcs (biji)</option>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={`Isi per kemasan (${UNIT_LABEL[unit]})`}
          required
          inputMode="decimal"
          placeholder={unit === "pcs" ? "1" : "1000"}
          error={errors.pack_size?.message}
          hint="Mis. 1 liter = 1000 ml"
          {...register("pack_size")}
        />
        <Input label="Label kemasan" placeholder="mis. 1 liter, 1 kg, 1 pak isi 65" maxLength={60} error={errors.pack_label?.message} {...register("pack_label")} />
      </div>
      <Controller
        control={control}
        name="pack_price"
        render={({ field }) => <RupiahInput label="Harga per kemasan" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={errors.pack_price?.message} hint="Kosongkan bila belum tahu (dihitung Rp0)." />}
      />
      <p className="rounded-xl bg-cream/60 px-3.5 py-2.5 text-sm text-ink" aria-live="polite">
        Harga per unit: <strong className="tabular-nums">{perUnit != null ? formatUnitCost(perUnit, unit) : "—"}</strong>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {!ingredient && (
          <Input label={`Stok awal (${UNIT_LABEL[unit]})`} inputMode="decimal" placeholder="0" error={errors.opening_stock?.message} hint="Jumlah yang ada sekarang, dalam satuan." {...register("opening_stock")} />
        )}
        <Input label={`Batas minimum (${UNIT_LABEL[unit]})`} inputMode="decimal" placeholder="opsional" error={errors.min_stock?.message} hint="Muncul peringatan bila stok ≤ batas ini." {...register("min_stock")} />
      </div>
      <Textarea label="Catatan (opsional)" rows={2} maxLength={500} error={errors.note?.message} {...register("note")} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={save.isPending}>{ingredient ? "Simpan perubahan" : "Tambah"}</Button>
      </div>
    </form>
  );
}

export function IngredientDialog({ open, ingredient, initialKind = "bahan", onClose }: { open: boolean; ingredient: Ingredient | null; initialKind?: IngredientKind; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={ingredient ? `Ubah ${ingredient.name}` : initialKind === "kemasan" ? "Tambah kemasan" : "Tambah bahan"} size="md">
      {open && <IngredientForm key={ingredient?.id ?? `new-${initialKind}`} ingredient={ingredient} initialKind={initialKind} onDone={onClose} />}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Stok opname */

function OpnameForm({ ingredient, onDone }: { ingredient: Ingredient; onDone: () => void }) {
  const adjust = useAdjustStock();
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const n = parseDecimal(counted);
  const diff = Number.isNaN(n) ? null : Math.round((n - ingredient.stock_qty) * 100) / 100;

  const submit = () => {
    if (Number.isNaN(n) || n < 0) {
      setError("Isi jumlah hasil hitung (angka ≥ 0).");
      return;
    }
    adjust.mutate(
      { id: ingredient.id, counted_qty: n, note: note.trim() || null },
      {
        onSuccess: onDone,
        onError: (e) => applyServerErrors(e, (_f, err) => setError(err.message ?? "Gagal menyimpan."), "Gagal menyimpan stok opname"),
      },
    );
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-cream/60 p-3.5 text-sm">
        <div>
          <dt className="text-caption text-muted">Stok di sistem</dt>
          <dd className={cn("font-heading text-lg font-semibold tabular-nums", ingredient.stock_qty <= 0 ? "text-danger" : "text-ink")}>{formatQtyUnit(ingredient.stock_qty, ingredient.unit)}</dd>
        </div>
        <div aria-live="polite">
          <dt className="text-caption text-muted">Selisih</dt>
          <dd className={cn("font-heading text-lg font-semibold tabular-nums", diff == null ? "text-muted" : diff < 0 ? "text-danger" : diff > 0 ? "text-success" : "text-ink")}>
            {diff == null ? "—" : `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${formatQtyUnit(Math.abs(diff), ingredient.unit)}`}
          </dd>
        </div>
      </dl>
      <Input
        label={`Hasil hitung fisik (${UNIT_LABEL[ingredient.unit]})`}
        required
        inputMode="decimal"
        value={counted}
        onChange={(e) => {
          setCounted(e.target.value);
          setError(null);
        }}
        error={error ?? undefined}
        autoFocus
      />
      <Input label="Catatan (opsional)" placeholder="mis. tumpah, rusak, hitung ulang" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={adjust.isPending}>Simpan stok</Button>
      </div>
    </form>
  );
}

export function OpnameDialog({ ingredient, onClose }: { ingredient: Ingredient | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(ingredient)} onClose={onClose} title="Stok opname" description={ingredient ? `${ingredient.name} — samakan stok sistem dengan hasil hitung fisik.` : undefined} size="sm">
      {ingredient && <OpnameForm key={ingredient.id} ingredient={ingredient} onDone={onClose} />}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Riwayat mutasi */

function Movements({ ingredient }: { ingredient: Ingredient }) {
  const [page, setPage] = useState(1);
  const list = useIngredientMovements(ingredient.id, page);
  const meta = list.data?.meta;
  if (list.isError) return <ErrorState description="Riwayat stok tidak dapat dimuat." onRetry={() => list.refetch()} />;
  return (
    <div className="flex flex-col gap-3">
      {list.isLoading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : !list.data?.data.length ? (
        <p className="py-8 text-center text-sm text-muted">Belum ada mutasi stok.</p>
      ) : (
        <ul className={cn("flex flex-col divide-y divide-line rounded-xl border border-line", list.isFetching && "opacity-70")} aria-label={`Riwayat stok ${ingredient.name}`}>
          {list.data.data.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {m.type_label}
                  {m.reference && <span className="ml-1.5 font-mono text-caption font-medium text-muted">{m.reference}</span>}
                </p>
                <p className="text-caption text-muted">
                  {formatDateTime(m.created_at)}
                  {m.created_by && ` · ${m.created_by.name}`}
                  {m.unit_cost != null && ` · ${formatUnitCost(m.unit_cost, ingredient.unit)}`}
                </p>
                {m.note && <p className="text-caption italic text-muted">{m.note}</p>}
              </div>
              <span className={cn("shrink-0 font-semibold tabular-nums", m.qty < 0 ? "text-danger" : "text-success")}>
                {m.qty > 0 ? "+" : m.qty < 0 ? "−" : ""}
                {formatQtyUnit(Math.abs(m.qty), ingredient.unit)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {meta && meta.last_page > 1 && (
        <nav aria-label="Paginasi riwayat" className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
            <ChevronLeft className="size-4" aria-hidden="true" /> Sebelumnya
          </Button>
          <span className="text-sm text-muted tabular-nums">{meta.page}/{meta.last_page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= meta.last_page}>
            Berikutnya <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}

export function MovementsDialog({ ingredient, onClose }: { ingredient: Ingredient | null; onClose: () => void }) {
  return (
    <Dialog
      open={Boolean(ingredient)}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <History className="size-5 text-primary" aria-hidden="true" /> Riwayat stok
        </span>
      }
      description={ingredient ? `${ingredient.name} · stok sekarang ${formatQtyUnit(ingredient.stock_qty, ingredient.unit)}` : undefined}
      size="lg"
    >
      {ingredient && <Movements key={ingredient.id} ingredient={ingredient} />}
    </Dialog>
  );
}

/** Penjelasan singkat cara menghitung harga per unit. */
export function UnitCostHelp() {
  return (
    <Note>
      <p className="font-semibold">Cara hitung HPP bahan</p>
      <p className="mt-0.5 text-muted">
        Harga per unit = harga kemasan ÷ isi kemasan. Contoh: Sirup Gula Aren 1 liter (±1.000 gr) {formatRupiah(60000)} → {formatRupiah(60000)} ÷ 1.000 = <strong className="text-ink">Rp60/gr</strong>. Resep yang
        memakai 30 gr aren berarti biaya aren {formatRupiah(1800)} per cup.
      </p>
    </Note>
  );
}
