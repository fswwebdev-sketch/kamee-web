import type { ReactNode } from "react";
import { StickyCartBar } from "@/components/cart/sticky-cart-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { getOutlets } from "@/lib/data";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const outlets = await getOutlets();
  return (
    <>
      <Navbar />
      <main id="konten" tabIndex={-1} className="min-h-[70svh] outline-none">
        {children}
      </main>
      <Footer outlets={outlets} />
      <StickyCartBar />
      <WhatsAppFloat />
      <BottomNav />
    </>
  );
}
