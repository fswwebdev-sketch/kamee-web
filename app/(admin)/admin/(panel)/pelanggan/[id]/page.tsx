import type { Metadata } from "next";
import { CustomerDetail } from "@/components/admin/customers/customer-detail";

export const metadata: Metadata = { title: "Detail pelanggan" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetail id={id} />;
}
