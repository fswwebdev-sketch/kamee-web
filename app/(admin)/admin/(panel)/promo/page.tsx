import type { Metadata } from "next";
import { Suspense } from "react";
import { PromoManager } from "@/components/admin/marketing/promo-manager";

export const metadata: Metadata = { title: "Promo & Voucher" };

export default function PromoPage() {
  return (
    <Suspense>
      <PromoManager />
    </Suspense>
  );
}
