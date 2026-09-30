import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BlogCard } from "@/components/blog/blog-card";
import { Breadcrumb, JsonLd } from "@/components/ui/misc";
import { getBlog, getBlogs } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { blogPostingJsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export const revalidate = 600;

export async function generateStaticParams() {
  const { data } = await getBlogs({ per_page: 50 });
  return data.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const res = await getBlog(slug);
  if (!res) return buildMetadata({ title: "Artikel tidak ditemukan", noIndex: true });
  const b = res.data;
  return buildMetadata({
    title: b.meta_title ?? b.title,
    description: b.meta_description ?? b.excerpt ?? undefined,
    path: `/blog/${b.slug}`,
    type: "article",
    publishedTime: b.published_at ?? undefined,
  });
}

/** Konten HTML dari CMS admin kamee-api; hanya tag dasar yang dipertahankan. */
function sanitize(html: string) {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export default async function BlogDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const res = await getBlog(slug);
  if (!res) notFound();
  const { data: blog, related } = res;
  const crumbs = [{ name: "Beranda", path: "/" }, { name: "Blog", path: "/blog" }, { name: blog.title, path: `/blog/${blog.slug}` }];

  return (
    <article className="pt-24 pb-16 md:pt-28">
      <JsonLd data={[blogPostingJsonLd(blog), breadcrumbJsonLd(crumbs)]} />
      <div className="container-page max-w-3xl">
        <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Blog", href: "/blog" }, { label: blog.category?.name ?? "Artikel" }]} />
        <p className="mt-6 text-caption text-muted">
          {blog.category && <span className="font-semibold text-primary">{blog.category.name}</span>}
          {blog.published_at && <> · <time dateTime={blog.published_at}>{formatDate(blog.published_at)}</time></>}
          {blog.author && <> · {blog.author}</>}
        </p>
        <h1 className="mt-2 text-h1">{blog.title}</h1>
        {blog.excerpt && <p className="mt-4 text-body-lg text-muted">{blog.excerpt}</p>}
      </div>
      {blog.cover_url && (
        <div className="container-page mt-8 max-w-4xl">
          <div className="relative aspect-[1200/630] overflow-hidden rounded-3xl">
            <Image src={blog.cover_url} alt={blog.title} fill priority sizes="(min-width:1024px) 900px, 100vw" className="object-cover" />
          </div>
        </div>
      )}
      <div className="container-page mt-10 max-w-3xl">
        <div className="prose-kamee text-body-lg text-ink" dangerouslySetInnerHTML={{ __html: sanitize(blog.content ?? "") }} />
      </div>
      {related.length > 0 && (
        <section className="container-page mt-16 border-t border-line pt-12" aria-labelledby="artikel-terkait">
          <h2 id="artikel-terkait" className="text-h2">Artikel terkait</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((b) => <li key={b.id}><BlogCard blog={b} /></li>)}
          </ul>
        </section>
      )}
    </article>
  );
}
