"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut, Menu, Store, Volume2, VolumeX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { toast } from "@/components/ui/toast";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/admin/ui/dropdown";
import { adminApi } from "@/lib/admin/api";
import { can } from "@/lib/admin/permissions";
import { useOutletsRef } from "@/lib/admin/queries";
import { useAdminUi } from "@/lib/admin/store";
import type { AdminUser } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { useRealtime, type RealtimeStatus } from "@/features/admin/realtime-store";
import { playNewOrderChime, primeAudio } from "@/features/admin/sound";

const REALTIME: Record<RealtimeStatus, { label: string; dot: string; hint: string }> = {
  idle: { label: "Realtime", dot: "bg-line", hint: "Menunggu koneksi" },
  connecting: { label: "Menyambung…", dot: "bg-warning animate-pulse", hint: "Menyambung ke server realtime" },
  connected: { label: "Live", dot: "bg-success", hint: "Terhubung ke Reverb — pesanan masuk langsung" },
  polling: { label: "Polling", dot: "bg-warning", hint: "Realtime tidak aktif, data diperbarui tiap 20 detik" },
  offline: { label: "Terputus", dot: "bg-danger", hint: "Koneksi realtime terputus, beralih ke polling" },
  simulated: { label: "Simulasi", dot: "bg-primary", hint: "Mode mock: pesanan baru disimulasikan berkala" },
};

export function OutletSwitcher({ user }: { user: AdminUser }) {
  const outletId = useAdminUi((s) => s.outletId);
  const setOutletId = useAdminUi((s) => s.setOutletId);
  const outlets = useOutletsRef(can(user, "outlets.switch"));

  const single = outlets.data?.length === 1 ? outlets.data[0] : null;
  if (!can(user, "outlets.switch") || single) {
    return (
      <span className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-ink">
        <Store className="size-4 text-primary" aria-hidden="true" />
        <span className="max-w-40 truncate">{user.outlet?.name ?? single?.name ?? "Outlet"}</span>
      </span>
    );
  }
  const current = outlets.data?.find((o) => o.id === outletId);
  return (
    <Dropdown
      align="start"
      ariaLabel={`Pilih outlet, saat ini: ${current?.name ?? "Semua outlet"}`}
      buttonClassName="flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-ink transition hover:border-primary"
      label={
        <>
          <Store className="size-4 text-primary" aria-hidden="true" />
          <span className="max-w-32 truncate sm:max-w-48">{current?.name ?? "Semua outlet"}</span>
          <ChevronDown className="size-4 text-muted" aria-hidden="true" />
        </>
      }
    >
      {(close) => (
        <>
          <DropdownItem checked={outletId === null} onSelect={() => (setOutletId(null), close())}>Semua outlet</DropdownItem>
          {(outlets.data ?? []).map((o) => (
            <DropdownItem key={o.id} checked={outletId === o.id} onSelect={() => (setOutletId(o.id), close())}>
              {o.name}
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}

function RealtimeIndicator() {
  const status = useRealtime((s) => s.status);
  const r = REALTIME[status];
  return (
    <span className="hidden h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-muted sm:flex" title={r.hint}>
      <span className={cn("size-2 rounded-full", r.dot)} aria-hidden="true" />
      <span aria-live="polite">{r.label}</span>
      <span className="sr-only">: {r.hint}</span>
    </span>
  );
}

function SoundToggle() {
  const enabled = useAdminUi((s) => s.soundEnabled);
  const setEnabled = useAdminUi((s) => s.setSoundEnabled);
  return (
    <button
      type="button"
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        if (next) {
          primeAudio();
          setTimeout(() => playNewOrderChime(0.15), 50);
        }
        toast.info(next ? "Suara notifikasi aktif" : "Suara notifikasi dimatikan");
      }}
      aria-pressed={enabled}
      aria-label="Suara notifikasi pesanan baru"
      title={enabled ? "Matikan suara notifikasi" : "Aktifkan suara notifikasi"}
      className="grid size-10 place-items-center rounded-full text-ink transition hover:bg-cream"
    >
      {enabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5 text-muted" />}
    </button>
  );
}

function UserMenu({ user }: { user: AdminUser }) {
  const router = useRouter();
  const qc = useQueryClient();
  const logout = async () => {
    try {
      await adminApi("auth/logout", { method: "POST" });
    } finally {
      qc.clear();
      router.replace("/admin/login");
      router.refresh();
    }
  };
  return (
    <Dropdown
      ariaLabel={`Menu akun ${user.name}`}
      buttonClassName="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-cream"
      label={
        <>
          <Avatar name={user.name} className="size-8 text-xs" />
          <span className="hidden text-left leading-tight lg:block">
            <span className="block max-w-36 truncate text-sm font-semibold text-ink">{user.name}</span>
            <span className="block text-[11px] font-medium text-muted">{user.role_label}</span>
          </span>
          <ChevronDown className="hidden size-4 text-muted lg:block" aria-hidden="true" />
        </>
      }
    >
      {() => (
        <>
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-ink">{user.name}</p>
            <p className="text-caption text-muted">{user.email}</p>
          </div>
          <DropdownSeparator />
          <DropdownItem icon={<ExternalLink />} onSelect={() => window.open("/", "_blank", "noopener")}>Lihat situs</DropdownItem>
          <DropdownItem icon={<LogOut />} danger onSelect={logout}>Keluar</DropdownItem>
        </>
      )}
    </Dropdown>
  );
}

export function Topbar({ user, onMenu }: { user: AdminUser; onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-bg/90 px-3 backdrop-blur md:px-5">
      <button type="button" onClick={onMenu} aria-label="Buka/tutup menu navigasi" className="grid size-10 place-items-center rounded-full text-ink transition hover:bg-cream lg:hidden">
        <Menu className="size-5" />
      </button>
      <OutletSwitcher user={user} />
      <div className="ml-auto flex items-center gap-1">
        <RealtimeIndicator />
        <SoundToggle />
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
