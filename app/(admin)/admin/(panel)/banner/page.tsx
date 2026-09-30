import type { Metadata } from "next";
import { BannerManager } from "@/components/admin/marketing/banner-manager";

export const metadata: Metadata = { title: "Banner" };

export default function BannerPage() {
  return <BannerManager />;
}
