"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Banner, Promotion } from "@/types/api";

const PromoCarousel = dynamic(() => import("./promo-carousel"), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[4/5] w-full rounded-3xl sm:aspect-[16/9] lg:aspect-[21/9]" />,
});

export function PromoSection({ banners, promotions }: { banners: Banner[]; promotions: Promotion[] }) {
  if (!banners.length) return null;
  return (
    <section className="section-y" aria-labelledby="promo-title">
      <div className="container-page">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-caption font-semibold tracking-[.14em] text-primary uppercase">Promo</p>
            <h2 id="promo-title" className="mt-2 text-h2">Lebih hemat, lebih sering ngopi</h2>
          </div>
          <Link href="/promo" className="hidden items-center gap-1.5 font-semibold text-primary sm:inline-flex">Semua promo <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <PromoCarousel banners={banners} promotions={promotions} />
      </div>
    </section>
  );
}
