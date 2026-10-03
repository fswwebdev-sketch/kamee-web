import type { Metadata } from "next";
import { Suspense } from "react";
import { RecipesView } from "@/components/admin/finance/recipes-view";

export const metadata: Metadata = { title: "Resep & HPP" };

export default function RecipesPage() {
  return (
    <Suspense>
      <RecipesView />
    </Suspense>
  );
}
