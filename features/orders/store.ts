"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface RecentOrder {
  code: string;
  phone: string;
  total: number;
  createdAt: string;
}

/** Pesanan terakhir di perangkat ini (untuk Lacak Pesanan tanpa login). */
interface RecentOrdersState {
  orders: RecentOrder[];
  add: (order: RecentOrder) => void;
}

export const useRecentOrders = create<RecentOrdersState>()(
  persist(
    (set) => ({
      orders: [],
      add: (order) => set((s) => ({ orders: [order, ...s.orders.filter((o) => o.code !== order.code)].slice(0, 10) })),
    }),
    { name: "kamee-recent-orders", storage: createJSONStorage(() => localStorage) },
  ),
);
