"use client";

import { Ban, BadgeCheck, Bike, CheckCircle2, ChefHat, Printer, RotateCcw } from "lucide-react";
import { confirm } from "@/components/admin/ui/confirm";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { allowedTransitions, can, transitionLabel } from "@/lib/admin/permissions";
import { errorMessage, useConfirmPayment, useOrderStatus, useRefundOrder } from "@/lib/admin/queries";
import { formatRupiah } from "@/lib/format";
import type { AdminOrder, AdminUser, OrderStatus } from "@/lib/admin/types";

export function orderTransitions(order: Pick<AdminOrder, "status" | "fulfillment" | "payment" | "paid_at">): OrderStatus[] {
  const method = order.payment?.method;
  return allowedTransitions({
    status: order.status,
    fulfillment: order.fulfillment,
    isCash: method === "cash",
    paidOnline: Boolean(order.paid_at) && method !== "cash",
  });
}

const ICON: Partial<Record<OrderStatus, React.ReactNode>> = {
  processing: <ChefHat className="size-4" aria-hidden="true" />,
  shipped: <Bike className="size-4" aria-hidden="true" />,
  completed: <CheckCircle2 className="size-4" aria-hidden="true" />,
  cancelled: <Ban className="size-4" aria-hidden="true" />,
};

/** Menjalankan transisi status dengan konfirmasi (pembatalan wajib alasan). */
export function useOrderTransition() {
  const mutation = useOrderStatus();
  const run = async (order: Pick<AdminOrder, "id" | "code" | "status">, to: OrderStatus) => {
    let note: string | null = null;
    if (to === "cancelled") {
      const res = await confirm({
        title: `Batalkan pesanan ${order.code}?`,
        description: "Pelanggan akan menerima notifikasi pembatalan. Tindakan ini tidak dapat dibatalkan.",
        confirmLabel: "Ya, batalkan pesanan",
        input: { label: "Alasan pembatalan", placeholder: "mis. Stok habis, pelanggan membatalkan…", required: true, multiline: true },
      });
      if (!res.ok) return false;
      note = res.value;
    }
    try {
      await mutation.mutateAsync({ id: order.id, status: to, note });
      return true;
    } catch (e) {
      toast.error("Status tidak dapat diubah", { description: errorMessage(e) });
      return false;
    }
  };
  return { run, pending: mutation.isPending, variables: mutation.variables };
}

export function printReceipt(id: number) {
  const w = window.open(`/admin/struk/${id}?print=1`, `struk-${id}`, "width=380,height=720");
  if (!w) toast.error("Pop-up diblokir", { description: "Izinkan pop-up untuk mencetak struk." });
}

/** Pesanan menunggu pembayaran non-tunai → admin bisa mengonfirmasi dana QRIS yang sudah masuk. */
export function needsPaymentConfirmation(order: Pick<AdminOrder, "status" | "payment">): boolean {
  return order.status === "pending" && !!order.payment && order.payment.method !== "cash";
}

/** Konfirmasi pembayaran QRIS manual dengan dialog pengecekan nominal. */
export function useConfirmPaymentAction() {
  const mutation = useConfirmPayment();
  const run = async (order: Pick<AdminOrder, "id" | "code" | "total">) => {
    const res = await confirm({
      title: `Konfirmasi pembayaran ${order.code}?`,
      description: `Pastikan dana ${formatRupiah(order.total)} sudah masuk di aplikasi GoPay Merchant (KAMEECOFFEE) sebelum mengonfirmasi. Pesanan akan berstatus "Sudah dibayar".`,
      confirmLabel: "Ya, dana sudah masuk",
      input: { label: "Catatan (opsional)", placeholder: "mis. ref. transaksi GoPay / nama pengirim", required: false },
    });
    if (!res.ok) return false;
    try {
      await mutation.mutateAsync({ id: order.id, note: res.value });
      return true;
    } catch (e) {
      toast.error("Pembayaran tidak dapat dikonfirmasi", { description: errorMessage(e) });
      return false;
    }
  };
  return { run, pending: mutation.isPending };
}

export function OrderActionButtons({ order, user, size = "md", showPrint = true }: { order: AdminOrder; user: AdminUser; size?: ButtonProps["size"]; showPrint?: boolean }) {
  const { run, pending, variables } = useOrderTransition();
  const refund = useRefundOrder();
  const confirmPay = useConfirmPaymentAction();
  const awaitingPayment = needsPaymentConfirmation(order);
  const next = orderTransitions(order);
  const forward = next.filter((s) => s !== "cancelled");
  const canRefund = can(user, "orders.refund") && order.payment?.status === "paid" && order.payment.method !== "cash" && !["completed", "cancelled"].includes(order.status);

  const doRefund = async () => {
    const res = await confirm({
      title: `Refund pesanan ${order.code}?`,
      description: order.payment?.provider === "manual"
        ? `Kembalikan dana ${formatRupiah(order.payment.amount)} ke pelanggan secara manual (mis. transfer/GoPay), lalu proses ini untuk membatalkan pesanan.`
        : `Dana ${order.payment?.method_label} dikembalikan ke pelanggan melalui payment gateway dan pesanan dibatalkan.`,
      confirmLabel: "Proses refund",
      input: { label: "Alasan refund", required: true, multiline: true },
      typeToConfirm: order.code,
    });
    if (!res.ok) return;
    refund.mutate({ id: order.id, reason: res.value }, { onError: (e) => toast.error("Refund gagal", { description: errorMessage(e) }) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {awaitingPayment && (
        <Button size={size} onClick={() => confirmPay.run(order)} loading={confirmPay.pending} data-testid="confirm-payment">
          <BadgeCheck className="size-4" aria-hidden="true" /> Konfirmasi pembayaran
        </Button>
      )}
      {forward.map((to) => (
        <Button key={to} size={size} onClick={() => run(order, to)} loading={pending && variables?.status === to}>
          {ICON[to]}
          {transitionLabel(to, order.status)}
        </Button>
      ))}
      {showPrint && (
        <Button size={size} variant="outline" onClick={() => printReceipt(order.id)}>
          <Printer className="size-4" aria-hidden="true" /> Cetak struk
        </Button>
      )}
      {next.includes("cancelled") && (
        <Button size={size} variant="ghost" className="text-danger" onClick={() => run(order, "cancelled")} loading={pending && variables?.status === "cancelled"}>
          {ICON.cancelled} Batalkan
        </Button>
      )}
      {canRefund && (
        <Button size={size} variant="ghost" className="text-danger" onClick={doRefund} loading={refund.isPending}>
          <RotateCcw className="size-4" aria-hidden="true" /> Refund
        </Button>
      )}
    </div>
  );
}
