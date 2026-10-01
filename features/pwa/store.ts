"use client";

import { create } from "zustand";

/** Event Chrome/Edge/Samsung Internet sebelum menampilkan dialog pasang aplikasi. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaState {
  promptEvent: BeforeInstallPromptEvent | null;
  standalone: boolean;
  ios: boolean;
  /** Safari iOS (bukan Chrome/Firefox iOS) — hanya Safari yang bisa "Tambah ke Layar Utama" */
  iosSafari: boolean;
  iosSheetOpen: boolean;
  set: (p: Partial<Omit<PwaState, "set">>) => void;
}

export const usePwa = create<PwaState>((set) => ({
  promptEvent: null,
  standalone: false,
  ios: false,
  iosSafari: false,
  iosSheetOpen: false,
  set: (p) => set(p),
}));

/** Bisa dipasang sekarang: ada prompt native, atau iOS Safari yang belum dipasang. */
export function useCanInstall() {
  return usePwa((s) => !s.standalone && (Boolean(s.promptEvent) || s.iosSafari));
}

export async function requestInstall(): Promise<"accepted" | "dismissed" | "ios" | "unavailable"> {
  const { promptEvent, iosSafari, set } = usePwa.getState();
  if (promptEvent) {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    set({ promptEvent: null });
    return outcome;
  }
  if (iosSafari) {
    set({ iosSheetOpen: true });
    return "ios";
  }
  return "unavailable";
}

const DISMISS_KEY = "kamee-install-dismissed";
export function installDismissedRecently(days = 14): boolean {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(t) && Date.now() - t < days * 86_400_000;
  } catch {
    return false;
  }
}
export function dismissInstall() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* abaikan */
  }
}
