import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AccountShell } from "@/components/account/account-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Akun Saya", path: "/akun", noIndex: true });

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container-page pt-24 pb-16 md:pt-28">
      <AccountShell>{children}</AccountShell>
    </div>
  );
}
