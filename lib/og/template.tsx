import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

async function fonts() {
  const dir = join(process.cwd(), "public/fonts");
  const [bold, semi, body] = await Promise.all([
    readFile(join(dir, "poppins-700.woff")),
    readFile(join(dir, "poppins-600.woff")),
    readFile(join(dir, "inter-500.woff")),
  ]);
  return [
    { name: "Poppins", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Poppins", data: semi, weight: 600 as const, style: "normal" as const },
    { name: "Inter", data: body, weight: 500 as const, style: "normal" as const },
  ];
}

/** Ilustrasi cangkir latte (SVG) untuk OG image. */
export function CupArt({ size = 360, drink = "#2A5BB8" }: { size?: number; drink?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="96" fill="#FFFFFF" />
      <circle cx="100" cy="100" r="84" fill="#F4EEE6" />
      <rect x="168" y="90" width="30" height="20" rx="10" fill="#FAFAF8" />
      <circle cx="100" cy="100" r="66" fill="#FFFFFF" />
      <circle cx="100" cy="100" r="56" fill={drink} />
      <ellipse cx="100" cy="112" rx="34" ry="26" fill="#FAF0DE" />
      <ellipse cx="100" cy="104" rx="26" ry="20" fill={drink} />
      <ellipse cx="100" cy="96" rx="19" ry="14" fill="#FAF0DE" />
      <ellipse cx="100" cy="88" rx="11" ry="8" fill={drink} />
      <rect x="98" y="62" width="4" height="80" rx="2" fill={drink} />
    </svg>
  );
}

export async function renderOg(children: ReactNode, background?: string) {
  let bg: string | undefined;
  if (background) {
    const file = await readFile(join(process.cwd(), "public", background));
    bg = `data:image/jpeg;base64,${file.toString("base64")}`;
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0B1B3F", fontFamily: "Inter" }}>
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={bg} width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover" }} />
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(90deg, rgba(4,25,70,.95) 0%, rgba(4,25,70,.75) 55%, rgba(4,25,70,.1) 100%)" }} />
        <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", padding: 64 }}>{children}</div>
      </div>
    ),
    { ...ogSize, fonts: await fonts() },
  );
}

export function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: "#04338B", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 30, height: 30, borderRadius: 999, background: "#E3EAF7", display: "flex" }} />
      </div>
      <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: 30, color: "#FFFFFF", display: "flex" }}>
        Kamee<span style={{ color: "#E3EAF7", marginLeft: 8 }}>Coffee</span>
      </div>
    </div>
  );
}
