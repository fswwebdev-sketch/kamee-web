"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChefHat, Info, Pencil } from "lucide-react";
import { ProductThumb } from "@/components/admin/catalog/product-thumb";
import { SearchInput } from "@/components/admin/ui/filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductRecipe, RecipeVariant } from "@/lib/admin/finance-types";
import { useRecipes } from "@/lib/admin/finance-queries";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RecipeDialog, variantLabel } from "./recipe-editor";
import { Note, formatQty, UNIT_LABEL } from "./shared";

function servingNoun(option: string | null) {
  return option && /bottle|botol/i.test(option) ? "botol" : "cup";
}

function VariantCard({ v }: { v: RecipeVariant }) {
  const label = variantLabel(v.option_name);
  const empty = v.items.length === 0;
  return (
    <section aria-label={label} className="flex flex-col gap-2 rounded-xl border border-line bg-bg p-3" data-testid="recipe-variant">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink">{label}</h4>
        <span className="text-caption text-muted tabular-nums">Jual {formatRupiah(v.price)}</span>
      </div>
      {empty ? (
        <p className="text-sm text-muted">Belum ada resep.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted">HPP</dt>
            <dd className="text-right font-heading font-semibold text-ink tabular-nums">{formatRupiah(v.hpp)}</dd>
            <dt className="text-muted">Margin</dt>
            <dd className={cn("text-right font-semibold tabular-nums", v.margin < 0 ? "text-danger" : "text-ink")}>
              {formatRupiah(v.margin)} <span className="font-normal text-muted">({v.margin_pct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%)</span>
            </dd>
          </dl>
          <p className={cn("text-caption", v.cups_possible === 0 ? "font-semibold text-danger" : "text-ink")}>
            {v.cups_possible == null ? "—" : `Cukup untuk ${formatNumber(v.cups_possible)} ${servingNoun(v.option_name)}`}
            {v.limiting_ingredient && <span className="text-muted"> · habis duluan: {v.limiting_ingredient}</span>}
          </p>
          <details className="group text-caption">
            <summary className="flex min-h-11 cursor-pointer items-center font-medium text-primary md:min-h-0">Rincian bahan</summary>
            <ul className="mt-1 flex flex-col gap-0.5">
              {v.items.map((i) => (
                <li key={i.ingredient_id} className="flex justify-between gap-2 tabular-nums">
                  <span className="text-ink">
                    {i.ingredient_name} <span className="text-muted">{formatQty(i.qty)} {UNIT_LABEL[i.unit]}</span>
                  </span>
                  <span className="text-muted">{formatRupiah(i.cost)}</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}

export function RecipesView() {
  const recipes = useRecipes();
  const [q, setQ] = useState("");
  const [onlySample, setOnlySample] = useState(false);
  const [editing, setEditing] = useState<ProductRecipe | null>(null);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (recipes.data ?? []).filter((r) => (!term || r.product_name.toLowerCase().includes(term)) && (!onlySample || r.is_sample || r.variants.every((v) => !v.items.length)));
    const map = new Map<string, ProductRecipe[]>();
    list.forEach((r) => map.set(r.category, [...(map.get(r.category) ?? []), r]));
    return [...map.entries()];
  }, [recipes.data, q, onlySample]);

  const missing = (recipes.data ?? []).filter((r) => r.variants.every((v) => v.items.length === 0));
  const samples = (recipes.data ?? []).filter((r) => r.is_sample).length;

  return (
    <>
      <PageHeader title="Resep & HPP" description="Takaran bahan per menu → HPP (modal per sajian), margin, dan perkiraan berapa sajian lagi yang bisa dibuat dari stok." />

      {recipes.data && (samples > 0 || missing.length > 0) && (
        <Note tone="warning" icon={<AlertTriangle />} className="mb-4">
          {samples > 0 && <p><strong>{samples} resep masih contoh</strong> — takaran perkiraan, ubah sesuai resep asli agar HPP akurat.</p>}
          {missing.length > 0 && <p className="mt-0.5">Belum ada resep: {missing.map((m) => m.product_name).join(", ")}.</p>}
        </Note>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-soft md:p-4">
        <SearchInput value={q} onChange={setQ} placeholder="Cari menu…" label="Cari menu" />
        <Switch checked={onlySample} onChange={setOnlySample} label="Hanya contoh / belum ada resep" />
      </div>

      {recipes.isError ? (
        <ErrorState description="Resep tidak dapat dimuat." onRetry={() => recipes.refetch()} />
      ) : recipes.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : groups.length === 0 ? (
        <EmptyState illustration={<ChefHat className="size-10 text-muted" aria-hidden="true" />} title="Menu tidak ditemukan" description="Coba kata kunci lain atau matikan filter." />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(([category, list], gi) => (
            <section key={category} aria-labelledby={`cat-${gi}`}>
              <h2 id={`cat-${gi}`} className="mb-3 font-heading text-lg font-semibold text-ink">{category}</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {list.map((r) => (
                  <article key={r.product_id} aria-labelledby={`recipe-${r.product_id}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft" data-testid={`recipe-${r.product_id}`}>
                    <header className="flex items-start gap-3">
                      <ProductThumb src={r.image_url} alt="" />
                      <div className="min-w-0 flex-1">
                        <h3 id={`recipe-${r.product_id}`} className="font-heading text-base font-semibold text-ink">{r.product_name}</h3>
                        {r.is_sample && <Badge tone="warning" className="mt-1">Contoh — ubah sesuai resep</Badge>}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setEditing(r)} aria-label={`Ubah resep ${r.product_name}`}>
                        <Pencil className="size-4" aria-hidden="true" /> Ubah
                      </Button>
                    </header>
                    <div className={cn("grid gap-2", r.variants.length > 1 ? "sm:grid-cols-2 xl:grid-cols-3" : "")}>
                      {r.variants.map((v) => <VariantCard key={variantLabel(v.option_name)} v={v} />)}
                    </div>
                    {r.note && (
                      <p className="rounded-xl bg-cream/60 px-3 py-2 text-caption text-ink">
                        <span className="font-semibold">Cara membuat: </span>
                        {r.note}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Note icon={<Info />} className="mt-6">
        <p className="font-semibold">Cara menghitung</p>
        <p className="mt-0.5 text-muted">
          HPP = Σ (takaran × harga per unit bahan). Harga per unit = harga kemasan ÷ isi kemasan (lihat Bahan &amp; Stok). Margin = harga jual − HPP. “Cukup untuk” = stok bahan ÷ takaran,
          diambil yang paling sedikit. Es batu tidak dihitung per cup karena dicatat sebagai pengeluaran di Buku Kas.
        </p>
      </Note>

      <RecipeDialog recipe={editing} onClose={() => setEditing(null)} />
    </>
  );
}
