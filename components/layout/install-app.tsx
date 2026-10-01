"use client";

import { Download, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { useCartSummary } from "@/features/cart/hooks";
import { dismissInstall, installDismissedRecently, requestInstall, useCanInstall } from "@/features/pwa/store";
import { cn } from "@/lib/utils";

/** Tombol "Tambahkan ke layar utama" (Akun, footer). Tidak tampil bila sudah terpasang / tidak didukung. */
export function InstallAppButton({ className, variant = "card" }: { className?: string; variant?: "card" | "link" }) {
  const can = useCanInstall();
  if (!can) return null;
  if (variant === "link") {
    return (
      <button type="button" onClick={() => requestInstall()} className={cn("inline-flex min-h-11 items-center gap-2 font-semibold text-primary", className)}>
        <Download className="size-4" aria-hidden="true" /> Tambahkan ke layar utama
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => requestInstall()}
      className={cn("flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition hover:border-primary active:scale-[.99]", className)}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cream text-primary"><Smartphone className="size-5" aria-hidden="true" /></span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-ink">Tambahkan ke layar utama</span>
        <span className="block text-caption text-muted">Buka Kamee seperti aplikasi, lebih cepat & bisa offline</span>
      </span>
      <Download className="size-5 text-primary" aria-hidden="true" />
    </button>
  );
}

/** Banner pasang aplikasi di beranda (ponsel). Muncul setelah 4 detik, bisa ditutup 14 hari. */
export function InstallBanner() {
  const can = useCanInstall();
  const { count } = useCartSummary(); // slot bawah dipakai sticky cart bar bila keranjang berisi
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!can || installDismissedRecently()) return;
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, [can]);
  if (!can || !show || count > 0) return null;
  const close = () => {
    dismissInstall();
    setShow(false);
  };
  return (
    <div role="region" aria-label="Pasang aplikasi Kamee" className="hide-on-keyboard fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 animate-fade-up md:hidden">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lift">
        <LogoMark className="size-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Pasang aplikasi Kamee</p>
          <p className="truncate text-caption text-muted">Pesan lebih cepat dari layar utama</p>
        </div>
        <Button size="sm" onClick={() => requestInstall().then(close)}>Pasang</Button>
        <button type="button" onClick={close} aria-label="Tutup ajakan pasang aplikasi" className="-mr-1 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-cream">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
