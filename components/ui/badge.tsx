import type { ReactNode } from "react";
import type { OrderStatus, PaymentStatus } from "@/types/api";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

/* Warna latar tipis + teks gelap/terang agar kontras ≥ 4.5:1 di kedua mode */
const tones: Record<Tone, string> = {
  neutral: "bg-cream text-ink",
  primary: "bg-primary text-on-primary",
  success: "bg-success/15 text-[#1B5E20] dark:text-success",
  warning: "bg-warning/20 text-[#7A4500] dark:text-warning",
  danger: "bg-danger/12 text-[#9B1C1C] dark:text-danger",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

const orderTone: Record<OrderStatus, Tone> = {
  pending: "warning", paid: "primary", processing: "primary", shipped: "primary", completed: "success", cancelled: "danger",
};
const paymentTone: Record<PaymentStatus, Tone> = { pending: "warning", paid: "success", expired: "danger", failed: "danger", refunded: "neutral" };

export function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return <Badge tone={orderTone[status]}>{label}</Badge>;
}

export function PaymentBadge({ status, label }: { status: PaymentStatus; label: string }) {
  return <Badge tone={paymentTone[status]}>{label}</Badge>;
}
