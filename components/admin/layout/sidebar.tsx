"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { useAdminList } from "@/lib/admin/queries";
import { ADMIN_NAV, type NavItem } from "@/lib/admin/nav";
import { can } from "@/lib/admin/permissions";
import type { AdminUser, Paginated } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/features/admin/realtime-store";

function useBadges(user: AdminUser) {
  const unseen = useRealtime((s) => s.unseen);
  // "Perlu diproses" = sudah lunas tapi belum diproses
  const toProcess = useAdminList<unknown>("orders", { "filter[status]": "paid", per_page: 1 }, { refetchInterval: 60_000 });
  const contacts = useAdminList<unknown>("contacts", { "filter[status]": "new", per_page: 1 }, { enabled: can(user, "contacts.manage"), refetchInterval: 120_000 });
  const total = (d: unknown) => (d as Paginated<unknown> | undefined)?.meta?.total ?? 0;
  return { orders: Math.max(total(toProcess.data), unseen), contacts: total(contacts.data) };
}

/**
 * Sidebar admin.
 * - ≥1024px: menempel, bisa diciutkan jadi rail ikon (preferensi disimpan).
 * - 768–1023px (tablet kasir): rail ikon; tombol menu membuka versi lebar sebagai overlay.
 * - <768px: tersembunyi; dibuka sebagai drawer.
 */
export function Sidebar({
  user,
  expanded,
  overlay,
  onClose,
  onToggleCollapse,
}: {
  user: AdminUser;
  /** Label terlihat (lebar penuh) */
  expanded: boolean;
  /** Sedang tampil sebagai overlay/drawer (tablet & mobile) */
  overlay: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const badges = useBadges(user);

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <aside
      aria-label="Navigasi admin"
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-surface transition-[width,transform] duration-200 ease-[var(--ease-out-soft)] motion-reduce:transition-none",
        expanded ? "w-64" : "w-[72px]",
        overlay ? "translate-x-0 shadow-lift" : "max-md:-translate-x-full",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center gap-2.5 border-b border-line", expanded ? "px-4" : "justify-center")}>
        <Link href="/admin" className="flex items-center gap-2.5 rounded-xl" aria-label="Kamee Admin — Ringkasan">
          <LogoMark />
          {expanded && (
            <span className="font-heading text-lg font-bold tracking-tight text-ink">
              Kamee<span className="text-primary"> Admin</span>
            </span>
          )}
        </Link>
        {overlay && expanded && (
          <button type="button" onClick={onClose} aria-label="Tutup menu" className="ml-auto grid size-9 place-items-center rounded-full text-muted hover:bg-cream lg:hidden">
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="scrollbar-none flex-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAV.map((group) => {
          const items = group.items.filter((i) => can(user, i.ability));
          if (!items.length) return null;
          return (
            <div key={group.group} className="mb-4">
              {expanded ? (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{group.group}</p>
              ) : (
                <div className="mx-auto mb-2 h-px w-8 bg-line" aria-hidden="true" />
              )}
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const active = isActive(item);
                  const count = item.badge ? badges[item.badge] : 0;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={overlay ? onClose : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex h-10 items-center gap-3 rounded-xl text-sm font-medium transition",
                          expanded ? "px-3" : "justify-center",
                          active ? "bg-primary text-on-primary shadow-soft" : "text-ink/80 hover:bg-cream hover:text-ink",
                        )}
                      >
                        <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                        {expanded ? <span className="flex-1 truncate">{item.label}</span> : <span className="sr-only">{item.label}</span>}
                        {count > 0 && (
                          <span
                            className={cn(
                              "grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold leading-5",
                              active ? "bg-on-primary text-primary" : "bg-danger text-white",
                              !expanded && "absolute -right-0.5 -top-0.5 min-w-4 px-1 text-[10px] leading-4",
                            )}
                          >
                            {count > 99 ? "99+" : count}
                            <span className="sr-only"> {item.badge === "orders" ? "pesanan perlu diproses" : "pesan baru"}</span>
                          </span>
                        )}
                        {!expanded && (
                          <span
                            role="presentation"
                            className="pointer-events-none absolute left-full z-10 ml-3 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-bg opacity-0 shadow-lift transition group-hover:opacity-100 group-focus-visible:opacity-100"
                          >
                            {item.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="hidden border-t border-line p-3 lg:block">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={expanded ? "Ciutkan sidebar" : "Lebarkan sidebar"}
          className={cn("flex h-10 w-full items-center gap-3 rounded-xl text-sm font-medium text-muted transition hover:bg-cream hover:text-ink", expanded ? "px-3" : "justify-center")}
        >
          {expanded ? <ChevronsLeft className="size-[18px]" aria-hidden="true" /> : <ChevronsRight className="size-[18px]" aria-hidden="true" />}
          {expanded && "Ciutkan"}
        </button>
      </div>
    </aside>
  );
}
