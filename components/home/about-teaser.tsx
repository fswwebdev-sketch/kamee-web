import Image from "next/image";
import Link from "next/link";
import { Coffee, Leaf, Sofa } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

const POINTS = [
  { icon: Coffee, title: "Based Coffee & Manual Brew", text: "Dari Americano hingga Local Beans dengan proses Natural, Washed, atau Honey." },
  { icon: Leaf, title: "Non Coffee", text: "Matcha, cokelat, dan varian Sea Salt Cloud." },
  { icon: Sofa, title: "Ukuran botol", text: "Banyak menu tersedia dalam Bottle 250 ml dan 1 L — pas untuk dibagi." },
];

export function AboutTeaser() {
  return (
    <section className="section-y" aria-labelledby="tentang-title">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lift">
            <Image src="/images/about/barista.avif" alt="Barista Kamee Coffee meracik kopi" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="glass absolute -bottom-6 left-6 rounded-2xl border px-5 py-4 shadow-soft">
            <p className="font-heading text-2xl font-bold text-ink">10.00–17.00</p>
            <p className="text-sm text-muted">buka setiap hari di Taman Cibodas</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-caption font-semibold tracking-[.14em] text-primary uppercase">Tentang Kamee</p>
          <h2 id="tentang-title" className="mt-2 text-h2">Tempat singgah untuk setiap cerita</h2>
          <p className="mt-4 text-body-lg text-muted">
            Kamee Coffee hadir di Jl. Cempaka Raya Blok I6 No. 3, Perumahan Taman Cibodas, Tangerang. Mampir, pesan untuk dibawa
            pulang, atau pesan online dan bayar dengan QRIS.
          </p>
          <ul className="mt-8 grid gap-5">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cream text-primary"><Icon className="size-6" aria-hidden="true" /></span>
                <span>
                  <span className="block font-heading font-semibold text-ink">{title}</span>
                  <span className="text-sm text-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/tentang" className={buttonClasses("outline", "md", "mt-8")}>Kenali kami lebih dekat</Link>
        </Reveal>
      </div>
    </section>
  );
}
