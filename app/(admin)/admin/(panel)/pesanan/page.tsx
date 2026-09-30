import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersView } from "@/components/admin/orders/orders-view";

export const metadata: Metadata = { title: "Pesanan" };

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersView />
    </Suspense>
  );
}
