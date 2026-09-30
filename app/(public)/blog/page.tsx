import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogList } from "@/components/blog/blog-list";
import { Breadcrumb, SectionHeader } from "@/components/ui/misc";
import { getBlogCategories, getBlogs } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";

type SearchParams = Promise<{ q?: string; kategori?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { q, kategori } = await searchParams;
  return buildMetadata({
    title: "Blog",
    description: "Tips menyeduh kopi, cerita di balik menu, dan kabar terbaru dari Kamee Coffee.",
    path: kategori ? `/blog?kategori=${kategori}` : "/blog",
    noIndex: Boolean(q),
  });
}

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "", kategori = "" } = await searchParams;
  const [categories, page] = await Promise.all([getBlogCategories(), getBlogs({ search: q || undefined, "filter[category]": kategori || undefined })]);
  return (
    <div className="container-page pt-24 pb-16 md:pt-28">
      <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Blog" }]} />
      <SectionHeader as="h1" className="mt-3" title="Blog Kamee" description="Tips menyeduh, cerita di balik menu, dan kabar terbaru dari kedai." />
      <div className="mt-8">
        <Suspense>
          <BlogList categories={categories} initialPage={page} initialFilters={{ search: q, category: kategori }} />
        </Suspense>
      </div>
    </div>
  );
}
