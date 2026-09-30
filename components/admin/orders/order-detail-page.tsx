"use client";

import { PageHeader } from "@/components/admin/ui/page-header";
import { OrderDetail } from "./order-detail";

export function OrderDetailPage({ id }: { id: string }) {
  return (
    <>
      <PageHeader title="Detail pesanan" breadcrumb={[{ label: "Pesanan", href: "/admin/pesanan" }, { label: `#${id}` }]} className="mb-3 md:mb-4" />
      <OrderDetail id={id} />
    </>
  );
}
