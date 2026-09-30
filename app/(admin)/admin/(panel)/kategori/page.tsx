import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/catalog/category-manager";

export const metadata: Metadata = { title: "Kategori" };

export default function CategoriesPage() {
  return <CategoryManager />;
}
