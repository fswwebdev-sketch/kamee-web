"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function useScrolled(threshold = 80) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/** Memanggil onVisible saat elemen masuk viewport (infinite scroll). */
export function useInView<T extends Element>(onVisible: () => void, options: { enabled?: boolean; rootMargin?: string } = {}) {
  const ref = useRef<T | null>(null);
  const cb = useRef(onVisible);
  cb.current = onVisible;
  const { enabled = true, rootMargin = "400px" } = options;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && cb.current(), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, rootMargin]);
  return ref;
}

/** Sisa detik menuju waktu target, diperbarui tiap detik. */
export function useCountdown(target: string | number | null | undefined) {
  const targetMs = target == null ? null : typeof target === "number" ? target : new Date(target).getTime();
  const calc = useCallback(() => (targetMs == null ? 0 : Math.max(0, Math.round((targetMs - Date.now()) / 1000))), [targetMs]);
  const [seconds, setSeconds] = useState(calc);
  useEffect(() => {
    setSeconds(calc());
    if (targetMs == null) return;
    const t = setInterval(() => setSeconds(calc()), 1000);
    return () => clearInterval(t);
  }, [calc, targetMs]);
  return seconds;
}

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Fokus terkunci di dalam dialog; Esc menutup; fokus kembali ke pemicu. */
export function useFocusTrap<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>("[data-autofocus]") ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close.current();
      }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);
  return ref;
}

/** true bila media query cocok (false saat SSR / render pertama). */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}
