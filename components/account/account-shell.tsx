"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Coins, Heart, LayoutDashboard, LogOut, MapPin, Receipt, TicketPercent } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/store";
import { useLogout, useMe } from "@/lib/queries/account";
import { useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/akun", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/akun/pesanan", label: "Pesanan", icon: Receipt },
  { href: "/akun/poin", label: "Poin & Tier", icon: Coins },
  { href: "/akun/voucher", label: "Voucher", icon: TicketPercent },
  { href: "/akun/favorit", label: "Favorit", icon: Heart },
  { href: "/akun/alamat", label: "Alamat", icon: MapPin },
];

/** Kerangka halaman akun + guard: tamu diarahkan ke /masuk. */
export function AccountShell({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const customer = useAuthStore((s) => s.customer);
  const hydrated = mounted && useAuthStore.persist.hasHydrated();
  useMe();
  const logout = useLogout();

  useEffect(() => {
    if (hydrated && !token) router.replace(`/masuk?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, token, router, pathname]);

  if (!hydrated || !token || !customer) {
    return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Skeleton className="h-72" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
        <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4">
          <Avatar name={customer.name} className="size-12" />
          <div className="min-w-0">
            <p className="truncate font-heading font-semibold text-ink">{customer.name}</p>
            <p className="text-caption text-muted">{customer.tier?.name ?? "Bronze"} · {customer.points_balance} poin</p>
          </div>
        </div>
        <nav aria-label="Menu akun" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-3xl lg:border lg:border-line lg:bg-surface lg:p-2 lg:px-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition",
                  active ? "bg-primary text-on-primary" : "bg-cream text-ink hover:bg-line lg:bg-transparent lg:hover:bg-cream",
                )}
              >
                <Icon className="size-4" aria-hidden="true" /> {label}
              </Link>
            );
          })}
          <button type="button" onClick={() => logout.mutate(undefined, { onSettled: () => router.replace("/") })} className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/8">
            <LogOut className="size-4" aria-hidden="true" /> Keluar
          </button>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
