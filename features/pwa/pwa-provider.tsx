"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { env } from "@/lib/env";
import { usePwa, type BeforeInstallPromptEvent } from "./store";

// Toast dimuat saat dibutuhkan saja — jangan tarik modul toast + Framer Motion ke bundle awal
const notify = (kind: "success" | "info", title: string, opts: Parameters<typeof import("@/components/ui/toast").toast.info>[1]) =>
  import("@/components/ui/toast").then(({ toast }) => toast[kind](title, opts));

const IosInstallSheet = dynamic(() => import("./ios-install-sheet"), { ssr: false });

/**
 * - Mendaftarkan service worker (/sw.js) di produksi. Dalam mode mock MSW dinonaktifkan karena
 *   satu origin hanya boleh punya satu service worker di scope "/" (mockServiceWorker.js).
 * - Menyimpan event beforeinstallprompt untuk tombol "Tambahkan ke layar utama".
 * - Memberi tahu bila versi baru tersedia.
 */
export function PwaProvider() {
  const set = usePwa((s) => s.set);
  const iosSheetOpen = usePwa((s) => s.iosSheetOpen);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    set({ ios, standalone, iosSafari: ios && !standalone && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) });
    if (standalone) document.documentElement.dataset.standalone = "true";

    const onPrompt = (e: Event) => {
      e.preventDefault(); // tampilkan lewat tombol kita sendiri
      set({ promptEvent: e as BeforeInstallPromptEvent });
    };
    const onInstalled = () => {
      set({ promptEvent: null, standalone: true });
      notify("success", "Kamee terpasang di layar utama", { description: "Buka dari ikon Kamee untuk pengalaman seperti aplikasi." });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [set]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || env.mocking || process.env.NODE_ENV !== "production") return;
    let reloading = false;
    // Hanya muat ulang saat SW LAMA digantikan versi baru (setelah pengguna menekan "Muat ulang").
    // Pada kunjungan pertama, clients.claim() juga memicu controllerchange — jangan reload di situ.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let updateAccepted = false;
    const onController = () => {
      if (reloading || !hadController || !updateAccepted) return;
      reloading = true;
      window.location.reload();
    };
    const offerUpdate = (reg: ServiceWorkerRegistration) => {
      if (!reg.waiting || !navigator.serviceWorker.controller) return;
      notify("info", "Versi baru Kamee tersedia", {
        description: "Muat ulang untuk memakai pembaruan.",
        action: {
          label: "Muat ulang",
          onClick: () => {
            updateAccepted = true;
            reg.waiting?.postMessage("SKIP_WAITING");
          },
        },
      });
    };

    const register = () => {
      navigator.serviceWorker
        .register(`/sw.js?api=${encodeURIComponent(env.apiUrl)}`, { scope: "/" })
        .then((reg) => {
          offerUpdate(reg);
          reg.addEventListener("updatefound", () => {
            reg.installing?.addEventListener("statechange", () => offerUpdate(reg));
          });
        })
        .catch(() => undefined);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);
    // Daftarkan saat browser senggang setelah load, agar tidak bersaing dengan LCP & hidrasi
    const idle = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(register, { timeout: 8000 });
      else setTimeout(register, 3000);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onController);
  }, []);

  return iosSheetOpen ? <IosInstallSheet /> : null;
}
