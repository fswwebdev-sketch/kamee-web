"use client";

import { useMemo } from "react";
import type { Tone } from "@/components/ui/badge";
import { normalizePhone } from "@/lib/format";
import { useAdminList } from "@/lib/admin/queries";
import type { AdminCustomer } from "@/lib/admin/types";
import type { LoyaltyTier } from "@/types/api";

/**
 * Backend belum menyediakan endpoint daftar tier (publik maupun admin), jadi daftar tier
 * diturunkan dari data pelanggan: 50 pelanggan dengan belanja terbesar (mencakup tier tertinggi
 * yang dimiliki pelanggan) + tier yang sudah terlihat di halaman saat ini.
 * Tier tanpa satu pun pelanggan tidak akan muncul.
 */
export function useTierCatalog(extra: (LoyaltyTier | null | undefined)[] = []) {
  const top = useAdminList<AdminCustomer>("customers", { per_page: 50, sort: "-lifetime_spend" });
  const extraKey = extra.map((t) => t?.id ?? "").join(",");
  return useMemo(() => {
    const map = new Map<number, LoyaltyTier>();
    for (const c of top.data?.data ?? []) if (c.tier) map.set(c.tier.id, c.tier);
    for (const t of extra) if (t) map.set(t.id, t);
    return [...map.values()].sort((a, b) => a.min_spend - b.min_spend);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top.data, extraKey]);
}

const TIER_TONE: Record<string, Tone> = { bronze: "warning", silver: "neutral", gold: "primary", platinum: "primary" };

export function tierTone(name: string | undefined): Tone {
  return TIER_TONE[(name ?? "").toLowerCase()] ?? "neutral";
}

/** "6281203000000" → https://wa.me/6281203000000 */
export function waHref(phone: string, text?: string) {
  return `https://wa.me/${normalizePhone(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
