"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Chip kategori: aktif = bg-primary text-white, non-aktif = bg-cream text-ink (bagian 6). */
export function Chip({ selected, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition duration-150",
        selected ? "bg-primary text-on-primary shadow-soft" : "bg-cream text-ink hover:bg-line",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
