"use client";

import { AnimatePresence, m } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { create } from "zustand";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id">, duration?: number) => void;
  dismiss: (id: number) => void;
}

let counter = 0;
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t, duration = 3500) => {
    const id = ++counter;
    set({ toasts: [...get().toasts.slice(-2), { ...t, id }] });
    setTimeout(() => get().dismiss(id), duration);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (title: string, opts: Partial<Omit<ToastItem, "id" | "title" | "tone">> = {}) => useToastStore.getState().push({ title, tone: "success", ...opts }, opts.action ? 6000 : 3500),
  error: (title: string, opts: Partial<Omit<ToastItem, "id" | "title" | "tone">> = {}) => useToastStore.getState().push({ title, tone: "error", ...opts }, 5000),
  info: (title: string, opts: Partial<Omit<ToastItem, "id" | "title" | "tone">> = {}) => useToastStore.getState().push({ title, tone: "info", ...opts }),
};

const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-3 top-3 z-[80] flex flex-col items-center gap-2 md:inset-x-auto md:right-5 md:top-5 md:items-end">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <m.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 text-ink shadow-lift"
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", t.tone === "success" && "text-success", t.tone === "error" && "text-danger", t.tone === "info" && "text-primary")} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description && <p className="mt-0.5 text-caption text-muted">{t.description}</p>}
              </div>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:bg-cream"
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Tutup notifikasi" className="-m-2 grid size-11 shrink-0 md:-m-1 md:size-8 place-items-center rounded-full text-muted hover:bg-cream">
                <X className="size-4" />
              </button>
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
