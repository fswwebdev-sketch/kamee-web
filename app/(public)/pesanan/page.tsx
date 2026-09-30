import type { Metadata } from "next";
import { TrackForm } from "@/components/orders/track-form";
import { SectionHeader } from "@/components/ui/misc";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Lacak Pesanan", description: "Lacak status pesanan Kamee Coffee dengan kode pesanan dan nomor WhatsApp.", path: "/pesanan" });

export default function TrackPage() {
  return (
    <div className="container-page max-w-xl pt-24 pb-16 md:pt-28">
      <SectionHeader as="h1" title="Lacak Pesanan" description="Masukkan kode pesanan dari WhatsApp/struk dan 4 digit terakhir nomor WhatsApp pemesan." />
      <div className="mt-6"><TrackForm /></div>
    </div>
  );
}
