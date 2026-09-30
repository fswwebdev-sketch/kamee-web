"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, Home, ReceiptText, TicketPercent, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/menu", label: "Menu", icon: Coffee },
  { href: "/promo", label: "Promo", icon: TicketPercent },
  { href: "/pesanan", label: "Pesanan", icon: ReceiptText },
  { href: "/akun", label: "Akun", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi bawah" className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/akun" && pathname === "/masuk");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition", active ? "text-primary" : "text-ink/75 hover:text-ink")}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", active && "bg-cream")}>
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
