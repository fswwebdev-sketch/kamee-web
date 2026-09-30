import type { Metadata } from "next";
import { OptionGroupManager } from "@/components/admin/catalog/option-group-manager";

export const metadata: Metadata = { title: "Opsi Varian" };

export default function OptionGroupsPage() {
  return <OptionGroupManager />;
}
