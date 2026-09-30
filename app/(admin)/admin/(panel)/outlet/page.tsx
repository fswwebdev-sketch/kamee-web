import type { Metadata } from "next";
import { OutletManager } from "@/components/admin/system/outlet-manager";

export const metadata: Metadata = { title: "Outlet" };

export default function OutletsPage() {
  return <OutletManager />;
}
