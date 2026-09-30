"use client";

import { create } from "zustand";

export type RealtimeStatus = "idle" | "connecting" | "connected" | "polling" | "offline" | "simulated";

interface RealtimeState {
  status: RealtimeStatus;
  /** Jumlah event pesanan baru sejak halaman Pesanan terakhir dibuka */
  unseen: number;
  lastEventAt: number | null;
  setStatus: (s: RealtimeStatus) => void;
  bump: () => void;
  markSeen: () => void;
}

export const useRealtime = create<RealtimeState>((set) => ({
  status: "idle",
  unseen: 0,
  lastEventAt: null,
  setStatus: (status) => set({ status }),
  bump: () => set((s) => ({ unseen: s.unseen + 1, lastEventAt: Date.now() })),
  markSeen: () => set({ unseen: 0 }),
}));
