import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Breadcrumb } from "@/components/ui/misc";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Checkout", path: "/checkout", noIndex: true });

export default function CheckoutPage() {
  return (
    <div className="container-page min-h-svh pt-24 pb-16 md:pt-28">
      <Breadcrumb items={[{ label: "Keranjang", href: "/keranjang" }, { label: "Checkout" }]} />
      <h1 className="mt-3 mb-6 text-h1">Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
