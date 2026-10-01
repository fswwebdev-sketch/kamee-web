"use client";

import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useTransition } from "react";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { useCartStore } from "@/features/cart/store";
import { useCartHydrated } from "@/features/cart/hooks";
import { useInView } from "@/lib/hooks";
import { useCategories, useProductsInfinite } from "@/lib/queries/catalog";
import type { ProductFilters } from "@/lib/queries/keys";
import type { Category, Paginated, Product } from "@/types/api";
import { CategoryChips } from "./category-chips";
import { ProductGrid } from "./product-grid";
import { SearchBar } from "./search-bar";
import { SORT_OPTIONS, SortSelect } from "./sort-select";

// Sheet dimuat saat pertama kali dibuka (tidak membebani LCP halaman menu)
const FilterSheet = dynamic(() => import("./filter-sheet"), { ssr: false });

export function MenuView({ categories, initialPage, initialFilters }: { categories: Category[]; initialPage: Paginated<Product>; initialFilters: ProductFilters }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const hydrated = useCartHydrated();
  const outletId = useCartStore((s) => s.outletId);

  const filters: ProductFilters = useMemo(
    () => ({
      search: params.get("q") ?? "",
      category: params.get("kategori") ?? "",
      sort: params.get("urut") ?? "-sold_count",
      outlet: hydrated ? outletId : null,
    }),
    [params, hydrated, outletId],
  );

  const sameAsInitial = filters.search === (initialFilters.search ?? "") && filters.category === (initialFilters.category ?? "") && filters.sort === initialFilters.sort && !filters.outlet;
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData } = useProductsInfinite(filters, sameAsInitial ? initialPage : undefined);
  const { data: cats = categories } = useCategories(categories);

  const products = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      if (key === "urut" && value === "-sold_count") next.delete("urut");
      next.delete("order");
      startTransition(() => router.replace(`/menu${next.size ? `?${next}` : ""}`, { scroll: false }));
    },
    [params, router],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  // Tetap terpasang setelah dibuka pertama kali agar animasi tutup berjalan
  const [sheetMounted, setSheetMounted] = useState(false);
  const activeFilters = (filters.category ? 1 : 0) + (filters.sort && filters.sort !== "-sold_count" ? 1 : 0);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? "Terlaris";
  const applySheet = ({ category, sort }: { category: string; sort: string }) => {
    const next = new URLSearchParams(params.toString());
    if (category) next.set("kategori", category);
    else next.delete("kategori");
    if (sort && sort !== "-sold_count") next.set("urut", sort);
    else next.delete("urut");
    next.delete("order");
    startTransition(() => router.replace(`/menu${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  const sentinel = useInView<HTMLDivElement>(() => hasNextPage && !isFetchingNextPage && fetchNextPage(), { enabled: Boolean(hasNextPage) });

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 -mx-4 flex flex-col gap-3 bg-bg/95 px-4 pt-3 pb-3 backdrop-blur md:top-18 md:mx-0 md:px-0">
        <SearchBar value={filters.search ?? ""} onChange={(v) => setParam("q", v)} />
        <div className="flex items-center justify-between gap-3">
          <CategoryChips categories={cats} value={filters.category ?? ""} onChange={(v) => setParam("kategori", v)} />
          <div className="hidden shrink-0 md:block"><SortSelect value={filters.sort ?? "-sold_count"} onChange={(v) => setParam("urut", v)} /></div>
        </div>
        <div className="flex items-center justify-between gap-3 md:hidden">
          <p className="text-caption text-muted" aria-live="polite">{isLoading ? "Memuat menu…" : `${total} menu · ${sortLabel}`}</p>
          <button
            type="button"
            onClick={() => { setSheetMounted(true); setSheetOpen(true); }}
            aria-haspopup="dialog"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold text-ink transition active:scale-[.97]"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filter & urutkan
            {activeFilters > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-on-primary">{activeFilters}<span className="sr-only"> aktif</span></span>}
          </button>
        </div>
      </div>

      <p className="sr-only md:not-sr-only md:-mt-3 md:text-caption md:text-muted" aria-live="polite">
        {isLoading ? "Memuat menu…" : `Menampilkan ${products.length} dari ${total} menu${filters.search ? ` untuk “${filters.search}”` : ""}`}
      </p>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !isLoading && products.length === 0 ? (
        <EmptyState
          illustration={<SearchX className="size-12 text-muted" aria-hidden="true" />}
          title="Menu tidak ditemukan"
          description="Coba kata kunci lain atau lihat semua kategori."
          action={<Button variant="secondary" onClick={() => router.replace("/menu", { scroll: false })}>Tampilkan semua menu</Button>}
        />
      ) : (
        <div aria-busy={isLoading || isPlaceholderData} className={isPlaceholderData ? "opacity-60 transition" : undefined}>
          <h2 className="sr-only">Daftar menu</h2>
          <ProductGrid products={products} loading={isLoading || isFetchingNextPage} skeletons={isLoading ? 8 : 4} />
        </div>
      )}

      {sheetMounted && (
        <FilterSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          categories={cats}
          category={filters.category ?? ""}
          sort={filters.sort ?? "-sold_count"}
          onApply={applySheet}
        />
      )}

      <div ref={sentinel} aria-hidden="true" />
      {hasNextPage && !isFetchingNextPage && (
        <Button variant="outline" className="mx-auto" onClick={() => fetchNextPage()}>Muat lebih banyak</Button>
      )}
      {!hasNextPage && products.length > 0 && !isLoading && <p className="text-center text-caption text-muted">Semua menu sudah ditampilkan ☕</p>}
    </div>
  );
}
