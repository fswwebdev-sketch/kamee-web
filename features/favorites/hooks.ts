"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toast";
import { useIsAuthenticated } from "@/features/auth/store";
import { api } from "@/lib/api";
import { useFavoriteProducts } from "@/lib/queries/account";
import { qk } from "@/lib/queries/keys";
import type { Product } from "@/types/api";
import { useLocalFavorites } from "./store";

/**
 * Favorit: member → API /me/favorites (optimistic), tamu → localStorage.
 * Saat login, favorit lokal disinkronkan ke akun.
 */
export function useFavorites() {
  const authed = useIsAuthenticated();
  const qc = useQueryClient();
  const remote = useFavoriteProducts();
  const local = useLocalFavorites();
  const synced = useRef(false);

  useEffect(() => {
    if (!authed || synced.current || local.ids.length === 0) return;
    synced.current = true;
    Promise.all(local.ids.map((id) => api("/me/favorites", { method: "POST", body: { product_id: id } }).catch(() => null))).then(() => {
      local.clear();
      qc.invalidateQueries({ queryKey: qk.favorites });
    });
  }, [authed, local, qc]);

  const ids = new Set<number>(authed ? (remote.data ?? []).map((p) => p.id) : local.ids);

  const mutation = useMutation({
    mutationFn: ({ product, add }: { product: Pick<Product, "id">; add: boolean }) =>
      add ? api("/me/favorites", { method: "POST", body: { product_id: product.id } }) : api(`/me/favorites/${product.id}`, { method: "DELETE" }),
    onMutate: async ({ product, add }) => {
      await qc.cancelQueries({ queryKey: qk.favorites });
      const previous = qc.getQueryData<Product[]>(qk.favorites);
      qc.setQueryData<Product[]>(qk.favorites, (old = []) => (add ? [...old, product as Product] : old.filter((p) => p.id !== product.id)));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(qk.favorites, ctx?.previous);
      toast.error("Gagal memperbarui favorit");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.favorites }),
  });

  const toggle = (product: Pick<Product, "id" | "name">) => {
    const add = !ids.has(product.id);
    if (authed) mutation.mutate({ product, add });
    else local.toggle(product.id);
    toast.success(add ? `${product.name} ditambahkan ke favorit` : `${product.name} dihapus dari favorit`, {
      description: !authed && add ? "Masuk agar favorit tersimpan di semua perangkat." : undefined,
    });
  };

  return { ids, isFavorite: (id: number) => ids.has(id), toggle };
}
