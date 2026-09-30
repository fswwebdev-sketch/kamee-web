import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactInbox } from "@/components/admin/contacts/contact-inbox";

export const metadata: Metadata = { title: "Pesan Masuk" };

export default function ContactsPage() {
  return (
    <Suspense>
      <ContactInbox />
    </Suspense>
  );
}
