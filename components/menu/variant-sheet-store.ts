"use client";

import { create } from "zustand";
import type { Product } from "@/types/api";

interface VariantSheetState {
  product: Product | null;
  open: (p: Product) => void;
  close: () => void;
}

/** State global bottom sheet varian (dipisah agar komponen sheet bisa dimuat dinamis). */
export const useVariantSheet = create<VariantSheetState>((set) => ({
  product: null,
  open: (product) => set({ product }),
  close: () => set({ product: null }),
}));

export const openVariantSheet = (p: Product) => useVariantSheet.getState().open(p);
