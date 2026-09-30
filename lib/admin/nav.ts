import {
  BarChart3,
  GalleryHorizontalEnd,
  Inbox,
  LayoutDashboard,
  Newspaper,
  Package,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  Store,
  Tags,
  TicketPercent,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Ability } from "./permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  ability: Ability;
  exact?: boolean;
  badge?: "orders" | "contacts";
}

export const ADMIN_NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Utama",
    items: [
      { href: "/admin", label: "Ringkasan", icon: LayoutDashboard, ability: "dashboard.view", exact: true },
      { href: "/admin/pesanan", label: "Pesanan", icon: ReceiptText, ability: "orders.view", badge: "orders" },
      { href: "/admin/laporan", label: "Laporan", icon: BarChart3, ability: "reports.view" },
    ],
  },
  {
    group: "Katalog",
    items: [
      { href: "/admin/produk", label: "Produk", icon: Package, ability: "catalog.view" },
      { href: "/admin/kategori", label: "Kategori", icon: Tags, ability: "catalog.manage" },
      { href: "/admin/opsi", label: "Opsi Varian", icon: SlidersHorizontal, ability: "catalog.manage" },
    ],
  },
  {
    group: "Pemasaran",
    items: [
      { href: "/admin/promo", label: "Promo & Voucher", icon: TicketPercent, ability: "promotions.manage" },
      { href: "/admin/banner", label: "Banner", icon: GalleryHorizontalEnd, ability: "banners.manage" },
      { href: "/admin/blog", label: "Blog", icon: Newspaper, ability: "blog.manage" },
    ],
  },
  {
    group: "Pelanggan",
    items: [
      { href: "/admin/pelanggan", label: "Pelanggan", icon: Users, ability: "customers.view" },
      { href: "/admin/pesan", label: "Pesan Masuk", icon: Inbox, ability: "contacts.manage", badge: "contacts" },
    ],
  },
  {
    group: "Sistem",
    items: [
      { href: "/admin/outlet", label: "Outlet", icon: Store, ability: "outlets.view" },
      { href: "/admin/pengguna", label: "Pengguna", icon: UserCog, ability: "users.manage" },
      { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings, ability: "settings.manage" },
    ],
  },
];

/** Hak akses yang dibutuhkan sebuah path (untuk penjaga halaman di klien). */
export function abilityForPath(pathname: string): Ability | null {
  const items = ADMIN_NAV.flatMap((g) => g.items).sort((a, b) => b.href.length - a.href.length);
  const hit = items.find((i) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`)));
  return hit?.ability ?? null;
}
