"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImageOff, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BannerPreviewData {
  title: string;
  subtitle: string;
  link_url: string;
  desktopSrc: string | null;
  mobileSrc: string | null;
}

/**
 * Merender konten pada ukuran "asli" (mis. 1200 px) lalu diskalakan ke lebar wadah,
 * sehingga tipografi & proporsi sama persis dengan banner di situs publik.
 */
function ScaledFrame({ width, height, children, label }: { width: number; height: number; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setScale(entry.contentRect.width / width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={ref} role="img" aria-label={label} className="relative w-full overflow-hidden rounded-2xl bg-cream ring-1 ring-line" style={{ aspectRatio: `${width} / ${height}` }}>
      <div aria-hidden="true" className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden" }}>
        {children}
      </div>
    </div>
  );
}

/** Isi slide — meniru components/home/promo-carousel.tsx (gradien, judul, subjudul, tombol). */
function Slide({ data, src, mobile }: { data: BannerPreviewData; src: string | null; mobile: boolean }) {
  return (
    <div className="relative size-full overflow-hidden rounded-[inherit]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- pratinjau object URL / URL bebas, bukan aset halaman
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-cream text-muted">
          <div className="flex flex-col items-center gap-3 text-2xl">
            <ImageOff className="size-16" />
            Belum ada gambar
          </div>
        </div>
      )}
      <div className={cn("absolute inset-0 from-black/85 via-black/40 to-transparent", mobile ? "bg-gradient-to-t" : "bg-gradient-to-r")} />
      <div className={cn("absolute inset-0 flex flex-col gap-3 text-white", mobile ? "justify-end p-6" : "max-w-md justify-center p-10")}>
        <h3 className={cn("font-heading font-bold", mobile ? "text-2xl" : "text-4xl")}>{data.title || "Judul banner"}</h3>
        {data.subtitle && <p className="text-white/90">{data.subtitle}</p>}
        {data.link_url && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-xl bg-white px-4 py-2.5 font-semibold text-neutral-900">Lihat detail</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Pratinjau hidup: desktop (21:9, 1200 px) dan mobile (4:5, 360 px) berdampingan. */
export function BannerPreview({ data }: { data: BannerPreviewData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px] sm:items-start">
      <figure>
        <figcaption className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <Monitor className="size-3.5" aria-hidden="true" /> Desktop
        </figcaption>
        <ScaledFrame width={1200} height={514} label={`Pratinjau desktop banner ${data.title}`}>
          <Slide data={data} src={data.desktopSrc} mobile={false} />
        </ScaledFrame>
      </figure>
      <figure className="mx-auto w-40 sm:w-full">
        <figcaption className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <Smartphone className="size-3.5" aria-hidden="true" /> Mobile
        </figcaption>
        <ScaledFrame width={360} height={450} label={`Pratinjau mobile banner ${data.title}`}>
          <Slide data={data} src={data.mobileSrc ?? data.desktopSrc} mobile />
        </ScaledFrame>
      </figure>
    </div>
  );
}
