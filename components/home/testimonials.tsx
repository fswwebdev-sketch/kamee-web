import { Quote } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Reveal } from "@/components/ui/reveal";
import { Stars } from "@/components/ui/rating";
import type { Review } from "@/types/api";

export function Testimonials({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  return (
    <section className="section-y bg-cream/50" aria-labelledby="testimoni-title">
      <div className="container-page">
        <div className="text-center">
          <p className="text-caption font-semibold tracking-[.14em] text-primary uppercase">Testimoni</p>
          <h2 id="testimoni-title" className="mt-2 text-h2">Kata mereka tentang Kamee</h2>
        </div>
        <ul className="scrollbar-none mt-10 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
          {reviews.slice(0, 6).map((r, i) => (
            <li key={r.id} className="w-[82%] shrink-0 snap-center md:w-auto">
              <Reveal delay={(i % 3) * 0.08} className="h-full">
                <figure className="relative flex h-full flex-col gap-4 rounded-2xl border border-line bg-surface p-6 shadow-soft">
                  <Quote className="absolute right-5 top-5 size-8 text-cream" aria-hidden="true" />
                  <Stars value={r.rating} size={16} />
                  <blockquote className="flex-1 text-body text-ink">&ldquo;{r.comment}&rdquo;</blockquote>
                  <figcaption className="flex items-center gap-3">
                    <Avatar name={r.customer_name ?? "Pelanggan"} />
                    <span>
                      <span className="block text-sm font-semibold text-ink">{r.customer_name}</span>
                      {r.product && <span className="text-caption text-muted">memesan {r.product.name}</span>}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
