import type { Metadata } from "next";
import type { Blog, Outlet, ProductDetail } from "@/types/api";
import { env } from "./env";

export const site = {
  name: "Kamee Coffee",
  tagline: "Nikmati Secangkir Kebahagiaan",
  description: "Kedai kopi di Perumahan Taman Cibodas, Tangerang — based coffee, manual brew & non coffee. Pesan online, bayar QRIS, ambil di outlet, makan di tempat, atau diantar.",
  locale: "id_ID",
  twitter: "@kameecoffee",
};

export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return `${env.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Helper generateMetadata dengan canonical, Open Graph, dan Twitter card. */
export function buildMetadata({
  title,
  description = site.description,
  path = "/",
  image,
  type = "website",
  noIndex = false,
  publishedTime,
}: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
  publishedTime?: string;
}): Metadata {
  const fullTitle = title ? `${title} | ${site.name}` : `${site.name} — ${site.tagline}`;
  const images = image ? [{ url: absoluteUrl(image), width: 1200, height: 630, alt: title ?? site.name }] : undefined;
  return {
    title: fullTitle,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: fullTitle,
      description,
      url: absoluteUrl(path),
      siteName: site.name,
      locale: site.locale,
      type,
      ...(images ? { images } : {}),
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, site: site.twitter, ...(images ? { images } : {}) },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}

/* ------------------------------ JSON-LD ------------------------------ */

export function cafeJsonLd(outlets: Outlet[]) {
  return outlets.map((o) => ({
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    "@id": absoluteUrl(`/outlet#${o.slug}`),
    name: o.name,
    url: absoluteUrl("/"),
    image: absoluteUrl("/hero/latte-og.jpg"),
    logo: absoluteUrl("/icons/icon-512.png"),
    telephone: `+${o.phone_wa}`,
    priceRange: "Rp15.000–Rp120.000",
    servesCuisine: ["Kopi", "Minuman"],
    acceptsReservations: false,
    menu: absoluteUrl("/menu"),
    address: {
      "@type": "PostalAddress",
      streetAddress: o.address,
      addressLocality: o.city,
      addressRegion: "Banten",
      addressCountry: "ID",
    },
    geo: { "@type": "GeoCoordinates", latitude: o.lat, longitude: o.lng },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: o.open_time.slice(0, 5),
        closes: o.close_time.slice(0, 5),
      },
    ],
    hasMap: `https://www.google.com/maps?q=${o.lat},${o.lng}`,
  }));
}

export function productJsonLd(p: ProductDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description ?? p.short_description ?? undefined,
    image: (p.images?.length ? p.images.map((i) => i.url) : [p.image_url ?? ""]).filter(Boolean).map((u) => absoluteUrl(u)),
    sku: `KMC-${p.id}`,
    category: p.category?.name,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      price: p.base_price,
      priceCurrency: "IDR",
      availability: p.is_active ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/menu/${p.slug}`),
    },
    ...(p.review_count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating_avg, reviewCount: p.review_count, bestRating: 5, worstRating: 1 } }
      : {}),
    ...(p.calories ? { nutrition: { "@type": "NutritionInformation", calories: `${p.calories} kcal` } } : {}),
  };
}

export function blogPostingJsonLd(b: Blog) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: b.title,
    description: b.meta_description ?? b.excerpt ?? undefined,
    image: b.cover_url ? [absoluteUrl(b.cover_url)] : undefined,
    datePublished: b.published_at ?? undefined,
    dateModified: b.published_at ?? undefined,
    author: { "@type": "Organization", name: b.author ?? site.name },
    publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: absoluteUrl("/icons/icon-512.png") } },
    mainEntityOfPage: absoluteUrl(`/blog/${b.slug}`),
    articleSection: b.category?.name,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}
