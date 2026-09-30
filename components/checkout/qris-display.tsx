"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** QR 280 px di kartu putih — tetap putih di dark mode agar terbaca scanner (bagian 6). */
export function QrisDisplay({ value, fileName }: { value: string; fileName: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(value, { width: 560, margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#FFFFFF" } }).then(setSrc);
  }, [value]);

  const save = async () => {
    const url = await QRCode.toDataURL(value, { width: 1024, margin: 4 });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-3xl bg-white p-5 shadow-lift ring-1 ring-black/5">
        <p className="mb-3 text-center text-xs font-bold tracking-[.3em] text-black">QRIS</p>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Kode QRIS pembayaran pesanan" width={280} height={280} className="size-[280px] [image-rendering:pixelated]" />
        ) : (
          <Skeleton className="size-[280px] bg-neutral-100" />
        )}
        <p className="mt-3 text-center text-[11px] text-neutral-600">Kamee Coffee · NMID ID1026XXXXXXXXX</p>
      </div>
      <Button variant="outline" onClick={save}><Download className="size-4" aria-hidden="true" /> Simpan QR</Button>
    </div>
  );
}
