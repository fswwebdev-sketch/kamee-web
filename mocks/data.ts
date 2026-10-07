/**
 * Data mock — mencerminkan seeder kamee-api (menu asli 27 produk, 1 outlet Taman Cibodas, promo, konten).
 * Dipakai MSW agar seluruh UI dapat dijalankan tanpa backend.
 */
import type {
  Banner,
  Blog,
  BlogCategory,
  Category,
  LoyaltyTier,
  OptionGroup,
  Outlet,
  ProductDetail,
  Promotion,
  Review,
} from "@/types/api";

export const categories: Category[] = [
  { id: 1, name: "Based Coffee", slug: "based-coffee", icon: "coffee", sort_order: 1, is_active: true },
  { id: 2, name: "Manual Brew", slug: "manual-brew", icon: "filter", sort_order: 2, is_active: true },
  { id: 3, name: "Non Coffee", slug: "non-coffee", icon: "cup-soda", sort_order: 3, is_active: true },
];

/** Grup opsi sesuai menu Kame: harga Bottle 1 L berbeda per minuman, jadi tiap tingkat harga punya grup sendiri. */
export const optionGroups: Record<string, OptionGroup> = {
  "size-americano": {
    id: 1, name: "Ukuran", type: "single", is_required: true,
    options: [
      { id: 1, name: "Cup", price_delta: 0, sort_order: 0 },
      { id: 2, name: "Bottle 250 ml", price_delta: 0, sort_order: 1 },
      { id: 3, name: "Bottle 1 L", price_delta: 59000, sort_order: 2 },
    ],
  },
  "size-orangecano": {
    id: 2, name: "Ukuran", type: "single", is_required: true,
    options: [
      { id: 4, name: "Cup", price_delta: 0, sort_order: 0 },
      { id: 5, name: "Bottle 250 ml", price_delta: 0, sort_order: 1 },
      { id: 6, name: "Bottle 1 L", price_delta: 67000, sort_order: 2 },
    ],
  },
  "size-manucano": {
    id: 3, name: "Ukuran", type: "single", is_required: true,
    options: [
      { id: 7, name: "Cup", price_delta: 0, sort_order: 0 },
      { id: 8, name: "Bottle 250 ml", price_delta: 0, sort_order: 1 },
      { id: 9, name: "Bottle 1 L", price_delta: 70000, sort_order: 2 },
    ],
  },
  "size-latte": {
    id: 4, name: "Ukuran", type: "single", is_required: true,
    options: [
      { id: 10, name: "Cup", price_delta: 0, sort_order: 0 },
      { id: 11, name: "Bottle 250 ml", price_delta: 0, sort_order: 1 },
      { id: 12, name: "Bottle 1 L", price_delta: 67000, sort_order: 2 },
    ],
  },
  "size-choco-regular": {
    id: 5, name: "Ukuran", type: "single", is_required: true,
    options: [
      { id: 13, name: "Cup", price_delta: 0, sort_order: 0 },
      { id: 14, name: "Bottle 1 L", price_delta: 67000, sort_order: 1 },
    ],
  },
  "size-choco-premium": {
    id: 6, name: "Ukuran", type: "single", is_required: true,
    options: [
      { id: 15, name: "Cup", price_delta: 0, sort_order: 0 },
      { id: 16, name: "Bottle 1 L", price_delta: 95000, sort_order: 1 },
    ],
  },
  "brew-style": {
    id: 7, name: "Penyajian", type: "single", is_required: true,
    options: [
      { id: 17, name: "Hot", price_delta: 0, sort_order: 0 },
      { id: 18, name: "Japanese (iced)", price_delta: 0, sort_order: 1 },
    ],
  },
  "bean-process": {
    id: 8, name: "Proses Biji", type: "single", is_required: true,
    options: [
      { id: 19, name: "Natural", price_delta: 0, sort_order: 0 },
      { id: 20, name: "Washed", price_delta: 0, sort_order: 1 },
      { id: 21, name: "Honey", price_delta: 0, sort_order: 2 },
    ],
  },
  "size-specialty": {
    id: 9, name: "Ukuran", type: "single", is_required: true,
    options: [
      { id: 22, name: "Cup", price_delta: 0, sort_order: 0 },
      { id: 23, name: "Bottle 250 ml", price_delta: 0, sort_order: 1 },
      { id: 24, name: "Bottle 1 L", price_delta: 99000, sort_order: 2 },
    ],
  },
  "size-aren-premium": {
    id: 10, name: "Ukuran", type: "single", is_required: true,
    options: [
      { id: 25, name: "Cup", price_delta: 0, sort_order: 0 },
      { id: 26, name: "Bottle 250 ml", price_delta: 0, sort_order: 1 },
      { id: 27, name: "Bottle 1 L", price_delta: 78000, sort_order: 2 },
    ],
  },
  "size-cup-250": {
    id: 11, name: "Ukuran", type: "single", is_required: true,
    options: [
      { id: 28, name: "Cup", price_delta: 0, sort_order: 0 },
      { id: 29, name: "Bottle 250 ml", price_delta: 0, sort_order: 1 },
    ],
  },
};

type Row = { slug: string; name: string; category: string; price: number; groups: string[]; short: string; best?: boolean; featured?: boolean; weekendOnly?: boolean };

/** Menu asli Kamee Coffee (sumber: daftar menu outlet). 👍 di menu = best seller. */
const catalog: Row[] = [
  { slug: "americano", name: "Americano", category: "based-coffee", price: 16000, groups: ["size-americano"], short: "Espresso dan air — bersih, ringan, tanpa susu." },
  { slug: "kame-orangecano", name: "Kame Orangecano", category: "based-coffee", price: 18000, groups: ["size-orangecano"], short: "Americano dengan sentuhan jeruk yang segar.", featured: true },
  { slug: "kame-manucano", name: "Kame Manucano", category: "based-coffee", price: 20000, groups: ["size-manucano"], short: "Iced Americano with Manuka Honey.", best: true, featured: true },
  { slug: "caramel-latte-kame", name: "Caramel Latte Kame", category: "based-coffee", price: 18000, groups: ["size-latte"], short: "Latte susu dengan karamel." },
  { slug: "aren-kame", name: "Aren Kame Reguler", category: "based-coffee", price: 18000, groups: ["size-latte"], short: "Kopi susu gula aren — with 50% Arabica + 50% Robusta.", best: true, featured: true },
  { slug: "pandan-latte-kame", name: "Pandan Latte Kame", category: "based-coffee", price: 18000, groups: ["size-latte"], short: "Latte dengan aroma pandan.", best: true, featured: true },
  { slug: "spanish-latte-kame", name: "Spanish Latte Kame", category: "based-coffee", price: 18000, groups: ["size-latte"], short: "Latte manis dengan susu kental.", best: true, featured: true },
  { slug: "butterscotch-sea-salt-latte", name: "Butterscotch Sea Salt Latte", category: "based-coffee", price: 26000, groups: [], short: "Latte butterscotch dengan sea salt." },
  { slug: "mont-blanc", name: "Mont Blanc", category: "based-coffee", price: 35000, groups: [], short: "Menu spesial — hanya tersedia hari Sabtu.", best: true, weekendOnly: true },
  { slug: "local-beans", name: "Local Beans", category: "manual-brew", price: 26000, groups: ["brew-style", "bean-process"], short: "Manual brew biji kopi lokal — Hot atau Japanese, proses Natural, Washed, atau Honey." },
  { slug: "cold-brew", name: "Cold Brew", category: "manual-brew", price: 30000, groups: [], short: "Slowly steeped in cold water to create a smooth, mellow cup with subtle sweetness and a clean finish. Hanya hari Sabtu.", weekendOnly: true },
  { slug: "iced-matcha-latte", name: "Iced Matcha Latte", category: "non-coffee", price: 23000, groups: [], short: "Matcha dengan susu dingin.", best: true },
  { slug: "iced-strawberry-matcha-latte", name: "Iced Strawberry Matcha Latte", category: "non-coffee", price: 26000, groups: [], short: "Matcha latte dengan stroberi.", best: true },
  { slug: "iced-matcha-sea-salt-cloud", name: "Iced Matcha Sea Salt Cloud", category: "non-coffee", price: 25000, groups: [], short: "Matcha dengan lapisan sea salt cream." },
  { slug: "regular-chocolate", name: "Reguler Chocolate", category: "non-coffee", price: 18000, groups: ["size-choco-regular"], short: "Cokelat susu klasik. Tersedia juga ukuran 1 L." },
  { slug: "premium-dark-chocolate", name: "Premium Dark Chocolate", category: "non-coffee", price: 25000, groups: ["size-choco-premium"], short: "Dark chocolate yang lebih pekat. Tersedia juga ukuran 1 L.", best: true },
  { slug: "iced-chocolate-sea-salt-cloud", name: "Iced Chocolate Sea Salt Cloud", category: "non-coffee", price: 25000, groups: [], short: "Cokelat dingin dengan lapisan sea salt cream." },
  { slug: "iced-strawberry-choco", name: "Iced Strawberry Choco", category: "non-coffee", price: 23000, groups: [], short: "Cokelat dingin dengan stroberi." },
  { slug: "iced-strawberry-choco-sea-salt-cloud", name: "Iced Strawberry Choco Sea Salt Cloud", category: "non-coffee", price: 26000, groups: [], short: "Strawberry choco dengan lapisan sea salt cream." },
  // Menu baru (Okt 2026) — urutan = ID 20+ di CatalogSeeder.
  { slug: "americano-specialty-blend", name: "Americano Specialty Blend", category: "based-coffee", price: 26000, groups: ["size-specialty"], short: "Blend Arabica Colombia & Arabica Brazil Santos.", best: true },
  { slug: "aren-kame-premium", name: "Aren Kame Premium", category: "based-coffee", price: 22000, groups: ["size-aren-premium"], short: "Kopi susu gula aren — with 100% Arabica Mandhailing.", best: true },
  { slug: "aren-sea-salt-kame", name: "Aren Sea Salt Kame", category: "based-coffee", price: 22000, groups: ["size-cup-250"], short: "Kopi susu gula aren dengan lapisan sea salt cream." },
  { slug: "butterscotch-latte-kame", name: "Butterscotch Latte Kame", category: "based-coffee", price: 18000, groups: ["size-latte"], short: "Latte susu dengan butterscotch." },
  { slug: "iced-matcha-oatmilk", name: "Iced Matcha Oatmilk", category: "non-coffee", price: 25000, groups: [], short: "Matcha dengan oat milk dingin." },
  { slug: "iced-caramel-matcha-latte", name: "Iced Caramel Matcha Latte", category: "non-coffee", price: 25000, groups: [], short: "Matcha latte dengan karamel." },
  { slug: "iced-aren-matcha-latte", name: "Iced Aren Matcha Latte", category: "non-coffee", price: 25000, groups: [], short: "Matcha latte dengan gula aren." },
  { slug: "iced-espresso-matcha-latte", name: "Iced Espresso Matcha Latte", category: "non-coffee", price: 25000, groups: [], short: "Matcha latte dengan shot espresso." },
];

/** Galeri menu dengan foto asli: [file, ukuran] — sama dengan CatalogSeeder::PHOTOS. */
const PHOTOS: Record<string, [string, string | null][]> = {
  americano: [["americano", null], ["americano-foto", "Bottle 1 L"], ["americano-foto-2", "Bottle 1 L"]],
  "mont-blanc": [["mont-blanc-foto", null], ["mont-blanc-foto-2", null], ["mont-blanc-foto-3", null]],
  "aren-kame": [["aren-kame-foto", null], ["aren-kame-foto-2", "Bottle 1 L"], ["aren-kame-foto-3", null]],
  "butterscotch-sea-salt-latte": [["butterscotch-sea-salt-latte-foto", null], ["butterscotch-sea-salt-latte-foto-2", null], ["butterscotch-sea-salt-latte-foto-3", null]],
};

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const products: ProductDetail[] = [];
/** Belum ada ulasan nyata — tidak membuat ulasan contoh untuk menu asli. */
export const reviews: Record<number, Review[]> = {};
export const productGroups: Record<number, OptionGroup[]> = {};

catalog.forEach((row, index) => {
  const pid = index + 1;
  const gallery = PHOTOS[row.slug] ?? [[row.slug, null], [`${row.slug}-2`, null], [`${row.slug}-3`, null]];
  const category = categories.find((c) => c.slug === row.category)!;
  const groups = row.groups.map((key) => optionGroups[key]!);
  const sizes = groups.find((g) => g.name === "Ukuran");
  const sizeNote = sizes ? ` Tersedia ukuran ${sizes.options.map((o) => o.name).join(", ")}.` : "";
  reviews[pid] = [];
  productGroups[pid] = groups;
  products.push({
    id: pid,
    name: row.name,
    slug: row.slug,
    short_description: row.short,
    description: `${row.short}${sizeNote}${row.weekendOnly && !row.short.includes("Sabtu") ? " Hanya tersedia hari Sabtu." : ""}`,
    composition: null,
    calories: null,
    base_price: row.price,
    image_url: `/images/products/${gallery[0]![0]}.avif`,
    rating_avg: 0,
    review_count: 0,
    sold_count: 0,
    is_featured: row.featured ?? false,
    is_best_seller: row.best ?? false,
    is_active: true,
    category,
    images: gallery.map(([file, size], i) => ({
      id: pid * 10 + i + 1,
      url: `/images/products/${file}.avif`,
      alt: size ? `${row.name} ${size}` : `${row.name} foto ${i + 1}`,
      sort_order: i,
    })),
    option_groups: groups,
    rating_summary: { average: 0, count: 0, breakdown: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 } },
  });
});

/** Satu-satunya outlet Kamee Coffee. Koordinat perkiraan (titik Perumahan Taman Cibodas) — sesuaikan di Admin → Outlet. */
export const outlets: Outlet[] = [
  {
    id: 1, name: "Kamee Coffee Taman Cibodas", slug: "kamee-taman-cibodas",
    address: "Jl. Cempaka Raya Blok I6 No. 3, Perumahan Taman Cibodas, Sangiang Jaya, Kec. Periuk, Kota Tangerang, Banten 15132", city: "Tangerang",
    lat: -6.1819389, lng: 106.5971757, phone_wa: "6281280871630",
    open_time: "10:00", close_time: "17:00", open_days: "Senin–Sabtu", is_open: true, is_open_now: true, delivery_radius_km: 5,
  },
];

const start = "2026-07-01T00:00:00+07:00";
const end = "2026-12-31T23:59:59+07:00";
export const promotions: Promotion[] = [
  { id: 1, code: "KAMEEHEMAT", name: "Hemat 20% (maks Rp15.000)", type: "percent", type_label: "Diskon persen", value: 20, min_spend: 40000, max_discount: 15000, per_customer_limit: 3, outlet_id: null, starts_at: start, ends_at: end, is_automatic: false },
  { id: 2, code: "GRATISONGKIR", name: "Gratis ongkir min. belanja Rp50.000", type: "free_delivery", type_label: "Gratis ongkir", value: 0, min_spend: 50000, max_discount: 15000, per_customer_limit: 5, outlet_id: null, starts_at: start, ends_at: end, is_automatic: false },
  { id: 3, code: "BELI1GRATIS1", name: "Beli 1 Gratis 1 (minuman yang sama)", type: "bogo", type_label: "Beli 1 gratis 1", value: 0, min_spend: 0, max_discount: 35000, per_customer_limit: 1, outlet_id: null, starts_at: start, ends_at: end, is_automatic: false },
  { id: 4, code: "NGOPI10K", name: "Potongan Rp10.000 min. belanja Rp75.000", type: "fixed", type_label: "Potongan harga", value: 10000, min_spend: 75000, max_discount: null, per_customer_limit: 2, outlet_id: null, starts_at: start, ends_at: end, is_automatic: false },
];

export const banners: Banner[] = [
  { id: 1, title: "Ngopi Hemat 20%", subtitle: "Pakai kode KAMEEHEMAT untuk semua menu", image_desktop_url: "/images/banners/banner-1.avif", image_mobile_url: "/images/banners/banner-1.avif", link_url: "/promo", placement: "home", sort_order: 0 },
  { id: 2, title: "Kame Manucano", subtitle: "Iced Americano dengan Manuka Honey — favorit pelanggan", image_desktop_url: "/images/banners/banner-2.avif", image_mobile_url: "/images/banners/banner-2.avif", link_url: "/menu/kame-manucano", placement: "home", sort_order: 1 },
  { id: 3, title: "Gratis Ongkir sekitar Taman Cibodas", subtitle: "Minimal belanja Rp50.000 dengan kode GRATISONGKIR", image_desktop_url: "/images/banners/banner-3.avif", image_mobile_url: "/images/banners/banner-3.avif", link_url: "/promo", placement: "home", sort_order: 2 },
];

export const tiers: LoyaltyTier[] = [
  { id: 1, name: "Bronze", min_spend: 0, point_multiplier: 1, perks: ["1 poin setiap belanja Rp10.000"] },
  { id: 2, name: "Silver", min_spend: 1_000_000, point_multiplier: 1.25, perks: ["Poin 1,25x", "Voucher ulang tahun Rp15.000"] },
  { id: 3, name: "Gold", min_spend: 5_000_000, point_multiplier: 1.5, perks: ["Poin 1,5x", "Gratis upsize setiap Jumat", "Voucher ulang tahun Rp30.000"] },
];

export const blogCategories: BlogCategory[] = [
  { id: 1, name: "Tips Kopi", slug: "tips-kopi" },
  { id: 2, name: "Cerita Kamee", slug: "cerita-kamee" },
  { id: 3, name: "Promo & Event", slug: "promo-event" },
];

const article = (paragraphs: string[], heading?: string, list?: string[]) =>
  paragraphs.map((p) => `<p>${p}</p>`).join("") +
  (heading ? `<h2>${heading}</h2>` : "") +
  (list ? `<ul>${list.map((l) => `<li>${l}</li>`).join("")}</ul>` : "");

const blogRows: [string, number, string, string][] = [
  ["Cara Membuat Kopi Susu Aren di Rumah", 1, "Resep sederhana kopi susu aren yang creamy tanpa mesin espresso.", article(
    ["Kopi susu aren adalah salah satu menu favorit di Kamee (Aren Kame). Kabar baiknya, kamu bisa membuat versi rumahan yang tetap nikmat hanya dengan alat sederhana.",
     "Kuncinya ada pada kopi yang pekat, susu yang dingin, dan gula aren cair yang dimasak sampai kental."],
    "Bahan yang dibutuhkan",
    ["30 ml kopi pekat (moka pot atau french press)", "150 ml susu segar dingin", "20 ml gula aren cair", "Es batu secukupnya"])],
  ["Mengenal Perbedaan Arabika dan Robusta", 1, "Dua jenis kopi paling populer punya karakter rasa yang sangat berbeda.", article(
    ["Arabika dikenal dengan rasa yang lebih kompleks, asam buah yang cerah, dan aroma floral. Tanaman ini tumbuh di dataran tinggi sehingga pematangannya lebih lambat.",
     "Robusta memiliki body tebal, rasa pahit cokelat, dan kafein hampir dua kali lipat."])],
  ["5 Tips Menyimpan Biji Kopi agar Tetap Segar", 1, "Biji kopi yang disimpan dengan benar tetap harum hingga berminggu-minggu.", article(
    ["Kesegaran biji kopi turun cepat saat terkena udara, cahaya, panas, dan kelembapan. Berikut cara sederhana menjaganya."],
    "Tips penyimpanan",
    ["Simpan dalam wadah kedap udara dengan katup satu arah", "Jauhkan dari sinar matahari langsung", "Jangan simpan di kulkas", "Giling sesaat sebelum menyeduh", "Beli secukupnya untuk 2–3 minggu"])],
  ["Natural, Washed, atau Honey? Mengenal Proses Biji Kopi", 1, "Tiga proses pascapanen yang bisa kamu pilih untuk manual brew Local Beans.", article(
    ["Proses pascapanen sangat memengaruhi rasa kopi. Pada proses natural, buah kopi dijemur utuh sehingga rasanya cenderung manis dan fruity.",
     "Proses washed membuang daging buah sebelum dikeringkan — hasilnya bersih dan cerah. Proses honey berada di tengah: sebagian lendir buah dibiarkan menempel, memberi rasa manis dengan body yang lebih tebal."],
    "Coba di Kamee",
    ["Pesan Local Beans", "Pilih penyajian Hot atau Japanese (iced)", "Pilih proses Natural, Washed, atau Honey"])],
  ["Kame Manucano: Americano Dingin dengan Madu Manuka", 2, "Salah satu menu andalan kami — segar, ringan, dengan manis madu manuka.", article(
    ["Kame Manucano adalah iced americano yang dipadukan dengan madu manuka. Cocok untuk kamu yang ingin kopi hitam yang tetap segar dengan sentuhan manis alami.",
     "Tersedia dalam cup, Bottle 250 ml, dan Bottle 1 L untuk dinikmati bersama."])],
  ["Menu Akhir Pekan: Mont Blanc dan Cold Brew", 3, "Dua menu spesial yang hanya tersedia setiap Sabtu dan Minggu.", article(
    ["Setiap akhir pekan, Kamee Coffee menyajikan dua menu spesial: Mont Blanc dan Cold Brew.",
     "Cold Brew diseduh perlahan dengan air dingin sehingga menghasilkan rasa yang lembut, manis samar, dan bersih di akhir. Datang ke Jl. Cempaka Raya Blok I6 No. 3, Taman Cibodas, pukul 10.00–17.00."])],
];

export const blogs: Blog[] = blogRows.map(([title, cat, excerpt, content], i) => ({
  id: i + 1,
  title,
  slug: slugify(title),
  excerpt,
  cover_url: `/images/blog/blog-${i + 1}.avif`,
  category: blogCategories.find((c) => c.id === cat)!,
  author: "Tim Kamee",
  status: "published",
  published_at: new Date(Date.UTC(2026, 8, 28) - (40 - i * 6) * 86400000).toISOString(),
  views: 120 + i * 37,
  content,
  meta_title: title,
  meta_description: excerpt,
}));
