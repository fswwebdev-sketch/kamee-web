"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User } from "lucide-react";
import { useCartSummary } from "@/features/cart/hooks";
import { useIsAuthenticated } from "@/features/auth/store";
import { useMounted, useScrolled } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export const NAV_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/promo", label: "Promo" },
  { href: "/tentang", label: "Tentang" },
  { href: "/outlet", label: "Outlet" },
  { href: "/blog", label: "Blog" },
  { href: "/kontak", label: "Kontak" },
];

/** Transparan di atas hero, berubah glass setelah scroll 80 px (bagian 6). */
export function Navbar() {
  const pathname = usePathname();
  const scrolled = useScrolled(80);
  const overHero = pathname === "/" && !scrolled;
  const { count } = useCartSummary();
  const authed = useIsAuthenticated();
  const mounted = useMounted();

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b pt-safe transition-[background-color,border-color,box-shadow] duration-250",
        overHero ? "border-transparent bg-transparent" : "glass border-line/60 shadow-soft",
      )}
    >
      <nav aria-label="Navigasi utama" className="container-page flex h-16 items-center justify-between gap-4 md:h-18">
        <Logo inverted={overHero} />
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition",
                    overHero ? "text-white/90 hover:bg-white/10 hover:text-white" : "text-ink hover:bg-cream",
                    active && (overHero ? "text-white" : "text-primary"),
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className={cn("flex items-center gap-1", overHero ? "text-white" : "text-ink")}>
          <ThemeToggle className={overHero ? "hover:bg-white/10" : undefined} />
          <Link
            href={mounted && authed ? "/akun" : "/masuk"}
            aria-label={mounted && authed ? "Akun saya" : "Masuk"}
            className={cn("hidden size-11 place-items-center rounded-full transition md:grid", overHero ? "hover:bg-white/10" : "hover:bg-cream")}
          >
            <User className="size-5" />
          </Link>
          <Link
            href="/keranjang"
            aria-label={`Keranjang, ${count} item`}
            className={cn("relative grid size-11 place-items-center rounded-full transition", overHero ? "hover:bg-white/10" : "hover:bg-cream")}
          >
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-on-primary ring-2 ring-bg" aria-hidden="true">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
          <Link href="/menu" className="ml-2 hidden rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover md:inline-flex">
            Pesan Sekarang
          </Link>
        </div>
      </nav>
    </header>
  );
}
