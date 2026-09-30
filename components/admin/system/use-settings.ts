"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin/api";
import { adminKeys } from "@/lib/admin/queries";
import type { Settings } from "@/lib/admin/types";

/** GET settings (khusus Super Admin). Kunci cache ikut ter-invalidasi oleh useAdminSave("settings"). */
export function useSettings(enabled = true) {
  return useQuery({
    queryKey: adminKeys.list("settings"),
    queryFn: ({ signal }) => adminApi<{ data: Settings }>("settings", { signal }).then((r) => r.data),
    enabled,
    staleTime: 60_000,
  });
}
