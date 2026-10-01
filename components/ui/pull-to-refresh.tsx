"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const THRESHOLD = 72; // px tarikan untuk memicu muat ulang
const MAX_PULL = 120;

/**
 * Tarik-untuk-memuat-ulang (ponsel). Aktif hanya saat halaman berada di paling atas dan pada
 * perangkat sentuh. Pull-to-refresh bawaan browser dimatikan selama komponen ini terpasang agar
 * tidak dobel. Tombol "Muat ulang" tetap tersedia untuk keyboard/pembaca layar.
 */
export function PullToRefresh({ onRefresh, children, label = "Tarik untuk memuat ulang" }: { onRefresh: () => Promise<unknown>; children: ReactNode; label?: string }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const state = useRef({ startY: 0, active: false, pull: 0, busy: false });
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const html = document.documentElement;
    const prev = html.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = "contain";
    const s = state.current;

    const onStart = (e: TouchEvent) => {
      if (s.busy || window.scrollY > 0 || e.touches.length !== 1) return;
      if ((e.target as HTMLElement).closest("[data-no-ptr], input, textarea, select, [role=dialog]")) return;
      s.startY = e.touches[0]!.clientY;
      s.active = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!s.active) return;
      const dy = e.touches[0]!.clientY - s.startY;
      if (dy <= 0 || window.scrollY > 0) {
        s.pull = 0;
        setPull(0);
        return;
      }
      // Resistensi: makin jauh makin berat
      s.pull = Math.min(MAX_PULL, dy * 0.5);
      setPull(s.pull);
      if (e.cancelable) e.preventDefault();
    };
    const onEnd = async () => {
      if (!s.active) return;
      s.active = false;
      if (s.pull >= THRESHOLD) {
        s.busy = true;
        setRefreshing(true);
        setPull(THRESHOLD * 0.75);
        navigator.vibrate?.(10);
        try {
          await refresh.current();
        } finally {
          s.busy = false;
          setRefreshing(false);
          setPull(0);
        }
      } else setPull(0);
      s.pull = 0;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      html.style.overscrollBehaviorY = prev;
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  const progress = Math.min(1, pull / THRESHOLD);
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 -top-2 z-10 flex justify-center"
        style={{ transform: `translateY(${pull - 40}px)`, opacity: refreshing ? 1 : progress, transition: state.current.active ? "none" : "transform 200ms, opacity 200ms" }}
        aria-hidden="true"
        data-testid="ptr-indicator"
      >
        <span className="grid size-10 place-items-center rounded-full border border-line bg-surface text-primary shadow-soft">
          <RefreshCw className={cn("size-5", refreshing && "animate-spin")} style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }} />
        </span>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{refreshing ? "Memuat ulang…" : ""}</p>
      <div style={{ transform: pull ? `translateY(${pull}px)` : undefined, transition: state.current.active ? "none" : "transform 200ms" }} title={label}>
        {children}
      </div>
    </div>
  );
}
