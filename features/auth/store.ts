"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { configureAuth } from "@/lib/api";
import type { Customer } from "@/types/api";

interface AuthState {
  token: string | null;
  customer: Customer | null;
  setSession: (token: string, customer: Customer) => void;
  setCustomer: (customer: Customer) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      customer: null,
      setSession: (token, customer) => set({ token, customer }),
      setCustomer: (customer) => set({ customer }),
      logout: () => set({ token: null, customer: null }),
    }),
    { name: "kamee-auth", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

// Token dipakai otomatis oleh wrapper API; 401 → sesi dihapus.
configureAuth(
  () => useAuthStore.getState().token,
  () => useAuthStore.getState().logout(),
);

export function useIsAuthenticated() {
  return useAuthStore((s) => Boolean(s.token));
}
