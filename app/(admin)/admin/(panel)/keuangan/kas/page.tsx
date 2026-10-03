import type { Metadata } from "next";
import { Suspense } from "react";
import { CashBook } from "@/components/admin/finance/cash-book";

export const metadata: Metadata = { title: "Buku Kas" };

export default function CashBookPage() {
  return (
    <Suspense>
      <CashBook />
    </Suspense>
  );
}
