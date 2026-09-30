"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Favorit tamu disimpan lokal; disinkronkan ke akun saat login. */
interface LocalFavoritesState {
  ids: number[];
  toggle: (id: number) => boolean;
  clear: () => void;
}

export const useLocalFavorites = create<LocalFavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const has = get().ids.includes(id);
        set({ ids: has ? get().ids.filter((x) => x !== id) : [...get().ids, id] });
        return !has;
      },
      clear: () => set({ ids: [] }),
    }),
    { name: "kamee-favorites", storage: createJSONStorage(() => localStorage) },
  ),
);
