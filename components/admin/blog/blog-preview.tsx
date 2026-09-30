"use client";

import { formatDate } from "@/lib/format";

/**
 * Sanitasi SAMA dengan app/(public)/blog/[slug]/page.tsx (fungsi lokal di sana, disalin agar
 * pratinjau identik). Bila salah satu diubah, samakan keduanya.
 */
export function sanitizeBlogHtml(html: string) {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export interface BlogPreviewData {
  title: string;
  excerpt: string;
  content: string;
  categoryName: string | null;
  author: string | null;
  publishedAt: string | null;
  coverSrc: string | null;
}

/** Meniru tata letak halaman artikel publik (kepala, sampul 1200:630, isi .prose-kamee). */
export function BlogPreview({ data }: { data: BlogPreviewData }) {
  return (
    <article className="rounded-2xl border border-line bg-bg px-4 py-8 md:px-8 md:py-10" aria-label="Pratinjau artikel">
      <div className="mx-auto max-w-3xl">
        <p className="text-caption text-muted">
          {data.categoryName ? <span className="font-semibold text-primary">{data.categoryName}</span> : <span>Artikel</span>}
          {data.publishedAt && <> · <time dateTime={data.publishedAt}>{formatDate(data.publishedAt)}</time></>}
          {data.author && <> · {data.author}</>}
        </p>
        <h1 className="mt-2 break-words text-h1 text-ink">{data.title || <span className="text-muted">Judul artikel</span>}</h1>
        {data.excerpt && <p className="mt-4 text-body-lg text-muted">{data.excerpt}</p>}
      </div>
      {data.coverSrc && (
        <div className="mx-auto mt-8 max-w-4xl">
          <div className="relative aspect-[1200/630] overflow-hidden rounded-3xl bg-cream">
            {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau object URL sampul */}
            <img src={data.coverSrc} alt={data.title} className="absolute inset-0 size-full object-cover" />
          </div>
        </div>
      )}
      <div className="mx-auto mt-10 max-w-3xl">
        {data.content.trim() ? (
          <div className="prose-kamee text-body-lg text-ink" dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(data.content) }} />
        ) : (
          <p className="text-muted">Konten artikel akan tampil di sini.</p>
        )}
      </div>
    </article>
  );
}
