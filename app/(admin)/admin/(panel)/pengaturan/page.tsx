import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/system/settings-form";

export const metadata: Metadata = { title: "Pengaturan" };

export default function SettingsPage() {
  return <SettingsForm />;
}
