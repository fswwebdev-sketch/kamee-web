import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Kamee Coffee",
    short_name: "Kamee",
    description: "Pesan kopi Kamee Coffee secara online — pickup, delivery, atau dine-in.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    // Warna splash Android = background_color + ikon 512
    background_color: "#FFFBF5",
    theme_color: "#6F4E37",
    lang: "id",
    dir: "ltr",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      { src: "/screenshots/home-narrow.png", sizes: "1080x2160", type: "image/png", form_factor: "narrow", label: "Beranda Kamee Coffee" },
      { src: "/screenshots/menu-narrow.png", sizes: "1080x2160", type: "image/png", form_factor: "narrow", label: "Menu dan keranjang" },
    ],
    shortcuts: [
      { name: "Menu", short_name: "Menu", url: "/menu?source=shortcut", icons: [{ src: "/icons/shortcut-menu.png", sizes: "96x96", type: "image/png" }] },
      { name: "Lacak Pesanan", short_name: "Lacak", url: "/pesanan?source=shortcut", icons: [{ src: "/icons/shortcut-lacak.png", sizes: "96x96", type: "image/png" }] },
    ],
  };
}
