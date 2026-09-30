"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { cartCount, cartSubtotal } from "./pricing";
import { useCartStore } from "./store";

/** true setelah store persist terbaca dari localStorage (hindari mismatch SSR). */
export function useCartHydrated() {
  // Selalu false pada render pertama agar HTML server & klien identik.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useCartStore.persist?.onFinishHydration?.(() => setHydrated(true));
    setHydrated(useCartStore.persist?.hasHydrated?.() ?? true);
    return unsub;
  }, []);
  return hydrated;
}

export function useCartSummary() {
  const lines = useCartStore((s) => s.lines);
  const hydrated = useCartHydrated();
  return {
    hydrated,
    lines: hydrated ? lines : [],
    count: hydrated ? cartCount(lines) : 0,
    subtotal: hydrated ? cartSubtotal(lines) : 0,
  };
}

export function useCartActions() {
  return useCartStore(
    useShallow((s) => ({
      addItem: s.addItem,
      setQty: s.setQty,
      increment: s.increment,
      decrement: s.decrement,
      removeItem: s.removeItem,
      restoreItem: s.restoreItem,
      setNote: s.setNote,
      setOutlet: s.setOutlet,
      setPromoCode: s.setPromoCode,
      setRedeemPoints: s.setRedeemPoints,
      clear: s.clear,
    })),
  );
}
