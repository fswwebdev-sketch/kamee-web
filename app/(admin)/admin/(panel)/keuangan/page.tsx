import type { Metadata } from "next";
import { Suspense } from "react";
import { FinanceSummaryView } from "@/components/admin/finance/finance-summary";

export const metadata: Metadata = { title: "Ringkasan Keuangan" };

export default function FinancePage() {
  return (
    <Suspense>
      <FinanceSummaryView />
    </Suspense>
  );
}
