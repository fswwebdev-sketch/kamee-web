import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Award, Coffee, HeartHandshake, Leaf, Users } from "lucide-react";
import { CtaBanner } from "@/components/home/cta-banner";
import { buttonClasses } from "@/components/ui/button";
import { Breadcrumb, JsonLd } from "@/components/ui/misc";
import { Reveal } from "@/components/ui/reveal";
import { getOutlets } from "@/lib/data";
import { buildMetadata, cafeJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Tentang Kami",
  description: "Cerita Kamee Coffee: kedai kopi lokal di Tangerang dengan biji kopi pilihan petani Jawa Barat, barista ramah, dan suasana hangat.",
  path: "/tentang",
});

const VALUES = [
  { icon: Coffee, title: "Kualitas di setiap cangkir", text: "Biji disangrai mingguan, resep distandarkan, dan setiap minuman dicicipi sebelum disajikan." },
  { icon: HeartHandshake, title: "Hangat seperti rumah", text: "Barista yang mengingat nama dan pesanan favoritmu." },
  { icon: Leaf, title: "Peduli lingkungan", text: "Sedotan kertas, ampas kopi untuk kompos, dan diskon tumbler." },
  { icon: Users, title: "Tumbuh bersama petani", text: "Membeli langsung dari petani lokal dengan harga yang adil." },
];

const STATS = [
  { value: "2021", label: "Tahun berdiri" },
  { value: "2", label: "Outlet di Tangerang" },
  { value: "30+", label: "Menu racikan" },
  { value: "4,9★", label: "Rating pelanggan" },
];

export default async function AboutPage() {
  const outlets = await getOutlets();
  return (
    <>
      <JsonLd data={cafeJsonLd(outlets)} />
      <div className="container-page pt-24 md:pt-28">
        <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Tentang" }]} />
        <div className="mt-6 grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-caption font-semibold tracking-[.14em] text-primary uppercase">Tentang Kamee</p>
            <h1 className="mt-2 text-display">Secangkir cerita dari Tangerang</h1>
            <p className="mt-5 text-body-lg text-muted">
              Kamee lahir dari mimpi sederhana: menghadirkan kopi lokal berkualitas dengan harga bersahabat, di tempat yang membuat
              siapa pun betah berlama-lama. &ldquo;Kamee&rdquo; berarti <em>kami</em> — karena kedai ini milik semua yang singgah.
            </p>
            <Link href="/menu" className={buttonClasses("primary", "lg", "mt-8")}>Lihat Menu</Link>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lift">
            <Image src="/images/about/barista.avif" alt="Suasana bar kopi Kamee" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>

        <dl className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col-reverse rounded-2xl border border-line bg-surface p-5 text-center">
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className="font-heading text-3xl font-bold text-primary">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section className="section-y" aria-labelledby="nilai-title">
        <div className="container-page">
          <h2 id="nilai-title" className="text-h2">Yang kami pegang</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={i * 0.06} className="h-full rounded-2xl border border-line bg-surface p-6">
                  <span className="grid size-12 place-items-center rounded-2xl bg-cream text-primary"><Icon className="size-6" aria-hidden="true" /></span>
                  <h3 className="mt-4 font-heading font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{text}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-y bg-cream/50" aria-labelledby="perjalanan-title">
        <div className="container-page max-w-3xl">
          <h2 id="perjalanan-title" className="text-h2">Perjalanan kami</h2>
          <ol className="mt-8 border-l-2 border-line pl-6">
            {[
              ["2021", "Gerobak kopi pertama di Cikokol dengan tiga menu andalan."],
              ["2022", "Membuka kedai permanen dan meluncurkan Es Kopi Susu Kamee."],
              ["2024", "Outlet kedua di Karawaci & program poin loyalitas."],
              ["2026", "Pesan online, antar ke rumah, dan pembayaran QRIS."],
            ].map(([year, text]) => (
              <li key={year} className="relative pb-8 last:pb-0">
                <span className="absolute -left-[33px] top-1 grid size-4 place-items-center rounded-full bg-primary ring-4 ring-bg" aria-hidden="true" />
                <p className="font-heading font-semibold text-primary">{year}</p>
                <p className="mt-1 text-ink">{text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 flex items-center gap-2 text-sm text-muted"><Award className="size-5 text-primary" aria-hidden="true" /> Juara 2 Latte Art Kota Tangerang 2025.</p>
        </div>
      </section>
      <div className="pt-16"><CtaBanner /></div>
    </>
  );
}
