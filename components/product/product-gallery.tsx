"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage } from "@/types/api";
import { cn } from "@/lib/utils";

/** Galeri swipe (CSS scroll-snap, tanpa library) + thumbnail + navigasi keyboard. */
/** Ukuran yang tertulis di alt foto (mis. "Americano Bottle 1 L — Kamee Coffee") → label di galeri. */
const sizeOf = (alt?: string | null) => alt?.match(/Bottle (?:1 L|250 ml)|\bCup\b/)?.[0] ?? null;

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = (i + images.length) % images.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setIndex(next);
  };

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(index + 1);
    if (e.key === "ArrowLeft") go(index - 1);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3" role="region" aria-roledescription="carousel" aria-label={`Galeri foto ${name}`}>
      <div className="group relative -mx-4 overflow-hidden border-line bg-cream md:mx-0 md:rounded-3xl md:border">
        <div ref={track} onScroll={onScroll} onKeyDown={onKey} tabIndex={0} aria-label="Geser untuk melihat foto lain" className="scrollbar-none flex aspect-square snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          {images.map((img, i) => (
            <div key={img.id} className="relative aspect-square w-full shrink-0 snap-center" role="group" aria-roledescription="slide" aria-label={`${i + 1} dari ${images.length}`}>
              <Image src={img.url} alt={img.alt ?? name} fill priority={i === 0} fetchPriority={i === 0 ? "high" : "low"} sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
              {sizeOf(img.alt) && (
                <span className="absolute bottom-10 left-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-on-primary shadow-soft md:bottom-3">Foto: {sizeOf(img.alt)}</span>
              )}
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} aria-label="Foto sebelumnya" className="glass absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full border text-ink md:grid"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Foto berikutnya" className="glass absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full border text-ink md:grid"><ChevronRight className="size-5" /></button>
            <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white tabular-nums md:hidden" aria-live="polite">
              {index + 1}/{images.length}
            </span>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden" aria-hidden="true">
              {images.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full bg-white/80 transition-all", i === index ? "w-5 bg-white" : "w-1.5")} />)}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="hidden gap-3 md:flex">
          {images.map((img, i) => (
            <button key={img.id} type="button" onClick={() => go(i)} aria-label={`Lihat foto ${i + 1}`} aria-current={i === index} className={cn("relative size-20 overflow-hidden rounded-xl border-2 transition", i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}>
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
