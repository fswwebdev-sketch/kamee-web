import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerList } from "@/components/admin/customers/customer-list";

export const metadata: Metadata = { title: "Pelanggan" };

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomerList />
    </Suspense>
  );
}
