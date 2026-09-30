import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";

export function CtaBanner() {
  return (
    <section className="pb-16 lg:pb-24" aria-labelledby="cta-title">
      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-[#3E2723] px-6 py-12 text-center text-[#F5E6CA] md:px-16 md:py-16">
            <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[#6F4E37]/60 blur-2xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 size-64 rounded-full bg-[#C8A27A]/25 blur-2xl" aria-hidden="true" />
            <h2 id="cta-title" className="relative text-h2 text-[#F5E6CA]">Kopimu sudah menunggu ☕</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-body-lg text-[#F5E6CA]/85">Pesan sekarang, ambil tanpa antre, atau kami antar ke rumahmu. Kumpulkan poin di setiap pembelian.</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/menu" className="rounded-xl bg-[#F5E6CA] px-6 py-3 font-semibold text-[#3E2723] transition hover:-translate-y-0.5 hover:shadow-lift">Pesan Sekarang</Link>
              <Link href="/masuk" className="rounded-xl border border-[#F5E6CA]/60 px-6 py-3 font-semibold text-[#F5E6CA] hover:bg-white/10">Daftar &amp; Kumpulkan Poin</Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
