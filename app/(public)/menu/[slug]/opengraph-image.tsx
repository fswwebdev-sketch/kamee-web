import { getProduct } from "@/lib/data";
import { formatRupiah } from "@/lib/format";
import { Brand, CupArt, ogContentType, ogSize, renderOg } from "@/lib/og/template";

export const alt = "Menu Kamee Coffee";
export const size = ogSize;
export const contentType = ogContentType;

/** OG image dinamis per produk: nama, harga, rating. */
export default async function ProductOg({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  return renderOg(
    <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", width: 640 }}>
        <Brand />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 24, color: "#F5E6CA", textTransform: "uppercase", letterSpacing: 4 }}>{p?.category?.name ?? "Menu"}</div>
          <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: 68, lineHeight: 1.05, color: "#FFFFFF" }}>{p?.name ?? "Kamee Coffee"}</div>
          {p?.short_description && <div style={{ fontSize: 28, color: "rgba(255,255,255,.88)" }}>{p.short_description}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {p && <div style={{ display: "flex", padding: "12px 24px", borderRadius: 16, background: "#F5E6CA", color: "#3E2723", fontFamily: "Poppins", fontWeight: 600, fontSize: 36 }}>{formatRupiah(p.base_price)}</div>}
          {p && p.review_count > 0 && <div style={{ display: "flex", color: "#FFFFFF", fontSize: 28 }}>★ {p.rating_avg.toFixed(1)} · {p.review_count} ulasan</div>}
        </div>
      </div>
      <CupArt size={400} />
    </div>,
  );
}
