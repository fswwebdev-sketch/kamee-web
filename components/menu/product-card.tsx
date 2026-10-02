"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Price } from "@/components/ui/price";
import { Rating } from "@/components/ui/rating";
import { toast } from "@/components/ui/toast";
import { useCartActions } from "@/features/cart/hooks";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/api";
import { FavoriteButton } from "./favorite-button";
import { openVariantSheet } from "./variant-sheet-store";

/** Kartu produk (bagian 6). Produk tanpa opsi langsung masuk keranjang. */
// prefetch dimatikan: grid menu memuat puluhan kartu; prefetch RSC otomatis untuk semuanya
// bersaing dengan gambar LCP & hidrasi. Halaman detail sudah ISR sehingga navigasi tetap cepat.
export function ProductCard({ product: p, priority = false, variant = "compact" }: { product: Product; priority?: boolean; variant?: "compact" | "featured" }) {
  const { addItem } = useCartActions();
  const add = () => {
    if (p.option_groups?.length) return openVariantSheet(p);
    addItem({ product: p });
    toast.success(`${p.name} masuk keranjang`);
  };
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift active:scale-[.985] motion-reduce:active:scale-100">
      <Link href={`/menu/${p.slug}`} prefetch={false} className="relative aspect-square overflow-hidden" tabIndex={-1} aria-hidden="true">
        {p.image_url && (
          <Image
            src={p.image_url}
            alt={p.name}
            fill
            priority={priority}
            fetchPriority={priority ? "high" : undefined}
            sizes="(min-width:1024px) 25vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        {p.is_best_seller && <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-on-primary">Best Seller</span>}
      </Link>
      <FavoriteButton product={p} className="absolute right-3 top-3 z-10" />
      <div className={cn("flex flex-1 flex-col gap-1 p-3 md:p-4", variant === "featured" && "md:p-5")}>
        <h3 className="line-clamp-1 font-heading font-semibold text-ink">
          {/* Stretched link: seluruh kartu menjadi area sentuh; tombol favorit & tambah berada di atasnya (z-10). */}
          <Link href={`/menu/${p.slug}`} prefetch={false} data-stretched className="rounded after:absolute after:inset-0 after:z-[1] after:content-[''] focus-visible:outline-offset-4">{p.name}</Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted">{p.short_description}</p>
        {p.review_count > 0 && <Rating value={p.rating_avg} count={p.review_count} />}
        <div className="mt-auto flex items-center justify-between pt-2">
          <Price value={p.base_price} className="font-heading text-lg font-semibold text-primary" />
          <button
            type="button"
            onClick={add}
            aria-label={`Tambah ${p.name} ke keranjang`}
            className="relative z-10 grid size-11 place-items-center rounded-full bg-primary text-on-primary transition hover:bg-primary-hover active:scale-90"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>
    </article>
  );
}
