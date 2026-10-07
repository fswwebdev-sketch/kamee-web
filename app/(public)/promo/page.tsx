import type { Metadata } from "next";
import { PromoCard } from "@/components/content/promo-card";
import { PromoSection } from "@/components/home/promo-section";
import { Breadcrumb, EmptyState, SectionHeader } from "@/components/ui/misc";
import { getBanners, getPromotions } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Promo & Voucher",
  description: "Promo terbaru Kamee Coffee: hemat 5%, potongan Rp10.000, dan potongan pelanggan baru. Salin kode voucher dan pakai saat checkout.",
  path: "/promo",
});

export default async function PromoPage() {
  const [promotions, banners] = await Promise.all([getPromotions(), getBanners()]);
  return (
    <>
      <div className="container-page pt-24 md:pt-28">
        <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Promo" }]} />
        <SectionHeader as="h1" className="mt-3" title="Promo & Voucher" description="Salin kodenya, lalu pakai di keranjang. Diskon dihitung otomatis oleh sistem." />
        <h2 className="sr-only">Daftar promo</h2>
        {promotions.length ? (
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {promotions.map((p) => <li key={p.id}><PromoCard promo={p} /></li>)}
          </ul>
        ) : (
          <EmptyState className="mt-8" title="Belum ada promo" description="Pantau terus halaman ini dan Instagram kami untuk promo berikutnya." />
        )}
      </div>
      <PromoSection banners={banners} promotions={promotions} />
    </>
  );
}
