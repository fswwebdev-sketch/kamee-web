"use client";

import { useEffect } from "react";

const TEXT_TYPES = new Set(["text", "search", "email", "tel", "url", "number", "password", "date", "datetime-local", "time", "month", "week", ""]);

function isTextField(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) return TEXT_TYPES.has(el.type) && !el.readOnly;
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * Menandai `<html data-keyboard="open">` saat keyboard virtual kemungkinan besar terbuka, agar
 * bottom nav, sticky cart bar, dan tombol bayar sticky (`.hide-on-keyboard`) tidak menutupi input.
 *
 * Sinyal: (a) visualViewport menyusut > 25% dari tinggi layout (iOS Safari & Chrome Android
 * mode resizes-visual), atau (b) input teks sedang fokus pada perangkat sentuh (fallback untuk
 * browser yang ikut mengecilkan layout viewport).
 */
export function KeyboardWatcher() {
  useEffect(() => {
    const root = document.documentElement;
    const coarse = window.matchMedia("(pointer: coarse)");
    const vv = window.visualViewport;
    let raf = 0;

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const shrunk = vv ? vv.height < window.innerHeight * 0.75 : false;
        const focused = coarse.matches && isTextField(document.activeElement);
        const open = shrunk || focused;
        if (open) root.dataset.keyboard = "open";
        else delete root.dataset.keyboard;
      });
    };

    vv?.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    // focusout terjadi sebelum fokus pindah ke elemen berikutnya → tunda sedikit
    const onFocusOut = () => setTimeout(update, 60);
    document.addEventListener("focusout", onFocusOut);
    update();
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", onFocusOut);
      delete root.dataset.keyboard;
    };
  }, []);
  return null;
}
