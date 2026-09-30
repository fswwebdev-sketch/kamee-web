"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReceiptText, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useCartActions } from "@/features/cart/hooks";
import { toCartOptions } from "@/features/cart/pricing";
import { isApiError } from "@/lib/api";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { useMyOrders, useReorder } from "@/lib/queries/account";
import { fetchAllProducts } from "@/lib/queries/catalog";
import type { Order } from "@/types/api";

const FILTERS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Menunggu bayar" },
  { value: "processing", label: "Diproses" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

export function OrderHistory() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useMyOrders(status || undefined);
  const reorder = useReorder();
  const { addItem, setOutlet } = useCartActions();
  const orders = data?.pages.flatMap((p) => p.data) ?? [];

  const doReorder = async (order: Order) => {
    try {
      const res = await reorder.mutateAsync(order.code);
      const products = await fetchAllProducts();
      let added = 0;
      for (const item of res.data.items) {
        const product = products.find((p) => p.id === item.product_id);
        if (!product) continue;
        addItem({ product, options: toCartOptions(product.option_groups ?? [], item.option_ids), qty: item.qty, note: item.note ?? undefined });
        added++;
      }
      setOutlet(res.data.outlet_id);
      toast.success(`${added} item disalin ke keranjang`, { description: res.data.unavailable.length ? `${res.data.unavailable.length} produk sudah tidak tersedia.` : undefined });
      router.push("/keranjang");
    } catch (e) {
      toast.error(isApiError(e) ? e.message : "Gagal memesan ulang.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Filter status" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {FILTERS.map((f) => <Chip key={f.value} selected={status === f.value} onClick={() => setStatus(f.value)}>{f.label}</Chip>)}
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState illustration={<ReceiptText className="size-12 text-muted" aria-hidden="true" />} title="Belum ada pesanan" description="Pesanan yang kamu buat saat masuk akan muncul di sini." action={<Link href="/menu" className={buttonClasses()}>Pesan Sekarang</Link>} />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-3xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-heading font-semibold tracking-wide text-ink">{o.code}</p>
                  <p className="text-caption text-muted">{formatDateTime(o.created_at)} · {o.fulfillment_label} · {o.outlet?.name}</p>
                </div>
                <StatusBadge status={o.status} label={o.status_label} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-ink">{o.items?.map((it) => `${it.qty}× ${it.product_name}`).join(", ")}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-heading font-semibold text-primary">{formatRupiah(o.total)}</p>
                <div className="flex gap-2">
                  <Link href={`/pesanan/${o.code}?phone=${o.customer_phone.slice(-4)}`} className={buttonClasses("outline", "sm")}>Detail</Link>
                  {["completed", "cancelled"].includes(o.status) && (
                    <Button size="sm" onClick={() => doReorder(o)} loading={reorder.isPending && reorder.variables === o.code}>
                      <RotateCcw className="size-4" aria-hidden="true" /> Pesan lagi
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {hasNextPage && <Button variant="outline" className="mx-auto" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>Muat lebih banyak</Button>}
    </div>
  );
}
