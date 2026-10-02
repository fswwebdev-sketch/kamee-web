"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/**
 * QRIS statis toko (GoPay Merchant). Gambar ditampilkan di kartu putih agar tetap terbaca scanner
 * di dark mode. "Simpan QR" memakai Web Share API di ponsel (simpan ke galeri), fallback unduh.
 */
export function StaticQris({ src, merchant, nmid, fileName }: { src: string; merchant: string; nmid: string; fileName: string }) {
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const blob = await (await fetch(src)).blob();
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const file = new File([blob], `${fileName}.${ext}`, { type: blob.type || "image/jpeg" });
      const touch = window.matchMedia("(pointer: coarse)").matches;
      if (touch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `QRIS ${merchant}` });
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("QR tersimpan", { description: "Buka aplikasi pembayaran → Scan → pilih gambar dari galeri." });
    } catch {
      toast.error("Gagal menyimpan QR. Tekan lama gambar QR lalu pilih Simpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-3xl bg-white p-3 shadow-lift ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`QRIS ${merchant} (NMID ${nmid}) untuk pembayaran`}
          width={903}
          height={1280}
          className="h-auto w-[min(300px,78vw)] rounded-2xl"
          data-testid="static-qris"
        />
      </div>
      <p className="text-caption text-muted">
        a.n. <b className="text-ink">{merchant}</b> · NMID {nmid}
      </p>
      <Button variant="outline" size="lg" onClick={save} loading={saving}>
        {!saving && <Download className="size-4" aria-hidden="true" />} Simpan QR
      </Button>
    </div>
  );
}
