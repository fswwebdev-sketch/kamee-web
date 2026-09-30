"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SearchBar } from "@/components/menu/search-bar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlogsInfinite } from "@/lib/queries/content";
import type { Blog, BlogCategory, Paginated } from "@/types/api";
import { BlogCard } from "./blog-card";

export function BlogList({ categories, initialPage, initialFilters }: { categories: BlogCategory[]; initialPage: Paginated<Blog>; initialFilters: { search: string; category: string } }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const filters = { search: params.get("q") ?? "", category: params.get("kategori") ?? "" };
  const same = filters.search === initialFilters.search && filters.category === initialFilters.category;
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useBlogsInfinite(filters, same ? initialPage : undefined);
  const blogs = data?.pages.flatMap((p) => p.data) ?? [];

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`/blog${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="md:w-96"><SearchBar value={filters.search} onChange={(v) => set("q", v)} placeholder="Cari artikel…" /></div>
        <div role="group" aria-label="Kategori blog" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <Chip selected={!filters.category} onClick={() => set("kategori", "")}>Semua</Chip>
          {categories.map((c) => <Chip key={c.id} selected={filters.category === c.slug} onClick={() => set("kategori", c.slug)}>{c.name}</Chip>)}
        </div>
      </div>
      {isLoading ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <li key={i}><Skeleton className="h-80 rounded-2xl" /></li>)}</ul>
      ) : blogs.length === 0 ? (
        <EmptyState title="Artikel tidak ditemukan" description="Coba kata kunci atau kategori lain." />
      ) : (
        <><h2 className="sr-only">Daftar artikel</h2><ul className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
          {blogs.map((b, i) => <li key={b.id}><BlogCard blog={b} priority={i < 1} /></li>)}
        </ul></>
      )}
      {hasNextPage && <Button variant="outline" className="mx-auto" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>Muat artikel lainnya</Button>}
    </div>
  );
}
