"use client";

import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Banner, Blog, BlogCategory, Outlet, Paginated, Promotion, Review } from "@/types/api";
import { qk } from "./keys";

export function useOutlets(initialData?: Outlet[]) {
  return useQuery({
    queryKey: qk.outlets,
    queryFn: () => api<{ data: Outlet[] }>("/outlets").then((r) => r.data),
    initialData,
    staleTime: 10 * 60_000,
  });
}

export function usePromotions(initialData?: Promotion[]) {
  return useQuery({
    queryKey: qk.promotions,
    queryFn: () => api<{ data: Promotion[] }>("/promotions").then((r) => r.data),
    initialData,
  });
}

export function useBanners(initialData?: Banner[]) {
  return useQuery({
    queryKey: qk.banners,
    queryFn: () => api<{ data: Banner[] }>("/banners", { query: { placement: "home" } }).then((r) => r.data),
    initialData,
  });
}

export function useTestimonials(initialData?: Review[]) {
  return useQuery({
    queryKey: qk.testimonials,
    queryFn: () => api<{ data: Review[] }>("/testimonials").then((r) => r.data),
    initialData,
  });
}

export function useBlogCategories(initialData?: BlogCategory[]) {
  return useQuery({
    queryKey: qk.blogCategories,
    queryFn: () => api<{ data: BlogCategory[] }>("/blog-categories").then((r) => r.data),
    initialData,
  });
}

export function useBlogsInfinite(filters: { search?: string; category?: string }, initialPage?: Paginated<Blog>) {
  return useInfiniteQuery({
    queryKey: qk.blogs(filters),
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<Blog>>("/blogs", {
        query: { page: pageParam, per_page: 9, search: filters.search, "filter[category]": filters.category },
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.last_page ? last.meta.page + 1 : undefined),
    initialData: initialPage ? { pages: [initialPage], pageParams: [1] } : undefined,
  });
}

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  turnstile_token?: string;
}

export function useSubmitContact() {
  return useMutation({
    mutationFn: (body: ContactInput) => api<{ message: string }>("/contacts", { method: "POST", body }),
  });
}
