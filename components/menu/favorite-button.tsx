"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/features/favorites/hooks";
import { useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function FavoriteButton({ product, className }: { product: { id: number; name: string }; className?: string }) {
  const { isFavorite, toggle } = useFavorites();
  const mounted = useMounted();
  const active = mounted && isFavorite(product.id);
  return (
    <button
      type="button"
      onClick={() => toggle(product)}
      aria-pressed={active}
      aria-label={active ? `Hapus ${product.name} dari favorit` : `Tambah ${product.name} ke favorit`}
      className={cn("grid size-11 place-items-center rounded-full bg-white/85 text-ink shadow-soft backdrop-blur transition hover:scale-105 dark:bg-[#111A2E]/85", className)}
    >
      <Heart className={cn("size-5 transition", active && "fill-danger text-danger")} />
    </button>
  );
}
