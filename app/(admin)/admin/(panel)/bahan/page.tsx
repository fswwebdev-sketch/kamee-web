import type { Metadata } from "next";
import { Suspense } from "react";
import { IngredientsView } from "@/components/admin/finance/ingredients-view";

export const metadata: Metadata = { title: "Bahan & Stok" };

export default function IngredientsPage() {
  return (
    <Suspense>
      <IngredientsView />
    </Suspense>
  );
}
