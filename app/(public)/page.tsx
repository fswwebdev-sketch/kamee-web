import type { Metadata } from "next";
import { AboutTeaser } from "@/components/home/about-teaser";
import { CtaBanner } from "@/components/home/cta-banner";
import { FeaturedProducts } from "@/components/home/featured-products";
import { Hero } from "@/components/home/hero";
import { OutletMap } from "@/components/home/outlet-map";
import { PromoSection } from "@/components/home/promo-section";
import { Testimonials } from "@/components/home/testimonials";
import { InstallBanner } from "@/components/layout/install-app";
import { VariantSheet } from "@/components/menu/variant-sheet-host";
import { JsonLd } from "@/components/ui/misc";
import { getBanners, getOutlets, getProducts, getPromotions, getTestimonials } from "@/lib/data";
import { buildMetadata, cafeJsonLd } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({ path: "/" });

export default async function HomePage() {
  const [featured, banners, promotions, testimonials, outlets] = await Promise.all([
    getProducts({ "filter[best_seller]": 1, per_page: 8, sort: "-sold_count" }),
    getBanners(),
    getPromotions(),
    getTestimonials(),
    getOutlets(),
  ]);
  const first = outlets[0];

  return (
    <>
      <JsonLd data={cafeJsonLd(outlets)} />
      <Hero
        open={first?.open_time ?? "10:00"}
        close={first?.close_time ?? "17:00"}
        address={first?.address ?? "Jl. Cempaka Raya Blok I6 No. 3, Perumahan Taman Cibodas, Tangerang"}
        mapsUrl={first ? `https://www.google.com/maps/search/?api=1&query=${first.lat},${first.lng}` : "https://www.google.com/maps/search/?api=1&query=Kamee+Coffee+Taman+Cibodas"}
      />
      <AboutTeaser />
      <FeaturedProducts initial={featured.data} />
      <PromoSection banners={banners} promotions={promotions} />
      <Testimonials reviews={testimonials} />
      <OutletMap outlets={outlets} />
      <CtaBanner />
      <VariantSheet />
      <InstallBanner />
    </>
  );
}
