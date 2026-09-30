import type { Metadata } from "next";
import { OrderDetail } from "@/components/orders/order-detail";
import { Breadcrumb } from "@/components/ui/misc";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Lacak Pesanan", noIndex: true });

export default async function OrderPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ phone?: string }> }) {
  const { code } = await params;
  const { phone = "" } = await searchParams;
  return (
    <div className="container-page max-w-4xl pt-24 pb-16 md:pt-28">
      <Breadcrumb className="mb-4" items={[{ label: "Lacak Pesanan", href: "/pesanan" }, { label: code.toUpperCase() }]} />
      <OrderDetail code={code.toUpperCase()} phone={phone} />
    </div>
  );
}
