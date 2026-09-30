"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useVariantSheet } from "./variant-sheet-store";

const VariantSheetContent = dynamic(() => import("./variant-sheet"), { ssr: false });

/** Placeholder ringan: kode sheet baru diunduh saat pengguna pertama kali menekan "+". */
export function VariantSheet() {
  const product = useVariantSheet((s) => s.product);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (product) setLoaded(true);
  }, [product]);
  // Unduh kode sheet saat browser senggang agar ketukan pertama tetap instan.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2500));
    idle(() => void import("./variant-sheet"));
  }, []);
  return loaded ? <VariantSheetContent /> : null;
}
