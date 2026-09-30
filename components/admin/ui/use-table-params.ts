"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";

export interface TableParams {
  page: number;
  perPage: number;
  /** Format Spatie QueryBuilder: "name" / "-created_at" */
  sort: string;
  search: string;
  filters: Record<string, string>;
}

/**
 * State tabel (halaman, jumlah per halaman, urutan, pencarian, filter) disimpan di URL,
 * sehingga bisa dibagikan, bertahan saat refresh, dan tombol Back bekerja.
 */
export function useTableParams(defaults: { perPage?: number; sort?: string; filterKeys?: string[] } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const filterKeys = defaults.filterKeys ?? [];
  const filterKeyStr = filterKeys.join(",");

  const params: TableParams = useMemo(() => {
    const filters: Record<string, string> = {};
    for (const k of filterKeyStr ? filterKeyStr.split(",") : []) {
      const v = sp.get(k);
      if (v) filters[k] = v;
    }
    return {
      page: Math.max(1, Number(sp.get("page")) || 1),
      perPage: Number(sp.get("per_page")) || defaults.perPage || 20,
      sort: sp.get("sort") ?? defaults.sort ?? "",
      search: sp.get("q") ?? "",
      filters,
    };
  }, [sp, defaults.perPage, defaults.sort, filterKeyStr]);

  const update = useCallback(
    (patch: Partial<Omit<TableParams, "filters">> & { filters?: Record<string, string | null | undefined> }) => {
      const next = new URLSearchParams(sp.toString());
      const set = (k: string, v: string | number | null | undefined, dflt?: string | number) => {
        if (v === undefined) return;
        if (v === null || v === "" || v === dflt) next.delete(k);
        else next.set(k, String(v));
      };
      set("page", patch.page, 1);
      set("per_page", patch.perPage, defaults.perPage ?? 20);
      set("sort", patch.sort, defaults.sort ?? "");
      set("q", patch.search, "");
      for (const [k, v] of Object.entries(patch.filters ?? {})) set(k, v ?? null);
      // Perubahan selain halaman → kembali ke halaman 1
      if (patch.page === undefined && (patch.search !== undefined || patch.filters || patch.sort !== undefined || patch.perPage !== undefined)) next.delete("page");
      const qs = next.toString();
      startTransition(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
    },
    [sp, router, pathname, defaults.perPage, defaults.sort],
  );

  return { params, update, pending };
}

/** Konversi state tabel → query Spatie QueryBuilder (filter[x], sort, page, per_page). */
export function toApiQuery(p: TableParams, map: Record<string, string> = {}, searchKey = "filter[search]") {
  const q: Record<string, string | number> = { page: p.page, per_page: p.perPage };
  if (p.sort) q.sort = p.sort;
  if (p.search) q[searchKey] = p.search;
  for (const [k, v] of Object.entries(p.filters)) q[map[k] ?? `filter[${k}]`] = v;
  return q;
}
