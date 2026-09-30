import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuView } from "@/components/menu/menu-view";
import { VariantSheet } from "@/components/menu/variant-sheet-host";
import { Breadcrumb, SectionHeader } from "@/components/ui/misc";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { getCategories, getProducts } from "@/lib/data";
import { PRODUCTS_PER_PAGE } from "@/lib/queries/keys";
import { buildMetadata } from "@/lib/seo";

type SearchParams = Promise<{ q?: string; kategori?: string; urut?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { kategori, q } = await searchParams;
  const categories = await getCategories();
  const cat = categories.find((c) => c.slug === kategori);
  return buildMetadata({
    title: cat ? `Menu ${cat.name}` : "Menu",
    description: cat
      ? `Pilihan ${cat.name.toLowerCase()} Kamee Coffee. Pesan online untuk ambil di outlet, dine-in, atau diantar di Tangerang.`
      : "Menu lengkap Kamee Coffee: kopi, non coffee, signature drink, teh, camilan, dan dessert. Pesan online sekarang.",
    path: cat ? `/menu?kategori=${cat.slug}` : "/menu",
    noIndex: Boolean(q),
  });
}

export default async function MenuPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "", kategori = "", urut = "-sold_count" } = await searchParams;
  const [categories, firstPage] = await Promise.all([
    getCategories(),
    getProducts({ page: 1, per_page: PRODUCTS_PER_PAGE, search: q || undefined, sort: urut, "filter[category]": kategori || undefined }),
  ]);

  return (
    <div className="container-page pt-24 pb-16 md:pt-28">
      <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Menu" }]} />
      <SectionHeader as="h1" className="mt-3" title="Menu Kamee" description="Diseduh segar setiap pesanan. Pilih ukuran, tingkat gula, es, dan topping favoritmu." />
      <div className="mt-6">
        <Suspense fallback={<ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <li key={i}><ProductCardSkeleton /></li>)}</ul>}>
          <MenuView categories={categories} initialPage={firstPage} initialFilters={{ search: q, category: kategori, sort: urut }} />
        </Suspense>
      </div>
      <VariantSheet />
    </div>
  );
}
