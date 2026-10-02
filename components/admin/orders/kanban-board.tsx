"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Announcements,
} from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { Bike, Clock, GripVertical, Package, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { KANBAN_COLUMNS, columnOf, transitionLabel, type KanbanColumnId } from "@/lib/admin/permissions";
import type { AdminOrder, OrderStatus } from "@/lib/admin/types";
import { ORDER_STATUS_LABEL } from "@/lib/admin/types";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { relativeTime } from "./order-columns";
import { needsPaymentConfirmation, orderTransitions, useConfirmPaymentAction, useOrderTransition } from "./order-actions";

const FULFILLMENT_ICON = { pickup: Package, delivery: Bike, dine_in: Utensils } as const;

const COLUMN_STYLE: Record<KanbanColumnId, string> = {
  pending: "before:bg-warning",
  processing: "before:bg-primary",
  shipped: "before:bg-[#7C5CC4]",
  completed: "before:bg-success",
  cancelled: "before:bg-danger",
};

/** Kolom tujuan drag → status backend, dengan memperhitungkan transisi yang sah. */
function targetStatus(order: AdminOrder, column: KanbanColumnId): OrderStatus | null {
  const col = KANBAN_COLUMNS.find((c) => c.id === column)!;
  if (!col.target) return null;
  return orderTransitions(order).includes(col.target) ? col.target : null;
}

function useTick(ms = 30_000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

function CardBody({ order, dragging }: { order: AdminOrder; dragging?: boolean }) {
  const Icon = FULFILLMENT_ICON[order.fulfillment];
  const fresh = Date.now() - new Date(order.created_at).getTime() < 3 * 60_000 && ["pending", "paid"].includes(order.status);
  const ageMin = (Date.now() - new Date(order.created_at).getTime()) / 60_000;
  const late = order.status === "processing" && ageMin > 20;
  return (
    <div className={cn("rounded-xl border border-line bg-bg p-3 shadow-soft transition", dragging && "rotate-2 shadow-lift", fresh && "ring-2 ring-primary/60")}>
      {/* Kode pesanan tidak dipotong: kasir mencocokkannya dengan layar pelanggan. Ruang kanan untuk pegangan drag. */}
      <p className="pr-8 font-heading text-sm font-semibold tracking-wide text-ink [overflow-wrap:anywhere]">{order.code}</p>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-sm text-ink/85">{order.customer_name}</p>
        <p className="shrink-0 font-heading text-sm font-semibold tabular-nums text-ink">{formatRupiah(order.total)}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {fresh && <Badge tone="primary">Baru</Badge>}
        {order.status === "paid" && <Badge tone="success">Lunas</Badge>}
        {order.status === "pending" && order.payment?.method === "cash" && <Badge tone="warning">Bayar di kasir</Badge>}
        {order.status === "pending" && order.payment?.method !== "cash" && <Badge tone="warning">Cek QRIS</Badge>}
        <span className="inline-flex items-center gap-1 text-caption text-muted"><Icon className="size-3.5" aria-hidden="true" />{order.fulfillment_label}</span>
        <span className={cn("ml-auto inline-flex items-center gap-1 text-caption", late ? "font-semibold text-danger" : "text-muted")}>
          <Clock className="size-3.5" aria-hidden="true" />
          {relativeTime(order.created_at)}
          {late && <span className="sr-only"> (lebih dari 20 menit)</span>}
        </span>
      </div>
    </div>
  );
}

function OrderCard({ order, onOpen, onAdvance, busy }: { order: AdminOrder; onOpen: (o: AdminOrder) => void; onAdvance: (o: AdminOrder, to: OrderStatus) => void; busy: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id, data: { order } });
  const next = orderTransitions(order).filter((s) => s !== "cancelled");
  const confirmPay = useConfirmPaymentAction();
  return (
    <li ref={setNodeRef} className={cn("group relative", isDragging && "opacity-40")}>
      <button type="button" onClick={() => onOpen(order)} className="block w-full rounded-xl text-left" aria-label={`Buka detail pesanan ${order.code}, ${order.customer_name}, ${formatRupiah(order.total)}`}>
        <CardBody order={order} />
      </button>
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Pindahkan pesanan ${order.code}. Tekan spasi untuk mengangkat, panah untuk memilih kolom, spasi lagi untuk menaruh.`}
        aria-roledescription="kartu yang dapat dipindahkan"
        className="absolute right-1.5 top-1.5 grid size-8 cursor-grab touch-none place-items-center rounded-lg text-muted transition hover:bg-cream hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      {needsPaymentConfirmation(order) && (
        <button
          type="button"
          disabled={confirmPay.pending}
          onClick={() => confirmPay.run(order)}
          className="mt-1.5 h-9 w-full rounded-lg bg-primary px-2 text-xs font-semibold text-on-primary transition hover:bg-primary-hover disabled:opacity-50"
        >
          Konfirmasi pembayaran
        </button>
      )}
      {next[0] && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdvance(order, next[0]!)}
          className="mt-1.5 h-9 w-full rounded-lg bg-cream px-2 text-xs font-semibold text-ink transition hover:bg-primary hover:text-on-primary disabled:opacity-50"
        >
          {transitionLabel(next[0], order.status)}
        </button>
      )}
    </li>
  );
}

function Column({ id, title, orders, children, activeOrder, loading }: { id: KanbanColumnId; title: string; orders: AdminOrder[]; children: React.ReactNode; activeOrder: AdminOrder | null; loading: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const valid = activeOrder ? targetStatus(activeOrder, id) !== null : false;
  const sameColumn = activeOrder ? columnOf(activeOrder.status) === id : false;
  return (
    <section
      ref={setNodeRef}
      aria-label={`${title}, ${orders.length} pesanan`}
      className={cn(
        "relative flex max-h-[calc(100svh-15rem)] min-h-64 flex-col rounded-2xl border border-line bg-surface transition md:w-auto",
        "before:absolute before:inset-x-4 before:top-0 before:h-1 before:rounded-b-full",
        COLUMN_STYLE[id],
        activeOrder && !sameColumn && (valid ? "border-primary/60 border-dashed" : "opacity-50"),
        isOver && valid && "bg-cream/70",
      )}
    >
      <header className="flex items-center justify-between px-3.5 pt-4 pb-2">
        <h2 className="font-heading text-sm font-semibold text-ink">{title}</h2>
        <span className="grid min-w-6 place-items-center rounded-full bg-cream px-1.5 text-xs font-bold text-ink">{orders.length}</span>
      </header>
      <ul className="scrollbar-none flex flex-1 flex-col gap-3 overflow-y-auto px-2.5 pb-3">
        {loading ? Array.from({ length: 3 }, (_, i) => <li key={i}><Skeleton className="h-24 rounded-xl" /></li>) : children}
        {!loading && orders.length === 0 && <li className="grid flex-1 place-items-center rounded-xl border border-dashed border-line py-8 text-center text-caption text-muted">Kosong</li>}
      </ul>
    </section>
  );
}

/**
 * Papan Kanban pesanan: Pending (menunggu/lunas), Diproses, Dikirim, Selesai, Dibatalkan.
 * Pindah kolom dengan drag & drop (mouse/sentuh/keyboard) atau tombol aksi di kartu.
 * Hanya kolom dengan transisi sah yang menerima kartu; backend tetap memvalidasi.
 */
export function KanbanBoard({ orders, loading, onOpen }: { orders: AdminOrder[]; loading: boolean; onOpen: (o: AdminOrder) => void }) {
  useTick();
  const { run, pending, variables } = useOrderTransition();
  const [active, setActive] = useState<AdminOrder | null>(null);
  // Status optimistis per pesanan selama request berjalan
  const [optimistic, setOptimistic] = useState<Record<number, OrderStatus>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const grouped = useMemo(() => {
    const map = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, [] as AdminOrder[]])) as Record<KanbanColumnId, AdminOrder[]>;
    for (const o of orders) {
      const status = optimistic[o.id] ?? o.status;
      map[columnOf(status)].push({ ...o, status });
    }
    // Pending: yang sudah lunas di atas (siap diproses); lainnya terbaru di atas, kecuali Diproses: terlama di atas (FIFO dapur)
    map.pending.sort((a, b) => (a.status === b.status ? +new Date(a.created_at) - +new Date(b.created_at) : a.status === "paid" ? -1 : 1));
    map.processing.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    return map;
  }, [orders, optimistic]);

  const advance = async (order: AdminOrder, to: OrderStatus) => {
    setOptimistic((s) => ({ ...s, [order.id]: to }));
    await run(order, to);
    setOptimistic((s) => {
      const { [order.id]: _, ...rest } = s;
      return rest;
    });
  };

  const onDragStart = (e: DragStartEvent) => setActive((e.active.data.current as { order: AdminOrder }).order);
  const onDragEnd = (e: DragEndEvent) => {
    const order = active;
    setActive(null);
    if (!order || !e.over) return;
    const column = e.over.id as KanbanColumnId;
    if (column === columnOf(order.status)) return;
    const to = targetStatus(order, column);
    if (!to) {
      const title = KANBAN_COLUMNS.find((c) => c.id === column)!.title;
      toast.error(`Tidak bisa dipindah ke ${title}`, { description: `Pesanan ${ORDER_STATUS_LABEL[order.status].toLowerCase()} tidak dapat langsung menjadi "${title}".` });
      return;
    }
    void advance(order, to);
  };

  const title = (id: unknown) => KANBAN_COLUMNS.find((c) => c.id === id)?.title ?? "";
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Mengangkat pesanan ${(a.data.current as { order: AdminOrder }).order.code}.`,
    onDragOver: ({ active: a, over }) => (over ? `Pesanan ${(a.data.current as { order: AdminOrder }).order.code} di atas kolom ${title(over.id)}.` : "Tidak di atas kolom."),
    onDragEnd: ({ active: a, over }) => (over ? `Pesanan ${(a.data.current as { order: AdminOrder }).order.code} ditaruh di kolom ${title(over.id)}.` : "Dibatalkan."),
    onDragCancel: () => "Pemindahan dibatalkan.",
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)} accessibility={{ announcements }}>
      <div className="-mx-3 overflow-x-auto px-3 pb-2 md:mx-0 md:px-0" tabIndex={-1}>
        {/* Tablet kasir: kolom 264px dengan geser horizontal; layar lebar: 5 kolom penuh */}
        <div className="grid auto-cols-[264px] grid-flow-col gap-3 min-[1560px]:auto-cols-auto min-[1560px]:grid-flow-row min-[1560px]:grid-cols-5 lg:gap-4">
          {KANBAN_COLUMNS.map((c) => (
            <Column key={c.id} id={c.id} title={c.title} orders={grouped[c.id]} activeOrder={active} loading={loading}>
              {grouped[c.id].map((o) => (
                <OrderCard key={o.id} order={o} onOpen={onOpen} onAdvance={advance} busy={pending && variables?.id === o.id} />
              ))}
            </Column>
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>{active ? <div className="w-[260px]"><CardBody order={active} dragging /></div> : null}</DragOverlay>
    </DndContext>
  );
}
