import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flame, Leaf, ShoppingBag } from "lucide-react";
import { ProductGrid } from "@/components/menu/product-grid";
import { FavoriteButton } from "@/components/menu/favorite-button";
import { VariantPicker } from "@/components/menu/variant-picker";
import { VariantSheet } from "@/components/menu/variant-sheet-host";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductReviews } from "@/components/product/product-reviews";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, JsonLd } from "@/components/ui/misc";
import { Rating } from "@/components/ui/rating";
import { getProduct, getProducts, getRelatedProducts } from "@/lib/data";
import { formatNumber, formatRupiah } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, productJsonLd } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export const revalidate = 300;

/** Prerender 12 produk terlaris saat build; sisanya dibuat on-demand (ISR) saat pertama dikunjungi. */
export const dynamicParams = true;

export async function generateStaticParams() {
  const { data } = await getProducts({ per_page: 12, sort: "-sold_count" });
  return data.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return buildMetadata({ title: "Menu tidak ditemukan", noIndex: true });
  return buildMetadata({
    title: `${p.name} — ${formatRupiah(p.base_price)}`,
    description: `${p.short_description ?? p.name}. ${p.category?.name ?? "Menu"} Kamee Coffee, rating ${p.rating_avg.toFixed(1)}/5 dari ${p.review_count} ulasan. Pesan online di Tangerang.`,
    path: `/menu/${p.slug}`,
  });
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, related] = await Promise.all([getProduct(slug), getRelatedProducts(slug)]);
  if (!product || !product.is_active) notFound();

  const images = product.images?.length ? product.images : product.image_url ? [{ id: 0, url: product.image_url, alt: product.name, sort_order: 0 }] : [];
  const crumbs = [
    { name: "Beranda", path: "/" },
    { name: "Menu", path: "/menu" },
    ...(product.category ? [{ name: product.category.name, path: `/menu?kategori=${product.category.slug}` }] : []),
    { name: product.name, path: `/menu/${product.slug}` },
  ];

  return (
    <div className="container-page pt-24 pb-16 md:pt-28">
      <JsonLd data={[productJsonLd(product), breadcrumbJsonLd(crumbs)]} />
      <Breadcrumb items={crumbs.map((c, i) => ({ label: c.name, href: i < crumbs.length - 1 ? c.path : undefined }))} />

      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={images} name={product.name} />

        <div className="flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {product.category && <Badge>{product.category.name}</Badge>}
              {product.is_best_seller && <Badge tone="primary">Best Seller</Badge>}
            </div>
            <div className="mt-3 flex items-start justify-between gap-4">
              <h1 className="text-h1">{product.name}</h1>
              <FavoriteButton product={product} className="shrink-0 border border-line" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <Rating value={product.rating_avg} count={product.review_count} />
              <span className="flex items-center gap-1 text-caption text-muted"><ShoppingBag className="size-3.5" aria-hidden="true" /> {formatNumber(product.sold_count)} terjual</span>
            </div>
            <p className="mt-4 text-price text-primary md:text-3xl">{formatRupiah(product.base_price)}</p>
            <p className="mt-4 text-body-lg text-muted">{product.description ?? product.short_description}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-surface p-4">
              <dt className="flex items-center gap-2 text-caption text-muted"><Leaf className="size-4 text-primary" aria-hidden="true" />Komposisi</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{product.composition ?? "-"}</dd>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <dt className="flex items-center gap-2 text-caption text-muted"><Flame className="size-4 text-primary" aria-hidden="true" />Kalori</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{product.calories ? `± ${product.calories} kkal` : "-"} <span className="text-muted">/ porsi regular</span></dd>
            </div>
          </dl>

          <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft md:p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-ink">Sesuaikan pesananmu</h2>
            <VariantPicker product={product} groups={product.option_groups ?? []} />
          </div>
        </div>
      </div>

      <div className="mt-16 border-t border-line pt-12">
        <ProductReviews product={product} />
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-line pt-12" aria-labelledby="terkait-title">
          <h2 id="terkait-title" className="text-h2">Mungkin kamu juga suka</h2>
          <div className="mt-6"><ProductGrid products={related.slice(0, 4)} priorityCount={0} /></div>
        </section>
      )}
      <VariantSheet />
    </div>
  );
}
