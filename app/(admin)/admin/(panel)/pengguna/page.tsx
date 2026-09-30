import type { Metadata } from "next";
import { Suspense } from "react";
import { UserManager } from "@/components/admin/system/user-manager";

export const metadata: Metadata = { title: "Pengguna" };

export default function UsersPage() {
  return (
    <Suspense>
      <UserManager />
    </Suspense>
  );
}
