"use client";

import { useMemo, useState } from "react";
import { Copy, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import type { Ingredient, ProductRecipe } from "@/lib/admin/finance-types";
import { useSaveRecipe } from "@/lib/admin/finance-queries";
import { errorMessage } from "@/lib/admin/queries";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UNIT_LABEL, formatQty, parseDecimal } from "./shared";
import { useIngredientList } from "./hooks";

interface Row {
  key: number;
  ingredientId: string;
  qty: string;
}
interface VariantDraft {
  option_name: string | null;
  price: number;
  rows: Row[];
}

let seq = 0;
const nextKey = () => ++seq;

export function variantLabel(name: string | null) {
  return name ?? "Standar";
}

/** HPP & margin langsung dihitung di klien: Σ qty × harga per unit bahan. */
function calc(rows: Row[], byId: Map<string, Ingredient>, price: number) {
  const costs = rows.map((r) => {
    const ing = byId.get(r.ingredientId);
    const q = parseDecimal(r.qty);
    return ing && q > 0 ? q * ing.cost_per_unit : 0;
  });
  const hpp = Math.round(costs.reduce((s, c) => s + c, 0));
  const margin = price - hpp;
  const pct = price > 0 ? Math.round((margin / price) * 1000) / 10 : 0;
  return { costs, hpp, margin, pct };
}

function RecipeForm({ recipe, onDone }: { recipe: ProductRecipe; onDone: () => void }) {
  const ingredients = useIngredientList();
  const save = useSaveRecipe();
  const byId = useMemo(() => new Map((ingredients.data ?? []).map((i) => [String(i.id), i])), [ingredients.data]);
  const [variants, setVariants] = useState<VariantDraft[]>(() =>
    recipe.variants.map((v) => ({
      option_name: v.option_name,
      price: v.price,
      rows: v.items.length ? v.items.map((i) => ({ key: nextKey(), ingredientId: String(i.ingredient_id), qty: formatQty(i.qty).replace(/\./g, "") })) : [{ key: nextKey(), ingredientId: "", qty: "" }],
    })),
  );
  const [note, setNote] = useState(recipe.note ?? "");
  const [isSample, setIsSample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchRow = (vi: number, key: number, patch: Partial<Row>) =>
    setVariants((vs) => vs.map((v, i) => (i === vi ? { ...v, rows: v.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) } : v)));
  const addRow = (vi: number) => setVariants((vs) => vs.map((v, i) => (i === vi ? { ...v, rows: [...v.rows, { key: nextKey(), ingredientId: "", qty: "" }] } : v)));
  const removeRow = (vi: number, key: number) => setVariants((vs) => vs.map((v, i) => (i === vi ? { ...v, rows: v.rows.filter((r) => r.key !== key) } : v)));
  const copyFrom = (vi: number, from: number) =>
    setVariants((vs) => vs.map((v, i) => (i === vi ? { ...v, rows: vs[from]!.rows.map((r) => ({ ...r, key: nextKey() })) } : v)));

  const submit = () => {
    setError(null);
    const out = [];
    for (const v of variants) {
      const items = [];
      for (const r of v.rows) {
        if (!r.ingredientId && !r.qty.trim()) continue; // baris kosong diabaikan
        const q = parseDecimal(r.qty);
        if (!r.ingredientId || !(q > 0)) {
          setError(`Lengkapi bahan & takaran (> 0) di varian ${variantLabel(v.option_name)}.`);
          return;
        }
        items.push({ ingredient_id: Number(r.ingredientId), qty: q });
      }
      const ids = items.map((i) => i.ingredient_id);
      if (new Set(ids).size !== ids.length) {
        setError(`Ada bahan yang dobel di varian ${variantLabel(v.option_name)} — gabungkan takarannya.`);
        return;
      }
      out.push({ option_name: v.option_name, items });
    }
    save.mutate(
      { productId: recipe.product_id, body: { is_sample: isSample, note: note.trim() || null, variants: out } },
      {
        onSuccess: onDone,
        onError: (e) => {
          const msg = errorMessage(e);
          setError(msg);
          toast.error("Gagal menyimpan resep", { description: msg });
        },
      },
    );
  };

  const options = (kind: Ingredient["kind"]) =>
    (ingredients.data ?? [])
      .filter((i) => i.kind === kind)
      .map((i) => (
        <option key={i.id} value={i.id}>
          {i.name} ({UNIT_LABEL[i.unit]})
        </option>
      ));

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      {variants.map((v, vi) => {
        const c = calc(v.rows, byId, v.price);
        const label = variantLabel(v.option_name);
        return (
          <fieldset key={label} className="rounded-2xl border border-line p-3 md:p-4">
            <legend className="px-1 font-heading text-base font-semibold text-ink">{label}</legend>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-caption text-muted">Harga jual {formatRupiah(v.price)}</p>
              {variants.length > 1 && (
                <label className="flex items-center gap-2 text-sm text-ink">
                  <Copy className="size-4 text-muted" aria-hidden="true" />
                  <span className="sr-only">Salin bahan ke varian {label} dari</span>
                  <select
                    value=""
                    onChange={(e) => e.target.value !== "" && copyFrom(vi, Number(e.target.value))}
                    className="h-11 rounded-lg border border-line bg-bg px-2 text-sm text-ink md:h-9"
                  >
                    <option value="">Salin dari varian…</option>
                    {variants.map((o, oi) => (oi !== vi ? <option key={oi} value={oi}>{variantLabel(o.option_name)}</option> : null))}
                  </select>
                </label>
              )}
            </div>

            <ul className="flex flex-col gap-2">
              {v.rows.map((r, ri) => {
                const ing = byId.get(r.ingredientId);
                return (
                  <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_120px_100px_auto]">
                    <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                      <label htmlFor={`ing-${r.key}`} className={cn("text-caption font-medium text-muted", ri > 0 && "sm:sr-only")}>Bahan</label>
                      <select
                        id={`ing-${r.key}`}
                        value={r.ingredientId}
                        onChange={(e) => patchRow(vi, r.key, { ingredientId: e.target.value })}
                        className="h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20"
                        aria-label={`Bahan baris ${ri + 1} varian ${label}`}
                      >
                        <option value="">{ingredients.isLoading ? "Memuat…" : "Pilih bahan"}</option>
                        <optgroup label="Bahan">{options("bahan")}</optgroup>
                        <optgroup label="Kemasan">{options("kemasan")}</optgroup>
                      </select>
                    </div>
                    <Input
                      label="Takaran"
                      className={cn(ri > 0 && "[&>label]:sm:sr-only")}
                      inputMode="decimal"
                      value={r.qty}
                      onChange={(e) => patchRow(vi, r.key, { qty: e.target.value })}
                      suffix={<span className="pr-1.5 text-caption text-muted">{ing ? UNIT_LABEL[ing.unit] : ""}</span>}
                      aria-label={`Takaran baris ${ri + 1} varian ${label}`}
                    />
                    <p className="flex h-11 items-center justify-end text-sm text-ink tabular-nums" aria-label="Biaya baris">
                      {formatRupiah(c.costs[ri] ?? 0)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeRow(vi, r.key)}
                      aria-label={`Hapus baris ${ri + 1} varian ${label}`}
                      className="grid size-11 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => addRow(vi)}>
              <Plus className="size-4" aria-hidden="true" /> Tambah bahan
            </Button>

            <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-cream/60 p-3 text-sm" aria-live="polite">
              <div>
                <dt className="text-caption text-muted">HPP</dt>
                <dd className="font-heading font-semibold text-ink tabular-nums">{formatRupiah(c.hpp)}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted">Margin</dt>
                <dd className={cn("font-heading font-semibold tabular-nums", c.margin < 0 ? "text-danger" : "text-ink")}>{formatRupiah(c.margin)}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted">Margin %</dt>
                <dd className={cn("font-heading font-semibold tabular-nums", c.margin < 0 ? "text-danger" : "text-ink")}>{c.pct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</dd>
              </div>
            </dl>
          </fieldset>
        );
      })}

      <Textarea label="Cara membuat (opsional)" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. Aren, creamer, dan susu dishake sampai rata, tuang lewat saringan, tambah es, lalu espresso." />
      <Checkbox label="Masih contoh" description="Centang bila takaran belum pasti — akan diberi tanda “Contoh” di daftar." checked={isSample} onChange={(e) => setIsSample(e.target.checked)} />

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={save.isPending}>Simpan resep</Button>
      </div>
    </form>
  );
}

export function RecipeDialog({ recipe, onClose }: { recipe: ProductRecipe | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(recipe)} onClose={onClose} title={recipe ? `Resep ${recipe.product_name}` : "Resep"} description="Takaran per sajian. HPP dihitung dari harga per unit bahan saat ini." size="xl">
      {recipe && <RecipeForm key={recipe.product_id} recipe={recipe} onDone={onClose} />}
    </Dialog>
  );
}
