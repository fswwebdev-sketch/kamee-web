import type { NextConfig } from "next";

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Metadata (title/description/OG) selalu di <head> — tidak di-stream — agar semua crawler & alat audit membacanya.
  htmlLimitedBots: /.*/,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1600, 1920],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      // Gambar dari storage Laravel (produk, banner, blog) & placeholder seeder
      { protocol: apiUrl.protocol.replace(":", "") as "http" | "https", hostname: apiUrl.hostname, port: apiUrl.port || undefined, pathname: "/storage/**" },
      { protocol: "https", hostname: "placehold.co" },
      // Foto unggahan admin di Supabase Storage (kamee-api di Vercel, disk "supabase")
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
      { source: "/:all*(avif|webp|png|jpg|svg|woff2)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Service worker harus selalu dicek ulang agar pembaruan cepat sampai ke pengguna
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      { source: "/offline.html", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
