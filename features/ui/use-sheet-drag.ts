"use client";

import { useEffect, useRef, type RefObject } from "react";

const CLOSE_DISTANCE = 110; // px
const CLOSE_VELOCITY = 0.55; // px/ms (flick)

/**
 * Gesture "swipe-to-close" untuk bottom sheet, tanpa fitur drag Framer Motion (bundle tetap kecil).
 * - Seret dari pegangan/kepala sheet ke bawah, atau
 * - seret konten ke bawah saat konten sudah di posisi paling atas (seperti sheet iOS).
 * Lepas melewati 110 px atau dengan sentakan cepat → tutup; selain itu kembali ke posisi semula.
 * Hanya aktif di layar < md (di desktop dialog berupa modal).
 */
export function useSheetDrag({
  sheetRef,
  handleRef,
  scrollRef,
  backdropRef,
  onClose,
  enabled,
}: {
  sheetRef: RefObject<HTMLElement | null>;
  handleRef: RefObject<HTMLElement | null>;
  scrollRef: RefObject<HTMLElement | null>;
  backdropRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  enabled: boolean;
}) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const sheet = sheetRef.current;
    const handle = handleRef.current;
    const scroller = scrollRef.current;
    if (!enabled || !sheet || !handle) return;
    if (!window.matchMedia("(max-width: 767.98px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let startY = 0;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;
    let dragging = false;
    let pointerId: number | null = null;
    let fromContent = false;

    const setY = (y: number, animate: boolean) => {
      sheet.style.transition = animate && !reduce ? "transform 220ms cubic-bezier(.22,1,.36,1)" : "none";
      sheet.style.transform = y ? `translate3d(0, ${y}px, 0)` : "";
      const bd = backdropRef?.current;
      if (bd) {
        bd.style.transition = sheet.style.transition.replace("transform", "opacity");
        bd.style.opacity = y ? String(Math.max(0.15, 1 - y / (sheet.offsetHeight || 600))) : "";
      }
    };

    const begin = (y: number, id: number | null, content: boolean) => {
      startY = lastY = y;
      lastT = performance.now();
      velocity = 0;
      dragging = !content; // dari konten: mulai drag hanya setelah gerak ke bawah di scrollTop 0
      fromContent = content;
      pointerId = id;
    };

    const move = (y: number, e: Event) => {
      const dy = y - startY;
      if (!dragging) {
        if (fromContent && dy > 6 && (scroller?.scrollTop ?? 0) <= 0) {
          dragging = true;
          startY = y; // hindari lompatan
        } else return;
      }
      const now = performance.now();
      velocity = (y - lastY) / Math.max(1, now - lastT);
      lastY = y;
      lastT = now;
      const offset = Math.max(0, y - startY);
      // sedikit hambatan agar terasa "berat" seperti sheet native
      setY(offset < 0 ? 0 : offset * 0.92, false);
      if (e.cancelable) e.preventDefault();
    };

    const end = () => {
      if (!dragging) {
        pointerId = null;
        return;
      }
      dragging = false;
      pointerId = null;
      const offset = Math.max(0, lastY - startY);
      if (offset > CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) {
        setY(sheet.offsetHeight, true);
        window.setTimeout(() => close.current(), reduce ? 0 : 160);
      } else {
        setY(0, true);
      }
    };

    // Pegangan: Pointer Events (mouse, pen, sentuh)
    const onHandleDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
      begin(e.clientY, e.pointerId, false);
      handle.setPointerCapture?.(e.pointerId);
    };
    const onHandleMove = (e: PointerEvent) => pointerId === e.pointerId && move(e.clientY, e);
    const onHandleUp = (e: PointerEvent) => pointerId === e.pointerId && end();

    // Konten: Touch Events (perlu preventDefault non-passive agar tidak bentrok dengan scroll)
    const onTouchStart = (e: TouchEvent) => e.touches.length === 1 && begin(e.touches[0]!.clientY, null, true);
    const onTouchMove = (e: TouchEvent) => e.touches.length === 1 && move(e.touches[0]!.clientY, e);
    const onTouchEnd = () => end();

    handle.style.touchAction = "none";
    handle.addEventListener("pointerdown", onHandleDown);
    handle.addEventListener("pointermove", onHandleMove);
    handle.addEventListener("pointerup", onHandleUp);
    handle.addEventListener("pointercancel", onHandleUp);
    scroller?.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller?.addEventListener("touchmove", onTouchMove, { passive: false });
    scroller?.addEventListener("touchend", onTouchEnd);
    scroller?.addEventListener("touchcancel", onTouchEnd);
    return () => {
      handle.removeEventListener("pointerdown", onHandleDown);
      handle.removeEventListener("pointermove", onHandleMove);
      handle.removeEventListener("pointerup", onHandleUp);
      handle.removeEventListener("pointercancel", onHandleUp);
      scroller?.removeEventListener("touchstart", onTouchStart);
      scroller?.removeEventListener("touchmove", onTouchMove);
      scroller?.removeEventListener("touchend", onTouchEnd);
      scroller?.removeEventListener("touchcancel", onTouchEnd);
      sheet.style.transform = "";
      sheet.style.transition = "";
    };
  }, [enabled, sheetRef, handleRef, scrollRef, backdropRef]);
}
