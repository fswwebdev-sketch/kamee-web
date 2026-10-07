"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChefHat, Info, Pencil, Tags } from "lucide-react";
import { ProductThumb } from "@/components/admin/catalog/product-thumb";
import { SearchInput } from "@/components/admin/ui/filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductRecipe, RecipeVariant } from "@/lib/admin/finance-types";
import { DEFAULT_MARKUP, MARKUP_TARGETS, markupOf, suggestPrice } from "@/lib/admin/finance-calc";
import { useRecipes } from "@/lib/admin/finance-queries";
import { formatNumber, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RecipeDialog, variantLabel } from "./recipe-editor";
import { Note, Segmented, formatQty, UNIT_LABEL } from "./shared";

const fmtPct = (n: number) => `${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}%`;

function servingNoun(option: string | null) {
  return option && /bottle|botol/i.test(option) ? "botol" : "cup";
}

function VariantCard({ v, markup }: { v: RecipeVariant; markup: number }) {
  const label = variantLabel(v.option_name);
  const empty = v.items.length === 0;
  const target = suggestPrice(v.hpp, markup);
  const nowMarkup = markupOf(v.price, v.hpp);
  const gap = target - v.price;
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
          {target > 0 && (
            <div className={cn("flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-caption", gap > 0 ? "bg-warning/10" : "bg-cream/60")} data-testid="price-suggestion">
              <span className="text-muted">Saran harga · untung {fmtPct(markup)}</span>
              <span className="font-heading text-base font-semibold text-ink tabular-nums">{formatRupiah(target)}</span>
              <span className={cn(gap > 0 ? "text-ink" : "text-muted")}>
                {gap > 0 ? `Naik ${formatRupiah(gap)}` : "Sudah sesuai target"}
                {nowMarkup != null && <span className="text-muted"> · sekarang {fmtPct(nowMarkup)}</span>}
              </span>
            </div>
          )}
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
  const [markupText, setMarkupText] = useState<string>(String(DEFAULT_MARKUP));
  const markup = Number(markupText);

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
        <Segmented
          label="Target untung dari modal"
          size="sm"
          className="w-full sm:ml-auto sm:w-auto sm:min-w-72"
          value={markupText}
          onChange={setMarkupText}
          options={MARKUP_TARGETS.map((m) => ({ value: String(m), label: `${m}%` }))}
        />
      </div>

      {recipes.data && <PriceDiscussion recipes={recipes.data} markup={markup} />}

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
                      {r.variants.map((v) => <VariantCard key={variantLabel(v.option_name)} v={v} markup={markup} />)}
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
          HPP = Σ (takaran × harga per unit bahan). Harga per unit = harga kemasan ÷ isi kemasan (lihat Bahan &amp; Stok). Margin = harga jual − HPP. “Untung dari modal” = margin ÷ HPP.
          Saran harga = HPP × (1 + target untung), dibulatkan ke atas ke Rp1.000 — untung 200% berarti harga jual 3× HPP. “Cukup untuk” = stok bahan ÷ takaran,
          diambil yang paling sedikit. Es batu tidak dihitung per cup karena dicatat sebagai pengeluaran di Buku Kas.
        </p>
      </Note>

      <RecipeDialog recipe={editing} onClose={() => setEditing(null)} />
    </>
  );
}

interface DiscussionRow {
  key: string;
  product: string;
  size: string;
  hpp: number;
  price: number;
  markup: number;
  target: number;
  sample: boolean;
}

/** Tabel ringkas semua menu: harga sekarang vs saran harga untuk target untung — bahan diskusi harga. */
function PriceDiscussion({ recipes, markup }: { recipes: ProductRecipe[]; markup: number }) {
  const rows = useMemo<DiscussionRow[]>(() => {
    const out: DiscussionRow[] = [];
    for (const r of recipes) {
      for (const v of r.variants) {
        if (!v.items.length || !(v.hpp > 0)) continue;
        out.push({
          key: `${r.product_id}-${v.option_name ?? "-"}`,
          product: r.product_name,
          size: v.option_name ? variantLabel(v.option_name) : "",
          hpp: v.hpp,
          price: v.price,
          markup: markupOf(v.price, v.hpp) ?? 0,
          target: suggestPrice(v.hpp, markup),
          sample: r.is_sample,
        });
      }
    }
    return out.sort((a, b) => a.markup - b.markup);
  }, [recipes, markup]);

  if (!rows.length) return null;
  const below = rows.filter((r) => r.markup < markup).length;

  return (
    <section aria-labelledby="price-discussion" className="mb-6 rounded-2xl border border-line bg-surface p-4 shadow-soft" data-testid="price-discussion">
      <details open className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 md:min-h-0">
          <Tags className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 id="price-discussion" className="font-heading text-base font-semibold text-ink">Diskusi harga jual — target untung {fmtPct(markup)}</h2>
            <p className="text-caption text-muted">
              {below > 0 ? `${below} dari ${rows.length} sajian masih di bawah target.` : "Semua sajian sudah memenuhi target."} Urut dari untung paling tipis. Klik untuk buka/tutup.
            </p>
          </div>
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Menu</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">HPP</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Harga sekarang</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Untung sekarang</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Saran harga</th>
                <th scope="col" className="py-2 text-right font-medium">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const gap = r.target - r.price;
                const low = r.markup < markup;
                return (
                  <tr key={r.key} className="border-b border-line/60 last:border-0 tabular-nums">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-ink">
                      {r.product}
                      {r.size && <span className="font-normal text-muted"> · {r.size}</span>}
                      {r.sample && <span className="ml-1.5 text-caption font-normal text-[#7A4500] dark:text-warning">(resep contoh)</span>}
                    </th>
                    <td className="py-2 pr-3 text-right text-muted">{formatRupiah(r.hpp)}</td>
                    <td className="py-2 pr-3 text-right text-ink">{formatRupiah(r.price)}</td>
                    <td className={cn("py-2 pr-3 text-right", low ? "font-semibold text-danger" : "text-ink")}>
                      {formatRupiah(r.price - r.hpp)} <span className="font-normal text-muted">({fmtPct(r.markup)})</span>
                    </td>
                    <td className="py-2 pr-3 text-right font-heading font-semibold text-ink">{formatRupiah(r.target)}</td>
                    <td className={cn("py-2 text-right", gap > 0 ? "font-semibold text-ink" : "text-muted")}>{gap > 0 ? `+${formatRupiah(gap)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-caption text-muted">
          HPP hanya bahan & kemasan. Belum termasuk es batu, gas/listrik, sewa, tenaga, ongkir, dan potongan aplikasi ojol (GoFood/GrabFood/ShopeeFood) —
          karena itu untung bahan perlu cukup tebal. Resep berlabel contoh: HPP-nya masih perkiraan.
        </p>
      </details>
    </section>
  );
}
