import type { ReportGroup } from "@/lib/admin/types";

/** Jenis laporan: slug URL (?jenis=…) ⇄ group_by backend. */
export const REPORT_TABS = [
  { slug: "hari", group: "day", label: "Per hari", heading: "Tanggal", noun: "hari" },
  { slug: "bulan", group: "month", label: "Per bulan", heading: "Bulan", noun: "bulan" },
  { slug: "produk", group: "product", label: "Per produk", heading: "Produk", noun: "produk" },
  { slug: "outlet", group: "outlet", label: "Per outlet", heading: "Outlet", noun: "outlet" },
  { slug: "metode-bayar", group: "payment_method", label: "Per metode bayar", heading: "Metode bayar", noun: "metode bayar" },
] as const satisfies readonly { slug: string; group: ReportGroup; label: string; heading: string; noun: string }[];

export type ReportTab = (typeof REPORT_TABS)[number];
export type ReportSlug = ReportTab["slug"];

export const DEFAULT_TAB: ReportTab = REPORT_TABS[0];

export function isPeriodGroup(group: ReportGroup): group is "day" | "month" {
  return group === "day" || group === "month";
}
