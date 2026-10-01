"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, Home, TicketPercent, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Beranda", icon: Home, match: (p: string) => p === "/" },
  { href: "/menu", label: "Menu", icon: Coffee, match: (p: string) => p === "/menu" || p.startsWith("/menu/") },
  { href: "/promo", label: "Promo", icon: TicketPercent, match: (p: string) => p.startsWith("/promo") },
  // Lacak pesanan & riwayat ada di bawah Akun (juga untuk tamu)
  { href: "/akun", label: "Akun", icon: User, match: (p: string) => p.startsWith("/akun") || p === "/masuk" || p.startsWith("/pesanan") },
];

/** Alur transaksi memakai bar aksi sendiri (lanjut checkout / bayar), jadi tab bar disembunyikan. */
export const FLOW_ROUTES = [/^\/keranjang/, /^\/checkout/, /^\/pesanan\/[^/]+\/bayar/];

export function BottomNav() {
  const pathname = usePathname();
  if (FLOW_ROUTES.some((r) => r.test(pathname))) return null;
  return (
    <nav
      aria-label="Navigasi bawah"
      className="hide-on-keyboard fixed inset-x-0 bottom-0 z-50 select-none border-t border-line bg-surface/95 pb-safe backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition active:scale-95 motion-reduce:active:scale-100",
                  active ? "text-primary" : "text-ink/75 hover:text-ink",
                )}
              >
                <span className={cn("grid h-7 w-14 place-items-center rounded-full transition", active && "bg-cream")}>
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
