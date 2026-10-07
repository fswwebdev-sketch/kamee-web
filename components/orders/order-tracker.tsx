import { Bike, CheckCircle2, ChefHat, CircleDollarSign, ClipboardList, XCircle } from "lucide-react";
import { formatTime } from "@/lib/format";
import type { Order, OrderStatus } from "@/types/api";
import { cn } from "@/lib/utils";

const STEPS: { status: OrderStatus; label: string; icon: typeof ClipboardList }[] = [
  { status: "pending", label: "Pesanan dibuat", icon: ClipboardList },
  { status: "paid", label: "Dibayar", icon: CircleDollarSign },
  { status: "processing", label: "Diracik barista", icon: ChefHat },
  { status: "shipped", label: "Dikirim (ojol)", icon: Bike },
  { status: "completed", label: "Selesai", icon: CheckCircle2 },
];

/** Stepper status pesanan (pending → paid → processing → shipped → completed). */
export function OrderTracker({ order }: { order: Order }) {
  if (order.status === "cancelled") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4">
        <XCircle className="size-6 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <p className="font-semibold text-ink">Pesanan dibatalkan</p>
          {order.cancelled_reason && <p className="text-sm text-muted">{order.cancelled_reason}</p>}
        </div>
      </div>
    );
  }

  const steps = STEPS.filter((s) => s.status !== "shipped" || order.fulfillment === "delivery");
  const reached = new Map((order.timeline ?? []).map((t) => [t.status, t.at]));
  // Tunai: pending → processing (tanpa langkah "Dibayar").
  const currentIndex = Math.max(...steps.map((s, i) => (reached.has(s.status) || s.status === order.status ? i : -1)));

  return (
    <ol className="relative flex flex-col gap-0 md:flex-row md:justify-between" aria-label="Status pesanan">
      {steps.map((s, i) => {
        const done = i <= currentIndex;
        const current = i === currentIndex;
        const at = reached.get(s.status);
        const Icon = s.icon;
        return (
          <li key={s.status} className="relative flex gap-3 pb-6 last:pb-0 md:flex-1 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center" aria-current={current ? "step" : undefined}>
            {i < steps.length - 1 && (
              <span aria-hidden="true" className={cn("absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 md:left-[calc(50%+22px)] md:top-5 md:h-0.5 md:w-[calc(100%-44px)]", i < currentIndex ? "bg-primary" : "bg-line")} />
            )}
            <span className={cn("relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 transition", done ? "border-primary bg-primary text-on-primary" : "border-line bg-surface text-muted", current && "ring-4 ring-primary/20")}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="pt-1.5 md:pt-0">
              <span className={cn("block text-sm font-semibold", done ? "text-ink" : "text-muted")}>{s.label}</span>
              <span className="text-caption text-muted">{at ? formatTime(at) : current ? "Sekarang" : "—"}</span>
              <span className="sr-only">{done ? (current ? "(tahap saat ini)" : "(selesai)") : "(belum)"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
