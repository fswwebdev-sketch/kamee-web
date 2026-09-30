"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/lib/admin/api";
import { useOutletsRef } from "@/lib/admin/queries";
import { useAdminUi } from "@/lib/admin/store";
import type { AdminUser, OrderEvent } from "@/lib/admin/types";
import { env } from "@/lib/env";
import { formatRupiah } from "@/lib/format";
import { useRealtime } from "@/features/admin/realtime-store";
import { playNewOrderChime } from "@/features/admin/sound";

const POLL_MS = 20_000;

/**
 * Realtime pesanan untuk dashboard admin.
 * - Laravel Echo + Reverb: channel privat `outlet.{id}` (Super Admin: semua outlet), event
 *   `.order.created` & `.order.status_updated`. Otorisasi channel lewat proxy /api/admin/broadcasting/auth.
 * - Tanpa Reverb (key kosong / koneksi gagal): polling 20 detik.
 * - Mode mock: pesanan baru disimulasikan berkala agar notifikasi & Kanban bisa dicoba.
 */
export function OrderRealtime({ user }: { user: AdminUser }) {
  const qc = useQueryClient();
  const router = useRouter();
  const setStatus = useRealtime((s) => s.setStatus);
  const bump = useRealtime((s) => s.bump);
  const soundEnabled = useAdminUi((s) => s.soundEnabled);
  const sound = useRef(soundEnabled);
  sound.current = soundEnabled;

  const outlets = useOutletsRef(user.role === "super_admin");
  const outletIds = useMemo(
    () => (user.role === "outlet_admin" ? (user.outlet_id ? [user.outlet_id] : []) : (outlets.data ?? []).map((o) => o.id)),
    [user.role, user.outlet_id, outlets.data],
  );
  const channelKey = outletIds.join(",");

  const onEvent = useRef<(type: "created" | "updated", e: OrderEvent) => void>(() => {});
  onEvent.current = (type, e) => {
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    if (type !== "created") return;
    bump();
    if (sound.current) playNewOrderChime();
    toast.info(`Pesanan baru ${e.code}`, {
      description: `${e.customer_name} · ${formatRupiah(e.total)}`,
      action: { label: "Lihat", onClick: () => router.push(`/admin/pesanan/${e.id}`) },
    });
  };

  useEffect(() => {
    if (!channelKey) return;
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (poll) return;
      setStatus("polling");
      poll = setInterval(() => qc.invalidateQueries({ queryKey: ["admin", "orders"] }), POLL_MS);
    };

    // --- Mode mock: simulasi pesanan masuk
    if (env.mocking) {
      setStatus("simulated");
      let timer: ReturnType<typeof setTimeout>;
      const schedule = () => {
        timer = setTimeout(async () => {
          try {
            const res = await adminApi<{ data: OrderEvent }>("__mock/simulate", { method: "POST" });
            if (!cancelled) onEvent.current("created", res.data);
          } catch {
            /* abaikan */
          }
          if (!cancelled) schedule();
        }, 40_000 + Math.random() * 30_000);
      };
      schedule();
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    // --- Tanpa konfigurasi Reverb: polling
    if (!env.reverb.key) {
      startPolling();
      return () => {
        cancelled = true;
        if (poll) clearInterval(poll);
      };
    }

    // --- Laravel Echo + Reverb
    setStatus("connecting");
    let echo: import("laravel-echo").default<"reverb"> | null = null;
    const ids = channelKey.split(",");
    (async () => {
      const [{ default: Echo }, { default: Pusher }] = await Promise.all([import("laravel-echo"), import("pusher-js")]);
      if (cancelled) return;
      (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;
      echo = new Echo({
        broadcaster: "reverb",
        key: env.reverb.key,
        wsHost: env.reverb.host,
        wsPort: env.reverb.port,
        wssPort: env.reverb.port,
        forceTLS: env.reverb.scheme === "https",
        enabledTransports: ["ws", "wss"],
        authorizer: (channel: { name: string }) => ({
          authorize: (socketId: string, callback: (error: Error | null, data: { auth: string } | null) => void) => {
            adminApi<{ auth: string }>("broadcasting/auth", { method: "POST", body: { socket_id: socketId, channel_name: channel.name } })
              .then((data) => callback(null, data))
              .catch((error: Error) => callback(error, null));
          },
        }),
      });
      const pusher = (echo.connector as unknown as { pusher: { connection: { bind: (ev: string, cb: (s: { current: string }) => void) => void } } }).pusher;
      pusher.connection.bind("state_change", ({ current }) => {
        if (cancelled) return;
        if (current === "connected") {
          if (poll) {
            clearInterval(poll);
            poll = null;
          }
          setStatus("connected");
          qc.invalidateQueries({ queryKey: ["admin", "orders"] });
        } else if (current === "unavailable" || current === "failed" || current === "disconnected") {
          setStatus("offline");
          startPolling();
        } else if (current === "connecting") {
          setStatus("connecting");
        }
      });
      for (const id of ids) {
        echo
          .private(`outlet.${id}`)
          .listen(".order.created", (e: OrderEvent) => onEvent.current("created", e))
          .listen(".order.status_updated", (e: OrderEvent) => onEvent.current("updated", e));
      }
    })().catch(() => !cancelled && startPolling());

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      if (echo) {
        for (const id of ids) echo.leave(`outlet.${id}`);
        echo.disconnect();
      }
      setStatus("idle");
    };
  }, [channelKey, qc, setStatus]);

  return null;
}
