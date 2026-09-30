/** Konfigurasi publik (NEXT_PUBLIC_*) dengan nilai default yang aman. */
export const env = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, ""),
  mocking: process.env.NEXT_PUBLIC_API_MOCKING === "enabled",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6281211110001",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM ?? "https://instagram.com/kameecoffee",
  tiktok: process.env.NEXT_PUBLIC_TIKTOK ?? "https://tiktok.com/@kameecoffee",
  email: process.env.NEXT_PUBLIC_EMAIL ?? "halo@kamee.id",
  mapTileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  /** Laravel Reverb (realtime dashboard admin). Kosongkan key → fallback polling. */
  reverb: {
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? "",
    host: process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost",
    port: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    scheme: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http") as "http" | "https",
  },
} as const;
