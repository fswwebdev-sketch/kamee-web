"use client";

import type { Ingredient } from "@/lib/admin/finance-types";
import { useIngredients } from "@/lib/admin/finance-queries";

/**
 * useIngredients memakai placeholderData: keepPreviousData tanpa generic eksplisit,
 * sehingga TypeScript melebarkan tipe `data`. Pembungkus ini mengembalikan tipe yang tepat.
 */
export function useIngredientList(params: { kind?: string; q?: string } = {}) {
  const query = useIngredients(params);
  return { ...query, data: query.data as Ingredient[] | undefined };
}
