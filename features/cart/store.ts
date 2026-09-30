"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  buildLine,
  clampQty,
  lineKey,
  mergeLine,
  normalizeNote,
  type AddToCartInput,
  type CartLine,
} from "./pricing";

export interface CartState {
  lines: CartLine[];
  outletId: number | null;
  promoCode: string | null;
  redeemPoints: number;
  addItem: (input: AddToCartInput) => CartLine;
  setQty: (lineId: string, qty: number) => void;
  increment: (lineId: string) => void;
  decrement: (lineId: string) => void;
  removeItem: (lineId: string) => CartLine | undefined;
  restoreItem: (line: CartLine, index?: number) => void;
  setNote: (lineId: string, note: string) => void;
  setOutlet: (outletId: number | null) => void;
  setPromoCode: (code: string | null) => void;
  setRedeemPoints: (points: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      outletId: null,
      promoCode: null,
      redeemPoints: 0,

      addItem: (input) => {
        const line = buildLine(input);
        set((s) => ({ lines: mergeLine(s.lines, line) }));
        return get().lines.find((l) => l.lineId === line.lineId)!;
      },

      setQty: (lineId, qty) => {
        const next = clampQty(qty);
        set((s) => ({
          lines: next === 0 ? s.lines.filter((l) => l.lineId !== lineId) : s.lines.map((l) => (l.lineId === lineId ? { ...l, qty: next } : l)),
        }));
      },

      increment: (lineId) => {
        const line = get().lines.find((l) => l.lineId === lineId);
        if (line) get().setQty(lineId, line.qty + 1);
      },

      decrement: (lineId) => {
        const line = get().lines.find((l) => l.lineId === lineId);
        if (line) get().setQty(lineId, line.qty - 1);
      },

      removeItem: (lineId) => {
        const line = get().lines.find((l) => l.lineId === lineId);
        set((s) => ({ lines: s.lines.filter((l) => l.lineId !== lineId) }));
        return line;
      },

      restoreItem: (line, index) => {
        set((s) => {
          if (s.lines.some((l) => l.lineId === line.lineId)) return s;
          const lines = [...s.lines];
          lines.splice(index ?? lines.length, 0, line);
          return { lines };
        });
      },

      setNote: (lineId, note) => {
        set((s) => {
          const target = s.lines.find((l) => l.lineId === lineId);
          if (!target) return s;
          const clean = normalizeNote(note);
          const newId = lineKey(target.productId, target.options.map((o) => o.id), clean);
          const duplicate = s.lines.find((l) => l.lineId === newId && l.lineId !== lineId);
          if (duplicate) {
            // Catatan sama dengan baris lain → gabungkan.
            return {
              lines: s.lines
                .filter((l) => l.lineId !== lineId)
                .map((l) => (l.lineId === newId ? { ...l, qty: clampQty(l.qty + target.qty) } : l)),
            };
          }
          return { lines: s.lines.map((l) => (l.lineId === lineId ? { ...l, note: clean, lineId: newId } : l)) };
        });
      },

      setOutlet: (outletId) => set({ outletId }),
      setPromoCode: (code) => set({ promoCode: code ? code.trim().toUpperCase() : null }),
      setRedeemPoints: (points) => set({ redeemPoints: Math.max(0, Math.floor(points)) }),
      clear: () => set({ lines: [], promoCode: null, redeemPoints: 0 }),
    }),
    {
      name: "kamee-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, outletId: s.outletId, promoCode: s.promoCode, redeemPoints: s.redeemPoints }),
    },
  ),
);
