import type { MetadataRoute } from "next";
import { getBlogs, getCategories, getProducts } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, blogs, categories] = await Promise.all([getProducts({ per_page: 50 }), getBlogs({ per_page: 50 }), getCategories()]);
  const now = new Date();
  const statics: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1, lastModified: now },
    { url: absoluteUrl("/menu"), changeFrequency: "daily", priority: 0.9, lastModified: now },
    { url: absoluteUrl("/promo"), changeFrequency: "daily", priority: 0.8, lastModified: now },
    { url: absoluteUrl("/outlet"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/tentang"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.6, lastModified: now },
    { url: absoluteUrl("/kontak"), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/pesanan"), changeFrequency: "yearly", priority: 0.3 },
  ];
  return [
    ...statics,
    ...categories.map((c) => ({ url: absoluteUrl(`/menu?kategori=${c.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.data.map((p) => ({ url: absoluteUrl(`/menu/${p.slug}`), changeFrequency: "weekly" as const, priority: 0.8, images: p.image_url ? [absoluteUrl(p.image_url)] : undefined })),
    ...blogs.data.map((b) => ({ url: absoluteUrl(`/blog/${b.slug}`), lastModified: b.published_at ? new Date(b.published_at) : undefined, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
