import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Coffee, HeartHandshake, Leaf, Users } from "lucide-react";
import { CtaBanner } from "@/components/home/cta-banner";
import { buttonClasses } from "@/components/ui/button";
import { Breadcrumb, JsonLd } from "@/components/ui/misc";
import { Reveal } from "@/components/ui/reveal";
import { getOutlets } from "@/lib/data";
import { buildMetadata, cafeJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Tentang Kami",
  description: "Kamee Coffee — kedai kopi di Perumahan Taman Cibodas, Tangerang. Based coffee, manual brew biji lokal, dan non coffee; tersedia juga dalam botol 250 ml & 1 L.",
  path: "/tentang",
});

/* Isi halaman ini hanya memuat fakta dari menu & info outlet. Lengkapi cerita, tahun berdiri, dll. sesuai data asli. */
const VALUES = [
  { icon: Coffee, title: "Based Coffee", text: "Americano, Orangecano, Manucano, dan latte racikan Kame — Aren, Pandan, Spanish, Caramel." },
  { icon: Leaf, title: "Manual Brew biji lokal", text: "Local Beans dengan pilihan Hot atau Japanese, proses Natural, Washed, atau Honey." },
  { icon: HeartHandshake, title: "Non Coffee", text: "Matcha, cokelat, dan varian Sea Salt Cloud untuk yang tidak minum kopi." },
  { icon: Users, title: "Botol untuk dibagi", text: "Banyak menu tersedia dalam Bottle 250 ml dan Bottle 1 L." },
];

const STATS = [
  { value: "1", label: "Outlet di Taman Cibodas" },
  { value: "19", label: "Menu di daftar" },
  { value: "10–17", label: "Jam buka (WIB)" },
  { value: "1 L", label: "Ukuran botol terbesar" },
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
            <h1 className="mt-2 text-display">Kedai kopi di Taman Cibodas</h1>
            <p className="mt-5 text-body-lg text-muted">
              Kamee Coffee menyajikan based coffee, manual brew, dan minuman non coffee dari outlet kami di Jl. Cempaka Raya
              Blok I6 No. 3, Perumahan Taman Cibodas, Tangerang. Buka setiap hari pukul 10.00–17.00 WIB — pesan online untuk
              ambil sendiri, makan di tempat, atau diantar.
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

      <section className="section-y bg-cream/50" aria-labelledby="pesan-title">
        <div className="container-page max-w-3xl">
          <h2 id="pesan-title" className="text-h2">Cara memesan</h2>
          <ul className="mt-6 grid gap-3 text-ink">
            <li>• Pesan di situs ini, lalu bayar dengan QRIS (GoPay, OVO, DANA, ShopeePay, m-banking) atau tunai di kasir.</li>
            <li>• Pesan via WhatsApp <a className="font-semibold text-primary hover:underline" href="https://wa.me/6281280871630">0812-8087-1630</a>.</li>
            <li>• Tersedia juga di GoFood, GrabFood, dan ShopeeFood.</li>
          </ul>
        </div>
      </section>
      <div className="pt-16"><CtaBanner /></div>
    </>
  );
}
