"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Preferensi UI admin per perangkat (bukan data bisnis). */
interface AdminUiState {
  sidebarCollapsed: boolean;
  /** Outlet aktif untuk Super Admin (null = semua outlet). Admin Outlet selalu outletnya sendiri. */
  outletId: number | null;
  soundEnabled: boolean;
  ordersView: "table" | "kanban";
  setSidebarCollapsed: (v: boolean) => void;
  setOutletId: (id: number | null) => void;
  setSoundEnabled: (v: boolean) => void;
  setOrdersView: (v: "table" | "kanban") => void;
}

export const useAdminUi = create<AdminUiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      outletId: null,
      soundEnabled: true,
      ordersView: "kanban",
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setOutletId: (outletId) => set({ outletId }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setOrdersView: (ordersView) => set({ ordersView }),
    }),
    { name: "kamee-admin-ui", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
