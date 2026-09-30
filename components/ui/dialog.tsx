"use client";

import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap, useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Dialog responsif: BottomSheet (glass) di mobile, Modal di tengah untuk ≥ md.
 * Fokus terkunci, Esc & klik latar menutup, fokus kembali ke pemicu.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const mounted = useMounted();
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);
  const titleId = useId();
  const descId = useId();
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6">
          <m.div
            className="absolute inset-0 bg-[#1A1210]/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <m.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-lift outline-none",
              "md:rounded-3xl",
              size === "sm" && "md:max-w-md",
              size === "md" && "md:max-w-lg",
              size === "lg" && "md:max-w-2xl",
              className,
            )}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line md:hidden" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 md:px-6 md:pt-6">
              <div>
                <h2 id={titleId} className="text-h3 text-ink">{title}</h2>
                {description && <p id={descId} className="mt-1 text-sm text-muted">{description}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Tutup" className="-mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-cream hover:text-ink">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 md:px-6">{children}</div>
            {footer && <div className="border-t border-line bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">{footer}</div>}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
