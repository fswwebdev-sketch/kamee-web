import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardView } from "@/components/admin/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Ringkasan" };

export default function AdminDashboardPage() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
