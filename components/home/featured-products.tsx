"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/menu/product-card";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { useProductList } from "@/lib/queries/catalog";
import type { Product } from "@/types/api";

const TABS = [
  { id: "best", label: "Terlaris", params: { per_page: 8, sort: "-sold_count,name" } }, // urut jumlah terjual asli
  { id: "featured", label: "Rekomendasi", params: { "filter[featured]": 1, per_page: 8 } },
  { id: "manual", label: "Manual Brew", params: { "filter[category]": "manual-brew", per_page: 8 } },
  { id: "noncoffee", label: "Non Coffee", params: { "filter[category]": "non-coffee", per_page: 8 } },
] as const;

/** Produk unggulan bertab; tab pertama di-render dari server (SEO & LCP). */
export function FeaturedProducts({ initial }: { initial: Product[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("best");
  const current = TABS.find((t) => t.id === tab)!;
  const { data, isLoading } = useProductList(current.params as Record<string, string | number>, tab === "best" ? initial : undefined);
  const panelId = useId();

  return (
    <section className="section-y bg-cream/50" aria-labelledby="unggulan-title">
      <div className="container-page">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-caption font-semibold tracking-[.14em] text-primary uppercase">Menu Favorit</p>
            <h2 id="unggulan-title" className="mt-2 text-h2">Yang paling banyak dipesan</h2>
          </div>
          <Link href="/menu" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:gap-2.5 transition-all">
            Lihat semua menu <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <Tabs label="Kategori produk unggulan" items={TABS.map((t) => ({ id: t.id, label: t.label }))} value={tab} onChange={(id) => setTab(id as typeof tab)} className="mt-6 w-fit max-w-full" panelId={panelId} />
        <div id={panelId} role="tabpanel" aria-label={current.label} className="mt-6 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {isLoading || !data
            ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
            : data.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}
