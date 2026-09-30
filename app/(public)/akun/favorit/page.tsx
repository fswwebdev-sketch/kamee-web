"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductGrid } from "@/components/menu/product-grid";
import { VariantSheet } from "@/components/menu/variant-sheet-host";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { useFavoriteProducts } from "@/lib/queries/account";

export default function FavoritesPage() {
  const { data, isLoading } = useFavoriteProducts();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-h2">Favorit</h1>
      {!isLoading && !data?.length ? (
        <EmptyState illustration={<Heart className="size-12 text-muted" aria-hidden="true" />} title="Belum ada favorit" description="Ketuk ikon hati di menu untuk menyimpan minuman kesukaanmu." action={<Link href="/menu" className={buttonClasses()}>Jelajahi Menu</Link>} />
      ) : (
        <ProductGrid products={data ?? []} loading={isLoading} skeletons={4} priorityCount={0} />
      )}
      <VariantSheet />
    </div>
  );
}
