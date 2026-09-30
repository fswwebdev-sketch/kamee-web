import type { Metadata } from "next";
import { ProductEditor } from "@/components/admin/catalog/product-editor";

export const metadata: Metadata = { title: "Tambah produk" };

export default function NewProductPage() {
  return <ProductEditor />;
}
