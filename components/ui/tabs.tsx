"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: ReactNode;
}

/** Tab ARIA dengan navigasi panah (roving tabindex). */
export function Tabs({
  items,
  value,
  onChange,
  className,
  label,
  panelId,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  label: string;
  /** id panel yang dikendalikan tab (satu panel bersama) */
  panelId?: string;
}) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + dir + items.length) % items.length;
    refs.current[next]?.focus();
    onChange(items[next]!.id);
  };
  return (
    <div role="tablist" aria-label={label} className={cn("scrollbar-none flex gap-1 overflow-x-auto rounded-xl bg-cream p-1", className)}>
      {items.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "h-10 shrink-0 rounded-lg px-4 text-sm font-semibold transition duration-150",
              active ? "bg-surface text-ink shadow-soft" : "font-medium text-ink/85 hover:bg-surface/60",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
