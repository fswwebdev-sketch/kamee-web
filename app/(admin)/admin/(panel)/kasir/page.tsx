import type { Metadata } from "next";
import { Suspense } from "react";
import { PosView } from "@/components/admin/finance/pos-view";

export const metadata: Metadata = { title: "Kasir" };

export default function KasirPage() {
  return (
    <Suspense>
      <PosView />
    </Suspense>
  );
}
