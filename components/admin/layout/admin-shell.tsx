"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { OrderRealtime } from "@/components/admin/orders/order-realtime";
import { ConfirmHost } from "@/components/admin/ui/confirm";
import { buttonClasses } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { abilityForPath } from "@/lib/admin/nav";
import { can } from "@/lib/admin/permissions";
import { useAdminSession } from "@/lib/admin/queries";
import { useAdminUi } from "@/lib/admin/store";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { primeAudio } from "@/features/admin/sound";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

function AccessDenied() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div className="max-w-sm">
        <ShieldAlert className="mx-auto size-12 text-muted" aria-hidden="true" />
        <h1 className="mt-4 text-h3">Akses terbatas</h1>
        <p className="mt-2 text-sm text-muted">Halaman ini hanya untuk Super Admin. Hubungi pemilik usaha bila Anda memerlukan akses.</p>
        <a href="/admin" className={buttonClasses("secondary", "md", "mt-5")}>Kembali ke Ringkasan</a>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useAdminSession();
  const collapsed = useAdminUi((s) => s.sidebarCollapsed);
  const setCollapsed = useAdminUi((s) => s.setSidebarCollapsed);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [overlayOpen, setOverlayOpen] = useState(false);

  // Tutup overlay saat pindah halaman / melebar ke desktop
  useEffect(() => setOverlayOpen(false), [pathname, isDesktop]);

  // Audio notifikasi hanya boleh diaktifkan setelah interaksi pengguna
  useEffect(() => {
    const prime = () => primeAudio();
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  if (session.isPending) {
    return (
      <div className="flex min-h-svh">
        <div className="hidden w-[72px] border-r border-line bg-surface md:block lg:w-64" />
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          <Skeleton className="mt-6 h-72 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (session.isError || !session.data) {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <ErrorState title="Tidak dapat memuat sesi admin" onRetry={() => session.refetch()} />
      </div>
    );
  }

  const user = session.data;
  const needed = abilityForPath(pathname);
  const allowed = !needed || can(user, needed);
  const expanded = isDesktop ? !collapsed : overlayOpen;

  return (
    <div className="min-h-svh bg-bg">
      <Sidebar
        user={user}
        expanded={expanded}
        overlay={!isDesktop && overlayOpen}
        onClose={() => setOverlayOpen(false)}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      {!isDesktop && overlayOpen && (
        <div className="fixed inset-0 z-40 animate-fade-in bg-[#1A1210]/45 backdrop-blur-[1px]" onClick={() => setOverlayOpen(false)} aria-hidden="true" />
      )}
      <div className={cn("flex min-h-svh flex-col transition-[padding] duration-200 motion-reduce:transition-none", "md:pl-[72px]", !collapsed && "lg:pl-64")}>
        <Topbar user={user} onMenu={() => setOverlayOpen((v) => !v)} />
        <main id="konten" tabIndex={-1} className="flex-1 px-3 py-5 outline-none md:px-4 md:py-6 lg:px-6 xl:px-8">
          {allowed ? children : <AccessDenied />}
        </main>
      </div>
      <OrderRealtime user={user} />
      <ConfirmHost />
    </div>
  );
}
