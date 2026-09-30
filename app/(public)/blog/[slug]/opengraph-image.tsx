import { getBlog } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Brand, ogContentType, ogSize, renderOg } from "@/lib/og/template";

export const alt = "Blog Kamee Coffee";
export const size = ogSize;
export const contentType = ogContentType;

export default async function BlogOg({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await getBlog(slug);
  const b = res?.data;
  return renderOg(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 900 }}>
      <Brand />
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", fontSize: 24, color: "#F5E6CA", letterSpacing: 3, textTransform: "uppercase" }}>Blog · {b?.category?.name ?? "Artikel"}</div>
        <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: 60, lineHeight: 1.12, color: "#FFFFFF" }}>{b?.title ?? "Blog Kamee Coffee"}</div>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,.85)" }}>{b?.published_at ? formatDate(b.published_at) : ""}</div>
    </div>,
    "hero/latte-og.jpg",
  );
}
