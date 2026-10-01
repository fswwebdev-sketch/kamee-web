"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

/** QR 280 px di kartu putih — tetap putih di dark mode agar terbaca scanner (bagian 6). */
export function QrisDisplay({ value, fileName }: { value: string; fileName: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(value, { width: 560, margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#FFFFFF" } }).then(setSrc);
  }, [value]);

  const [saving, setSaving] = useState(false);

  /**
   * Simpan QR: di ponsel memakai Web Share API (lembar "Simpan Gambar" ke galeri di iOS/Android,
   * karena atribut download tidak menyimpan ke Foto di iOS). Fallback: unduh PNG.
   */
  const save = async () => {
    setSaving(true);
    try {
      const url = await QRCode.toDataURL(value, { width: 1024, margin: 4 });
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      const touch = window.matchMedia("(pointer: coarse)").matches;
      if (touch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "QRIS Kamee Coffee" });
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") return; // pengguna menutup lembar bagikan
        }
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.png`;
      a.click();
      toast.success("QR tersimpan", { description: "Buka aplikasi e-wallet → Scan → pilih gambar dari galeri." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-3xl bg-white p-5 shadow-lift ring-1 ring-black/5">
        <p className="mb-3 text-center text-xs font-bold tracking-[.3em] text-black">QRIS</p>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Kode QRIS pembayaran pesanan" width={280} height={280} className="size-[min(280px,72vw)] [image-rendering:pixelated]" />
        ) : (
          <Skeleton className="size-[min(280px,72vw)] bg-neutral-100" />
        )}
        <p className="mt-3 text-center text-[11px] text-neutral-600">Kamee Coffee · NMID ID1026XXXXXXXXX</p>
      </div>
      <Button variant="outline" size="lg" onClick={save} loading={saving}>{!saving && <Download className="size-4" aria-hidden="true" />} Simpan QR</Button>
    </div>
  );
}
