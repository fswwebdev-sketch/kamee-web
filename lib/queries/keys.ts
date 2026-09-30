export const PRODUCTS_PER_PAGE = 12;

export interface ProductFilters {
  search?: string;
  category?: string;
  sort?: string;
  outlet?: number | null;
}

/** Query key terpusat agar invalidasi konsisten. */
export const qk = {
  categories: ["categories"] as const,
  products: (f: ProductFilters) => ["products", f] as const,
  productList: (params: Record<string, unknown>) => ["products", "list", params] as const,
  product: (slug: string) => ["product", slug] as const,
  reviews: (slug: string, rating?: number) => ["product", slug, "reviews", rating ?? 0] as const,
  related: (slug: string) => ["product", slug, "related"] as const,
  banners: ["banners"] as const,
  promotions: ["promotions"] as const,
  outlets: ["outlets"] as const,
  testimonials: ["testimonials"] as const,
  blogs: (f: { search?: string; category?: string }) => ["blogs", f] as const,
  blogCategories: ["blog-categories"] as const,
  quote: (fingerprint: string) => ["quote", fingerprint] as const,
  paymentStatus: (code: string) => ["payment-status", code] as const,
  track: (code: string, phone: string) => ["track", code, phone] as const,
  me: ["me"] as const,
  myOrders: (status?: string) => ["me", "orders", status ?? "all"] as const,
  points: ["me", "points"] as const,
  vouchers: ["me", "vouchers"] as const,
  favorites: ["me", "favorites"] as const,
  addresses: ["me", "addresses"] as const,
};
