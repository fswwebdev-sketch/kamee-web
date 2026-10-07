import { Brand, ogContentType, ogSize, renderOg } from "@/lib/og/template";

export const alt = "Kamee Coffee — Nikmati Secangkir Kebahagiaan";
export const size = ogSize;
export const contentType = ogContentType;

export default async function OpengraphImage() {
  return renderOg(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 680 }}>
      <Brand />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 64, lineHeight: 1.1, color: "#FFFFFF" }}>Nikmati Secangkir Kebahagiaan</div>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,.88)" }}>Based coffee, manual brew & non coffee · Taman Cibodas, Tangerang</div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {["Pesan online", "Pickup · Delivery · Dine-in", "Poin loyalitas"].map((t) => (
          <div key={t} style={{ display: "flex", padding: "10px 18px", borderRadius: 999, background: "rgba(255,255,255,.16)", color: "#FFFFFF", fontSize: 22 }}>{t}</div>
        ))}
      </div>
    </div>,
    "hero/latte-og.jpg",
  );
}
