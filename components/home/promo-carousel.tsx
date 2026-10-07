"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { Banner, Promotion } from "@/types/api";
import { cn } from "@/lib/utils";

/** Carousel promo (dimuat dinamis). Autoplay berhenti saat hover/fokus & saat reduced motion. */
export default function PromoCarousel({ banners, promotions }: { banners: Banner[]; promotions: Promotion[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start" });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = banners.map((b, i) => ({ banner: b, promo: promotions.find((p) => b.subtitle?.includes(p.code ?? "@@")) ?? promotions[i] }));

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIndex(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  useEffect(() => {
    if (!embla || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => embla.scrollNext(), 5000);
    return () => clearInterval(t);
  }, [embla, paused]);

  const copy = useCallback(async (code: string) => {
    await navigator.clipboard?.writeText(code).catch(() => undefined);
    toast.success(`Kode ${code} disalin`, { description: "Tempel di keranjang saat checkout." });
  }, []);

  if (!slides.length) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Promo Kamee"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div ref={emblaRef} className="overflow-hidden rounded-3xl">
        <div className="flex">
          {slides.map(({ banner, promo }, i) => (
            <div key={banner.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} dari ${slides.length}`} className="relative min-w-0 flex-[0_0_100%]">
              <div className="relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]">
                <Image src={banner.image_desktop_url} alt="" fill sizes="(min-width:1200px) 1200px, 100vw" className="object-cover object-[88%_50%] sm:object-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B3F]/90 via-[#0B1B3F]/40 to-transparent sm:bg-gradient-to-r" aria-hidden="true" />
                <div className="absolute inset-0 flex flex-col justify-end gap-3 p-6 text-white sm:max-w-md sm:justify-center md:p-10">
                  {promo && <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">{promo.type_label}</span>}
                  <h3 className="font-heading text-2xl font-bold md:text-4xl">{banner.title}</h3>
                  {banner.subtitle && <p className="text-white/90">{banner.subtitle}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {promo?.code && (
                      <button type="button" onClick={() => copy(promo.code!)} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-white/70 px-4 py-2.5 font-heading font-semibold tracking-wider hover:bg-white/10">
                        {promo.code} <Copy className="size-4" aria-hidden="true" />
                        <span className="sr-only">salin kode</span>
                      </button>
                    )}
                    {banner.link_url && (
                      <Link href={banner.link_url} className="rounded-xl bg-[#E3EAF7] px-4 py-2.5 font-semibold text-[#0B1B3F] hover:shadow-lift">
                        Lihat detail
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => embla?.scrollTo(i)}
              aria-label={`Tampilkan promo ${i + 1}`}
              aria-current={i === index}
              className="-mx-2.5 grid size-11 place-items-center"
            >
              <span className={cn("block h-2 rounded-full transition-all", i === index ? "w-7 bg-primary" : "w-2 bg-line")} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => embla?.scrollPrev()} aria-label="Promo sebelumnya" className="grid size-11 place-items-center rounded-full border border-line hover:bg-cream"><ChevronLeft className="size-5" /></button>
          <button type="button" onClick={() => embla?.scrollNext()} aria-label="Promo berikutnya" className="grid size-11 place-items-center rounded-full border border-line hover:bg-cream"><ChevronRight className="size-5" /></button>
        </div>
      </div>
    </div>
  );
}
