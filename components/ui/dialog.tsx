"use client";

import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSheetDrag } from "@/features/ui/use-sheet-drag";
import { useFocusTrap, useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Dialog responsif: BottomSheet (glass) di mobile, Modal di tengah untuk ≥ md.
 * Fokus terkunci, Esc & klik latar menutup, fokus kembali ke pemicu.
 * Di ponsel: geser pegangan/kepala sheet ke bawah (atau konten saat sudah di atas) untuk menutup.
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
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}) {
  const mounted = useMounted();
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  useSheetDrag({ sheetRef, handleRef, scrollRef, backdropRef, onClose, enabled: open && mounted });
  const descId = useId();
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6">
          <m.div
            ref={backdropRef}
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
              "relative w-full outline-none",
              size === "sm" && "md:max-w-md",
              size === "md" && "md:max-w-lg",
              size === "lg" && "md:max-w-2xl",
              size === "xl" && "md:max-w-4xl",
              size === "2xl" && "md:max-w-5xl",
            )}
          >
            <div
              ref={sheetRef}
              className={cn(
                "flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-lift will-change-transform",
                "md:rounded-3xl",
                className,
              )}
            >
              {/* Pegangan + kepala: area seret untuk menutup sheet di ponsel */}
              <div ref={handleRef} data-sheet-handle className="cursor-grab select-none active:cursor-grabbing md:cursor-auto">
                <div className="flex justify-center pt-2.5 pb-1 md:hidden" aria-hidden="true">
                  <span className="h-1.5 w-10 rounded-full bg-line" />
                </div>
                <div className="flex items-start justify-between gap-4 px-5 pt-2 pb-3 md:px-6 md:pt-6">
                  <div>
                    <h2 id={titleId} className="text-h3 text-ink">{title}</h2>
                    {description && <p id={descId} className="mt-1 text-sm text-muted">{description}</p>}
                  </div>
                  <button type="button" onClick={onClose} aria-label="Tutup" className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-cream hover:text-ink">
                    <X className="size-5" />
                  </button>
                </div>
              </div>
              <div ref={scrollRef} className={cn("flex-1 overflow-y-auto overscroll-contain px-5 md:px-6", footer ? "pb-5" : "pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-6")}>{children}</div>
              {footer && <div className="border-t border-line bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">{footer}</div>}
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
