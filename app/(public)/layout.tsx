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
      {/* min-h-svh: saat streaming, footer tidak sempat tampil tepat di bawah header lalu terdorong (CLS) */}
      <main id="konten" tabIndex={-1} className="min-h-svh outline-none">
        {children}
      </main>
      <Footer outlets={outlets} />
      <StickyCartBar />
      <WhatsAppFloat />
      <BottomNav />
    </>
  );
}
