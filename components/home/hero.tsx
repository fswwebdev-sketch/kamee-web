import Image from "next/image";
import { Fragment } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatHour, formatNumber } from "@/lib/format";

const TITLE = "Nikmati Secangkir Kebahagiaan di Kamee Coffee";

/**
 * Hero (bagian 6): foto full-bleed + gradien, judul muncul per kata (stagger 60 ms),
 * gambar zoom-out 1.1 → 1.0 dalam 1,2 detik. Murni CSS agar tidak menunda LCP.
 */
export function Hero({ rating, reviewCount, open, close }: { rating: number; reviewCount: number; open: string; close: string }) {
  return (
    <section className="relative isolate min-h-[88svh] overflow-hidden" aria-labelledby="hero-title">
      <Image
        src="/hero/latte.avif"
        alt="Latte art di Kamee Coffee"
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        className="-z-10 animate-hero-zoom object-cover object-[70%_50%]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#3E2723]/85 via-[#3E2723]/55 to-transparent" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#3E2723]/60 via-transparent to-transparent md:hidden" aria-hidden="true" />
      <div className="mx-auto flex min-h-[88svh] max-w-6xl flex-col justify-end gap-8 px-4 pt-32 pb-16 md:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl text-white">
          <span className="inline-flex animate-fade-up items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">
            ☕ Buka setiap hari {formatHour(open)}–{formatHour(close)}
          </span>
          <h1 id="hero-title" className="mt-4 font-heading text-4xl font-bold leading-tight md:text-6xl">
            {TITLE.split(" ").map((word, i) => (
              <Fragment key={i}>
                <span className="inline-block animate-fade-up" style={{ animationDelay: `${80 + i * 60}ms` }}>
                  {word}
                </span>{" "}
              </Fragment>
            ))}
          </h1>
          <p className="mt-4 animate-fade-up text-lg text-white/90 [animation-delay:500ms]">Kopi berkualitas, suasana nyaman, dan camilan lezat untuk menemani harimu.</p>
          <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:600ms]">
            <Link href="/menu" className="rounded-xl bg-[#F5E6CA] px-6 py-3 font-semibold text-[#3E2723] transition hover:-translate-y-0.5 hover:shadow-lift">
              Lihat Menu
            </Link>
            <Link href="/menu?order=1" className="rounded-xl border border-white/60 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/10">
              Pesan Sekarang
            </Link>
          </div>
        </div>
        <div className="w-full max-w-xs animate-fade-up rounded-3xl border border-white/30 bg-white/15 p-5 text-white backdrop-blur-md [animation-delay:700ms]">
          <p className="flex items-center gap-2 font-heading text-3xl font-bold">
            {rating.toFixed(1)} <Star className="size-7 fill-[#F5C451] text-[#F5C451]" aria-hidden="true" />
            <span className="sr-only">dari 5</span>
          </p>
          <p className="text-sm text-white/85">dari {formatNumber(reviewCount)}+ ulasan pelanggan</p>
        </div>
      </div>
    </section>
  );
}
