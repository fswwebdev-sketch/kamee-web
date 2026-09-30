import type { Metadata } from "next";
import { OrderDetailPage } from "@/components/admin/orders/order-detail-page";

export const metadata: Metadata = { title: "Detail pesanan" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailPage id={id} />;
}
