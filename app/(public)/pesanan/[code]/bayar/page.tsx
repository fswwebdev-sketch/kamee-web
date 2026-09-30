import type { Metadata } from "next";
import { PaymentView } from "@/components/checkout/payment-view";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Pembayaran", noIndex: true });

export default async function PayPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ phone?: string }> }) {
  const { code } = await params;
  const { phone = "" } = await searchParams;
  return (
    <div className="container-page max-w-2xl pt-24 pb-16 md:pt-28">
      <PaymentView code={code.toUpperCase()} phone={phone} />
    </div>
  );
}
