import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { env } from "@/lib/env";
import { buildMetadata, site } from "@/lib/seo";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["600", "700"], display: "swap", variable: "--font-poppins" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-inter" });

// [lebar, tinggi, device-width, device-height, rasio] — sama dengan scripts/generate-pwa-assets.py
const SPLASH: [number, number, number, number, number][] = [
  [1290, 2796, 430, 932, 3],
  [1179, 2556, 393, 852, 3],
  [1284, 2778, 428, 926, 3],
  [1170, 2532, 390, 844, 3],
  [1125, 2436, 375, 812, 3],
  [1242, 2688, 414, 896, 3],
  [828, 1792, 414, 896, 2],
  [1242, 2208, 414, 736, 3],
  [750, 1334, 375, 667, 2],
];

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  applicationName: site.name,
  ...buildMetadata({}),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s | ${site.name}` },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
  // iOS: mode layar penuh saat dibuka dari layar utama + splash screen per ukuran iPhone
  appleWebApp: {
    capable: true,
    title: "Kamee",
    statusBarStyle: "default",
    startupImage: SPLASH.map(([w, h, dw, dh, r]) => ({
      url: `/splash/splash-${w}x${h}.png`,
      media: `(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
  // Next 15 hanya menulis "mobile-web-app-capable"; iOS lama butuh tag Apple untuk mode standalone + splash
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1020" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${poppins.variable} ${inter.variable}`}>
      <body>
        <a href="#konten" className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Lewati ke konten utama
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
