import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { Blog } from "@/types/api";

export function BlogCard({ blog, priority = false }: { blog: Blog; priority?: boolean }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link href={`/blog/${blog.slug}`} className="relative aspect-[1200/630] overflow-hidden" tabIndex={-1} aria-hidden="true">
        {blog.cover_url && <Image src={blog.cover_url} alt="" fill priority={priority} fetchPriority={priority ? "high" : undefined} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-caption text-muted">
          {blog.category && <span className="font-semibold text-primary">{blog.category.name}</span>}
          {blog.published_at && <> · <time dateTime={blog.published_at}>{formatDate(blog.published_at)}</time></>}
        </p>
        <h3 className="font-heading text-lg font-semibold leading-snug text-ink">
          <Link href={`/blog/${blog.slug}`} className="hover:text-primary">{blog.title}</Link>
        </h3>
        {blog.excerpt && <p className="line-clamp-3 text-sm text-muted">{blog.excerpt}</p>}
      </div>
    </article>
  );
}
