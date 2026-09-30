"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Menu dropdown yang aksesibel: tombol pemicu (aria-haspopup), role="menu",
 * navigasi panah/Home/End, Esc & klik di luar menutup, fokus kembali ke pemicu.
 */
export function Dropdown({
  label,
  ariaLabel,
  children,
  align = "end",
  className,
  buttonClassName,
  menuClassName,
}: {
  label: ReactNode;
  ariaLabel?: string;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])') ?? []);
    items()[0]?.focus();
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        list[(i + 1) % list.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        list[list.length - 1]?.focus();
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={buttonClassName}
      >
        {label}
      </button>
      {open && (
        <div
          ref={menu}
          id={id}
          role="menu"
          className={cn(
            "absolute z-50 mt-2 min-w-48 animate-fade-in overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-lift",
            align === "end" ? "right-0" : "left-0",
            menuClassName,
          )}
        >
          {children(() => close())}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  onSelect,
  icon,
  children,
  danger,
  disabled,
  checked,
}: {
  onSelect: () => void;
  icon?: ReactNode;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** Bila diisi, item menjadi menuitemradio */
  checked?: boolean;
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={checked}
      tabIndex={-1}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition",
        "hover:bg-cream focus-visible:bg-cream disabled:opacity-50",
        danger ? "text-danger" : "text-ink",
        checked && "text-primary",
      )}
    >
      {icon && <span className="grid size-4 shrink-0 place-items-center [&>svg]:size-4" aria-hidden="true">{icon}</span>}
      <span className="flex-1">{children}</span>
      {checked && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
    </button>
  );
}

export function DropdownSeparator() {
  return <div role="separator" className="my-1 h-px bg-line" />;
}
