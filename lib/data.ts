/**
 * Pengambil data untuk Server Component (ISR + tag revalidate dari Laravel).
 * Semua fungsi mengembalikan nilai aman (array kosong / null) bila API gagal,
 * sehingga halaman tetap ter-render.
 */
import "server-only";
import { isApiError, serverApi } from "@/lib/api";
import type { Banner, Blog, BlogCategory, Category, Outlet, Paginated, Product, ProductDetail, Promotion, Review } from "@/types/api";

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[kamee-web] Gagal mengambil data:", (e as Error).message);
    return fallback;
  }
}

const emptyPage = <T,>(): Paginated<T> => ({ data: [], meta: { page: 1, per_page: 12, total: 0, last_page: 1 } });

export const getCategories = () =>
  safe(serverApi<{ data: Category[] }>("/categories", { tags: ["categories"] }).then((r) => r.data), []);

export const getProducts = (query: Record<string, string | number | undefined>) =>
  safe(serverApi<Paginated<Product>>("/products", { query: { include: "options,category", ...query }, tags: ["products"] }), emptyPage<Product>());

/** null bila 404; error lain dilempar ke error boundary. */
export async function getProduct(slug: string): Promise<ProductDetail | null> {
  try {
    return (await serverApi<{ data: ProductDetail }>(`/products/${slug}`, { tags: ["products", `product:${slug}`] })).data;
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || e.status === 0)) return null;
    throw e;
  }
}

export const getRelatedProducts = (slug: string) =>
  safe(serverApi<{ data: Product[] }>(`/products/${slug}/related`, { tags: ["products"] }).then((r) => r.data), []);

export const getBanners = () =>
  safe(serverApi<{ data: Banner[] }>("/banners", { query: { placement: "home" }, tags: ["banners"] }).then((r) => r.data), []);

export const getPromotions = () =>
  safe(serverApi<{ data: Promotion[] }>("/promotions", { tags: ["promotions"] }).then((r) => r.data), []);

export const getOutlets = () =>
  safe(serverApi<{ data: Outlet[] }>("/outlets", { tags: ["outlets"], revalidate: 600 }).then((r) => r.data), []);

export const getTestimonials = () =>
  safe(serverApi<{ data: Review[] }>("/testimonials", { tags: ["testimonials"] }).then((r) => r.data), []);

export const getBlogs = (query: Record<string, string | number | undefined> = {}) =>
  safe(serverApi<Paginated<Blog>>("/blogs", { query: { per_page: 9, ...query }, tags: ["blogs"] }), emptyPage<Blog>());

export const getBlogCategories = () =>
  safe(serverApi<{ data: BlogCategory[] }>("/blog-categories", { tags: ["blogs"] }).then((r) => r.data), []);

export async function getBlog(slug: string): Promise<{ data: Blog; related: Blog[] } | null> {
  try {
    return await serverApi<{ data: Blog; related: Blog[] }>(`/blogs/${slug}`, { tags: ["blogs", `blog:${slug}`] });
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || e.status === 0)) return null;
    throw e;
  }
}
