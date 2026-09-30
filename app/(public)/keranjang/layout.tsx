import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Keranjang", path: "/keranjang", noIndex: true });

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
