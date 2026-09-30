import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportView } from "@/components/admin/reports/report-view";

export const metadata: Metadata = { title: "Laporan" };

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportView />
    </Suspense>
  );
}
