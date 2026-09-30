import Image from "next/image";
import Link from "next/link";
import { Coffee, Leaf, Sofa } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

const POINTS = [
  { icon: Coffee, title: "Biji kopi pilihan", text: "Arabika & robusta dari petani lokal Jawa Barat, disangrai mingguan." },
  { icon: Sofa, title: "Suasana nyaman", text: "Sudut kerja tenang, colokan di tiap meja, dan Wi-Fi cepat." },
  { icon: Leaf, title: "Ramah lingkungan", text: "Sedotan kertas dan diskon untuk yang membawa tumbler sendiri." },
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
            <p className="font-heading text-2xl font-bold text-ink">Sejak 2021</p>
            <p className="text-sm text-muted">menyeduh cerita di Tangerang</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-caption font-semibold tracking-[.14em] text-primary uppercase">Tentang Kamee</p>
          <h2 id="tentang-title" className="mt-2 text-h2">Tempat singgah untuk setiap cerita</h2>
          <p className="mt-4 text-body-lg text-muted">
            Kamee berarti &ldquo;kami&rdquo; — ruang hangat tempat teman, keluarga, dan rekan kerja berkumpul. Setiap cangkir diseduh
            dengan teliti oleh barista yang mencintai kopi sama seperti kamu.
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
