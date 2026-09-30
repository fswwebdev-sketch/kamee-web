"use client";

import type { Product } from "@/types/api";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { ProductCard } from "./product-card";

export function ProductGrid({ products, loading = false, skeletons = 8, priorityCount = 2 }: { products: Product[]; loading?: boolean; skeletons?: number; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}><ProductCard product={p} priority={i < priorityCount} /></li>
      ))}
      {loading && Array.from({ length: skeletons }, (_, i) => <li key={`s-${i}`}><ProductCardSkeleton /></li>)}
    </ul>
  );
}
