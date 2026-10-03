/**
 * Hak akses UI admin. HANYA untuk menyembunyikan menu/tombol — otorisasi sebenarnya
 * tetap di backend (Policy Laravel + OutletScope), dan UI menangani 403 dengan rapi.
 */
import type { Fulfillment, OrderStatus } from "@/types/api";
import type { AdminRole, AdminUser } from "./types";

export type Ability =
  | "dashboard.view"
  | "orders.view"
  | "orders.update"
  | "orders.refund"
  | "catalog.view"
  | "catalog.manage"
  | "availability.manage"
  | "promotions.manage"
  | "banners.manage"
  | "blog.manage"
  | "customers.view"
  | "customers.adjustPoints"
  | "contacts.manage"
  | "outlets.view"
  | "outlets.manage"
  | "users.manage"
  | "settings.manage"
  | "reports.view"
  | "outlets.switch"
  | "finance.view"
  | "finance.manage"
  | "pos.use";

const SUPER_ONLY: ReadonlySet<Ability> = new Set<Ability>([
  "orders.refund",
  "catalog.manage",
  "promotions.manage",
  "banners.manage",
  "blog.manage",
  "customers.adjustPoints",
  "outlets.manage",
  "users.manage",
  "settings.manage",
  "outlets.switch",
]);

export function can(user: Pick<AdminUser, "role"> | null | undefined, ability: Ability): boolean {
  if (!user) return false;
  return user.role === "super_admin" || !SUPER_ONLY.has(ability);
}

export function roleLabel(role: AdminRole): string {
  return role === "super_admin" ? "Super Admin" : "Admin Outlet";
}

/* ------------------------------------------------------------------ Status pesanan */

/** Kolom Kanban → status backend. "Pending" menampung pending + paid (lunas, belum diproses). */
export const KANBAN_COLUMNS = [
  { id: "pending", title: "Pending", statuses: ["pending", "paid"] as OrderStatus[], target: null },
  { id: "processing", title: "Diproses", statuses: ["processing"] as OrderStatus[], target: "processing" as OrderStatus },
  { id: "shipped", title: "Dikirim", statuses: ["shipped"] as OrderStatus[], target: "shipped" as OrderStatus },
  { id: "completed", title: "Selesai", statuses: ["completed"] as OrderStatus[], target: "completed" as OrderStatus },
  { id: "cancelled", title: "Dibatalkan", statuses: ["cancelled"] as OrderStatus[], target: "cancelled" as OrderStatus },
] as const;

export type KanbanColumnId = (typeof KANBAN_COLUMNS)[number]["id"];

export function columnOf(status: OrderStatus): KanbanColumnId {
  return KANBAN_COLUMNS.find((c) => c.statuses.includes(status))!.id;
}

const BASE: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "processing", "cancelled"],
  paid: ["processing"],
  processing: ["shipped", "completed", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

interface TransitionContext {
  status: OrderStatus;
  fulfillment: Fulfillment;
  /** Pembayaran tunai (boleh langsung diproses sebelum lunas) */
  isCash: boolean;
  /** Sudah lunas via gateway (pembatalan butuh refund oleh Super Admin) */
  paidOnline: boolean;
}

/**
 * Cermin OrderStateMachine di backend, agar UI hanya menawarkan transisi yang valid.
 * Backend tetap memvalidasi ulang; bila berbeda, pesan 422 dari server ditampilkan.
 */
export function allowedTransitions(ctx: TransitionContext): OrderStatus[] {
  return BASE[ctx.status].filter((to) => {
    if (ctx.status === "pending" && to === "processing" && !ctx.isCash) return false;
    if (to === "paid") return false; // lunas hanya lewat webhook gateway / konfirmasi tunai (processing)
    if (to === "shipped" && ctx.fulfillment !== "delivery") return false;
    if (ctx.status === "processing" && to === "completed" && ctx.fulfillment === "delivery") return false;
    if (ctx.status === "processing" && to === "cancelled" && ctx.paidOnline) return false;
    return true;
  });
}

/** Label aksi tombol untuk transisi. */
export function transitionLabel(to: OrderStatus, from: OrderStatus): string {
  switch (to) {
    case "processing":
      return from === "pending" ? "Terima & proses (tunai)" : "Proses pesanan";
    case "shipped":
      return "Kirim pesanan";
    case "completed":
      return "Tandai selesai";
    case "cancelled":
      return "Batalkan";
    default:
      return to;
  }
}
