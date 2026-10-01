"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { useCartSummary } from "@/features/cart/hooks";
import { formatRupiah } from "@/lib/format";

const HIDDEN = [/^\/keranjang/, /^\/checkout/, /^\/pesanan\/[^/]+\/bayar/, /^\/masuk/];

/** Bar keranjang mengambang di atas bottom nav (mobile, bagian 6). */
export function StickyCartBar() {
  const pathname = usePathname();
  const { count, subtotal } = useCartSummary();
  const visible = count > 0 && !HIDDEN.some((r) => r.test(pathname));
  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="hide-on-keyboard fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 md:hidden"
        >
          <Link href="/keranjang" className="flex min-h-14 items-center justify-between rounded-2xl bg-ink px-4 py-2.5 text-cream shadow-lift transition active:scale-[.98] motion-reduce:active:scale-100">
            <span className="text-sm">
              {count} item · <b className="font-heading">{formatRupiah(subtotal)}</b>
            </span>
            <span className="inline-flex min-h-10 items-center rounded-xl bg-cream px-3.5 text-sm font-semibold text-ink">Lihat Keranjang</span>
          </Link>
        </m.div>
      )}
    </AnimatePresence>
  );
}
