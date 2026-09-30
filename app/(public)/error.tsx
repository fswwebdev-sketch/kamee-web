"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui/button";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page grid min-h-[60svh] place-items-center pt-24 pb-16 text-center">
      <div role="alert" className="flex max-w-md flex-col items-center gap-3">
        <p className="text-5xl" aria-hidden="true">☕💦</p>
        <h1 className="text-h2">Ups, ada yang tumpah</h1>
        <p className="text-muted">Terjadi kesalahan saat memuat halaman. Silakan coba lagi.</p>
        <div className="mt-2 flex gap-3">
          <Button onClick={reset}>Coba lagi</Button>
          <Link href="/" className={buttonClasses("outline")}>Ke Beranda</Link>
        </div>
      </div>
    </div>
  );
}
