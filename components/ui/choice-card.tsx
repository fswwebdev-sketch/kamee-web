"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Radio/checkbox berbentuk kartu (layanan, metode bayar, opsi varian). */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  type = "radio",
  title,
  description,
  icon,
  trailing,
  disabled,
  className,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string, checked: boolean) => void;
  type?: "radio" | "checkbox";
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3 rounded-xl border bg-surface p-3.5 transition",
        "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/30",
        checked ? "border-primary bg-cream/60" : "border-line hover:border-primary/50",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(value, e.target.checked)}
        className="sr-only"
      />
      {icon && <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", checked ? "bg-primary text-on-primary" : "bg-cream text-primary")}>{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold text-ink">{title}</span>
        {description && <span className="text-caption text-muted">{description}</span>}
      </span>
      {trailing}
      <span
        aria-hidden="true"
        className={cn(
          "grid size-5 shrink-0 place-items-center border-2 transition",
          type === "radio" ? "rounded-full" : "rounded-md",
          checked ? "border-primary bg-primary text-on-primary" : "border-line",
        )}
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </label>
  );
}
