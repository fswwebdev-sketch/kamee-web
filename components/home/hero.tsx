import Image from "next/image";
import { Fragment } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { formatHour } from "@/lib/format";

const TITLE = "Nikmati Secangkir Kebahagiaan di Kamee Coffee";

/**
 * Hero (bagian 6): foto full-bleed + gradien, judul muncul per kata (stagger 60 ms),
 * gambar zoom-out 1.1 → 1.0 dalam 1,2 detik. Murni CSS agar tidak menunda LCP.
 */
export function Hero({ open, close, days, address, mapsUrl }: { open: string; close: string; days: string; address: string; mapsUrl: string }) {
  return (
    <section className="relative isolate min-h-[88svh] overflow-hidden" aria-labelledby="hero-title">
      <Image
        src="/hero/aren-kame.avif"
        alt="Es Aren Kame dalam cup Kame di atas meja kayu"
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        className="-z-10 animate-hero-zoom object-cover object-[70%_50%]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0B1B3F]/85 via-[#0B1B3F]/55 to-transparent" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0B1B3F]/60 via-transparent to-transparent md:hidden" aria-hidden="true" />
      <div className="mx-auto flex min-h-[88svh] max-w-6xl flex-col justify-end gap-8 px-4 pt-32 pb-16 md:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl text-white">
          <span className="inline-flex animate-fade-up items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">
            ☕ Buka {days} {formatHour(open)}–{formatHour(close)}
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
          <p className="mt-4 animate-fade-up text-lg text-white/90 [animation-delay:500ms]">Based coffee, manual brew, dan non coffee racikan Kame — tersedia juga dalam botol 250 ml & 1 L.</p>
          <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:600ms]">
            <Link href="/menu" className="rounded-xl bg-[#E3EAF7] px-6 py-3 font-semibold text-[#0B1B3F] transition hover:-translate-y-0.5 hover:shadow-lift">
              Lihat Menu
            </Link>
            <Link href="/menu?order=1" className="rounded-xl border border-white/60 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/10">
              Pesan Sekarang
            </Link>
          </div>
        </div>
        <div className="w-full max-w-xs animate-fade-up rounded-3xl border border-white/30 bg-white/15 p-5 text-white backdrop-blur-md [animation-delay:700ms]">
          <p className="flex items-center gap-2 font-heading text-lg font-bold">
            <MapPin className="size-5" aria-hidden="true" /> Kamee Coffee
          </p>
          <p className="mt-1 text-sm text-white/90">{address}</p>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-4">
            Petunjuk arah
          </a>
        </div>
      </div>
    </section>
  );
}
