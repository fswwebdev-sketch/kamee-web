"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Category, Paginated, Product, Review } from "@/types/api";
import { PRODUCTS_PER_PAGE, qk, type ProductFilters } from "./keys";


export function productQuery(f: ProductFilters, page: number) {
  return {
    page,
    per_page: PRODUCTS_PER_PAGE,
    include: "options,category",
    search: f.search || undefined,
    sort: f.sort || "-sold_count",
    "filter[category]": f.category || undefined,
    "filter[outlet]": f.outlet ?? undefined,
  };
}

export function useCategories(initialData?: Category[]) {
  return useQuery({
    queryKey: qk.categories,
    queryFn: () => api<{ data: Category[] }>("/categories").then((r) => r.data),
    initialData,
    staleTime: 10 * 60_000,
  });
}

/** Menu dengan infinite scroll. Halaman pertama bisa diisi dari Server Component. */
export function useProductsInfinite(filters: ProductFilters, initialPage?: Paginated<Product>) {
  return useInfiniteQuery({
    queryKey: qk.products(filters),
    queryFn: ({ pageParam, signal }) => api<Paginated<Product>>("/products", { query: productQuery(filters, pageParam), signal }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.last_page ? last.meta.page + 1 : undefined),
    initialData: initialPage ? { pages: [initialPage], pageParams: [1] } : undefined,
    staleTime: 60_000,
  });
}

export function useProductList(params: Record<string, string | number>, initialData?: Product[]) {
  return useQuery({
    queryKey: qk.productList(params),
    queryFn: () => api<Paginated<Product>>("/products", { query: { include: "options,category", ...params } }).then((r) => r.data),
    initialData,
    staleTime: 5 * 60_000,
  });
}

export function useProductReviews(slug: string, rating?: number, enabled = true) {
  return useInfiniteQuery({
    enabled,
    queryKey: qk.reviews(slug, rating),
    queryFn: ({ pageParam }) => api<Paginated<Review>>(`/products/${slug}/reviews`, { query: { page: pageParam, per_page: 5, rating } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.last_page ? last.meta.page + 1 : undefined),
  });
}

/** Semua produk aktif (untuk memetakan pesan ulang ke detail produk & opsi). */
export async function fetchAllProducts(): Promise<Product[]> {
  const all: Product[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await api<Paginated<Product>>("/products", { query: { page, per_page: 50, include: "options,category" } });
    all.push(...res.data);
    if (res.meta.page >= res.meta.last_page) break;
  }
  return all;
}
