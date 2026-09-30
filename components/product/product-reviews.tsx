"use client";

import { useState } from "react";
import { MessageSquareReply } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { Stars } from "@/components/ui/rating";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useInView } from "@/lib/hooks";
import { useProductReviews } from "@/lib/queries/catalog";
import type { ProductDetail } from "@/types/api";

export function ProductReviews({ product }: { product: ProductDetail }) {
  const [rating, setRating] = useState<number | undefined>();
  // Ulasan baru diambil saat bagian ini mendekati viewport agar tidak bersaing dengan gambar utama.
  const [visible, setVisible] = useState(false);
  const sectionRef = useInView<HTMLElement>(() => setVisible(true), { enabled: !visible, rootMargin: "600px" });
  const { data, isLoading: fetching, hasNextPage, fetchNextPage, isFetchingNextPage } = useProductReviews(product.slug, rating, visible);
  const isLoading = !visible || fetching;
  const reviews = data?.pages.flatMap((p) => p.data) ?? [];
  const summary = product.rating_summary;
  const max = Math.max(1, ...Object.values(summary.breakdown));

  return (
    <section ref={sectionRef} aria-labelledby="ulasan-title" className="grid gap-8 lg:grid-cols-[300px_1fr]">
      <div>
        <h2 id="ulasan-title" className="text-h3">Ulasan pelanggan</h2>
        <div className="mt-4 flex items-end gap-3">
          <p className="font-heading text-5xl font-bold text-ink">{summary.average.toFixed(1)}</p>
          <div className="pb-1.5">
            <Stars value={summary.average} size={18} />
            <p className="text-caption text-muted">{summary.count} ulasan</p>
          </div>
        </div>
        <ul className="mt-5 flex flex-col gap-2" aria-label="Sebaran rating">
          {(["5", "4", "3", "2", "1"] as const).map((s) => (
            <li key={s} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-muted">{s} ★</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-cream" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(summary.breakdown[s] / max) * 100}%` }} />
              </span>
              <span className="w-6 text-right text-muted">{summary.breakdown[s]}<span className="sr-only"> ulasan bintang {s}</span></span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="scrollbar-none flex gap-2 overflow-x-auto" role="group" aria-label="Filter rating">
          <Chip selected={!rating} onClick={() => setRating(undefined)}>Semua</Chip>
          {[5, 4, 3].map((r) => <Chip key={r} selected={rating === r} onClick={() => setRating(r)}>{r} ★</Chip>)}
        </div>
        <ul className="mt-5 flex flex-col divide-y divide-line" aria-busy={isLoading}>
          {isLoading && Array.from({ length: 3 }, (_, i) => <li key={i} className="py-4"><Skeleton className="h-16" /></li>)}
          {reviews.map((r) => (
            <li key={r.id} className="py-5 first:pt-0">
              <div className="flex items-center gap-3">
                <Avatar name={r.customer_name ?? "Pelanggan"} className="size-9 text-xs" />
                <div>
                  <p className="text-sm font-semibold text-ink">{r.customer_name}</p>
                  <p className="flex items-center gap-2 text-caption text-muted"><Stars value={r.rating} size={12} /><time dateTime={r.created_at}>{formatDate(r.created_at, { day: "numeric", month: "short", year: "numeric" })}</time></p>
                </div>
              </div>
              {r.comment && <p className="mt-3 text-ink">{r.comment}</p>}
              {r.reply && (
                <p className="mt-3 flex gap-2 rounded-xl bg-cream/70 p-3 text-sm text-ink">
                  <MessageSquareReply className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span><b className="font-semibold">Balasan Kamee:</b> {r.reply}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
        {!isLoading && reviews.length === 0 && <EmptyState title="Belum ada ulasan" description="Jadilah yang pertama memberi ulasan setelah pesananmu selesai." />}
        {hasNextPage && <Button variant="outline" className="mt-2" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>Lihat ulasan lainnya</Button>}
      </div>
    </section>
  );
}
