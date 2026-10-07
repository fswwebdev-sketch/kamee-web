"use client";

import { useEffect } from "react";

/**
 * Penangkap error tingkat akar (termasuk saat layout gagal dimuat).
 * Penyebab paling umum setelah situs diperbarui: halaman lama (dari cache) meminta file JS versi
 * sebelumnya yang sudah tidak ada → muat ulang sekali agar mendapat versi terbaru.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    try {
      const last = Number(sessionStorage.getItem("kamee-reload-at") ?? 0);
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem("kamee-reload-at", String(Date.now()));
        window.location.reload();
      }
    } catch {
      /* sessionStorage tidak tersedia */
    }
  }, [error]);

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F4F6FB", color: "#0B1B3F" }}>
        <div style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 360 }}>
            <p style={{ fontSize: 40, margin: 0 }} aria-hidden="true">☕</p>
            <h1 style={{ fontSize: 22, margin: "12px 0 8px" }}>Situs baru saja diperbarui</h1>
            <p style={{ margin: "0 0 20px", color: "#4A5B7A" }}>Muat ulang halaman untuk melihat versi terbaru Kamee Coffee.</p>
            <details style={{ margin: "0 0 20px", fontSize: 12, color: "#6B7A99", textAlign: "left" }}>
              <summary>Info teknis (kirim ke admin bila error berulang)</summary>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {`${error?.name ?? "Error"}: ${error?.message ?? "-"}${error?.digest ? `\ndigest: ${error.digest}` : ""}\n${(error?.stack ?? "").split("\n").slice(0, 6).join("\n")}\n${typeof navigator !== "undefined" ? navigator.userAgent : ""}`}
              </pre>
            </details>
            <button
              type="button"
              onClick={() => (typeof window !== "undefined" ? window.location.reload() : reset())}
              style={{ background: "#04338B", color: "#fff", border: 0, borderRadius: 12, padding: "12px 20px", fontSize: 16, fontWeight: 600 }}
            >
              Muat ulang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
