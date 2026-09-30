/**
 * Data mock — mencerminkan seeder kamee-api (kategori, 30 produk, opsi, outlet, promo, konten).
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
  { id: 1, name: "Coffee", slug: "coffee", icon: "coffee", sort_order: 1, is_active: true },
  { id: 2, name: "Non Coffee", slug: "non-coffee", icon: "milk", sort_order: 2, is_active: true },
  { id: 3, name: "Signature Drink", slug: "signature-drink", icon: "sparkles", sort_order: 3, is_active: true },
  { id: 4, name: "Tea Series", slug: "tea-series", icon: "leaf", sort_order: 4, is_active: true },
  { id: 5, name: "Snack", slug: "snack", icon: "cookie", sort_order: 5, is_active: true },
  { id: 6, name: "Dessert", slug: "dessert", icon: "cake-slice", sort_order: 6, is_active: true },
];

export const optionGroups: Record<"size" | "sugar" | "ice" | "topping", OptionGroup> = {
  size: {
    id: 1, name: "Ukuran", type: "single", is_required: true,
    options: [
      { id: 1, name: "Regular", price_delta: 0, sort_order: 0 },
      { id: 2, name: "Large", price_delta: 5000, sort_order: 1 },
    ],
  },
  sugar: {
    id: 2, name: "Gula", type: "single", is_required: true,
    options: [
      { id: 3, name: "Normal", price_delta: 0, sort_order: 0 },
      { id: 4, name: "Less Sugar", price_delta: 0, sort_order: 1 },
      { id: 5, name: "Tanpa Gula", price_delta: 0, sort_order: 2 },
    ],
  },
  ice: {
    id: 3, name: "Es", type: "single", is_required: true,
    options: [
      { id: 6, name: "Normal Ice", price_delta: 0, sort_order: 0 },
      { id: 7, name: "Less Ice", price_delta: 0, sort_order: 1 },
      { id: 8, name: "Tanpa Es", price_delta: 0, sort_order: 2 },
      { id: 9, name: "Panas", price_delta: 0, sort_order: 3 },
    ],
  },
  topping: {
    id: 4, name: "Topping", type: "multi", is_required: false,
    options: [
      { id: 10, name: "Extra Shot", price_delta: 6000, sort_order: 0 },
      { id: 11, name: "Boba", price_delta: 5000, sort_order: 1 },
      { id: 12, name: "Cheese Foam", price_delta: 7000, sort_order: 2 },
      { id: 13, name: "Oat Milk", price_delta: 8000, sort_order: 3 },
      { id: 14, name: "Whipped Cream", price_delta: 4000, sort_order: 4 },
    ],
  },
};

const DRINK = [optionGroups.size, optionGroups.sugar, optionGroups.ice, optionGroups.topping];
const TEA = [optionGroups.size, optionGroups.sugar, optionGroups.ice];

type Row = [name: string, price: number, short: string, composition: string, calories: number, sold: number, featured?: boolean, best?: boolean];

const catalog: [categoryId: number, groups: OptionGroup[], rows: Row[]][] = [
  [1, DRINK, [
    ["Americano", 18000, "Espresso dan air panas, bersih dan bold.", "Espresso double shot, air", 10, 64],
    ["Cafe Latte", 25000, "Espresso lembut dengan susu segar.", "Espresso, susu segar", 190, 88],
    ["Cappuccino", 25000, "Seimbang antara espresso, susu, dan foam tebal.", "Espresso, susu segar, milk foam", 130, 71],
    ["Es Kopi Susu Kamee", 22000, "Kopi susu andalan dengan gula aren khas Kamee.", "Espresso, susu segar, gula aren", 210, 312, true, true],
    ["Kopi Susu Aren", 24000, "Manis legit gula aren Banten.", "Espresso, susu, gula aren", 230, 205, false, true],
    ["Caramel Macchiato", 30000, "Vanilla, susu, espresso, dan saus karamel.", "Espresso, susu, sirup vanilla, karamel", 250, 97],
    ["Vietnamese Drip", 22000, "Robusta pekat dengan susu kental manis.", "Robusta, susu kental manis", 180, 58],
  ]],
  [2, DRINK, [
    ["Chocolate", 25000, "Cokelat premium yang creamy.", "Cokelat bubuk, susu segar", 280, 143, false, true],
    ["Matcha Latte", 28000, "Matcha Jepang dengan susu segar.", "Matcha, susu segar", 200, 121, true],
    ["Red Velvet Latte", 27000, "Red velvet lembut dengan aroma vanilla.", "Red velvet powder, susu", 240, 66],
    ["Taro Latte", 26000, "Talas ungu manis dan wangi.", "Taro powder, susu", 230, 59],
    ["Strawberry Milk", 25000, "Susu segar dengan selai stroberi.", "Susu segar, selai stroberi", 210, 48],
  ]],
  [3, DRINK, [
    ["Kamee Butterscotch", 32000, "Latte butterscotch dengan sea salt cream.", "Espresso, susu, butterscotch, sea salt cream", 290, 176, true, true],
    ["Pandan Latte", 30000, "Aroma pandan asli dan espresso.", "Espresso, susu, pandan", 220, 83, true],
    ["Klepon Latte", 30000, "Terinspirasi kue klepon: pandan, gula merah, kelapa.", "Espresso, susu, pandan, gula merah, kelapa", 260, 91, true],
    ["Salted Caramel Cold Brew", 32000, "Cold brew 18 jam dengan salted caramel foam.", "Cold brew, salted caramel foam", 180, 77],
    ["Kopi Rempah", 28000, "Kopi hangat dengan jahe, kayu manis, dan cengkih.", "Robusta, jahe, kayu manis, cengkih", 120, 42],
  ]],
  [4, TEA, [
    ["Lychee Tea", 22000, "Teh melati dengan buah leci.", "Teh melati, leci", 120, 134, false, true],
    ["Lemon Tea", 18000, "Teh segar dengan perasan lemon.", "Teh hitam, lemon", 90, 69],
    ["Thai Tea", 22000, "Teh Thailand creamy.", "Thai tea, susu", 230, 112],
    ["Peach Oolong", 24000, "Oolong wangi dengan persik.", "Teh oolong, persik", 110, 38],
  ]],
  [5, [], [
    ["Croissant Butter", 22000, "Croissant renyah berlapis mentega.", "Tepung, mentega", 280, 87],
    ["Pisang Goreng Keju", 20000, "Pisang goreng krispi dengan parutan keju.", "Pisang, keju, susu kental manis", 350, 156, false, true],
    ["Kentang Goreng", 20000, "French fries dengan saus sambal dan mayo.", "Kentang, saus", 320, 98],
    ["Roti Bakar Cokelat", 22000, "Roti bakar mentega dengan meses cokelat.", "Roti, mentega, meses", 380, 74],
    ["Cireng Rujak", 18000, "Cireng kenyal dengan bumbu rujak.", "Tepung tapioka, bumbu rujak", 300, 51],
  ]],
  [6, [], [
    ["Tiramisu Cup", 32000, "Tiramisu lembut dengan espresso Kamee.", "Mascarpone, ladyfinger, espresso", 360, 102, true],
    ["Fudgy Brownies", 22000, "Brownies cokelat padat dan lembap.", "Cokelat, mentega, telur", 380, 81],
    ["Cheesecake", 30000, "Baked cheesecake dengan saus berry.", "Cream cheese, biskuit, berry", 340, 64],
    ["Affogato", 28000, "Es krim vanilla disiram espresso.", "Es krim vanilla, espresso", 210, 55],
  ]],
];

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const COMMENTS = [
  "Enak banget, pas manisnya!", "Kopinya mantap, pasti pesan lagi.", "Pengiriman cepat dan masih dingin sampai rumah.",
  "Rasanya konsisten, favorit saya.", "Harga sepadan dengan rasa.", "Tempatnya cozy, cocok buat kerja.",
  "Aromanya wangi, foam-nya lembut.", "Baristanya ramah, minumannya juara.", "Lumayan, next coba less sugar.",
];
const NAMES = ["Dinda P.", "Rizky P.", "Ayu L.", "Bagas S.", "Citra M.", "Dimas H.", "Eka W.", "Fajar N.", "Gita P.", "Hendra W."];

export const products: ProductDetail[] = [];
export const reviews: Record<number, Review[]> = {};
export const productGroups: Record<number, OptionGroup[]> = {};

let id = 1;
let reviewId = 1;
for (const [categoryId, groups, rows] of catalog) {
  const category = categories.find((c) => c.id === categoryId)!;
  for (const [name, price, short, composition, calories, sold, featured = false, best = false] of rows) {
    const slug = slugify(name);
    const pid = id++;
    const count = 3 + ((pid * 7) % 6);
    const list: Review[] = Array.from({ length: count }, (_, i) => {
      const rating = [5, 5, 4, 5, 4, 3, 5, 4][(pid + i) % 8]!;
      const day = 2 + ((pid * 3 + i * 5) % 55);
      return {
        id: reviewId++,
        rating,
        comment: COMMENTS[(pid + i * 2) % COMMENTS.length]!,
        photo_url: null,
        reply: i === 0 && rating >= 5 ? "Terima kasih banyak, sampai jumpa lagi di Kamee! ☕" : null,
        customer_name: NAMES[(pid + i) % NAMES.length]!,
        product: { id: pid, name, slug },
        created_at: new Date(Date.UTC(2026, 8, 30) - day * 86400000).toISOString(),
      };
    });
    reviews[pid] = list;
    const breakdown = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 } as ProductDetail["rating_summary"]["breakdown"];
    list.forEach((r) => (breakdown[String(r.rating) as keyof typeof breakdown] += 1));
    const avg = Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10;
    productGroups[pid] = groups;
    products.push({
      id: pid,
      name,
      slug,
      short_description: short,
      description: `${short} Dibuat fresh setiap pesanan oleh barista Kamee Coffee menggunakan biji kopi pilihan dari petani lokal Jawa Barat. Nikmati dingin maupun hangat sesuai selera.`,
      composition,
      calories,
      base_price: price,
      image_url: `/images/products/${slug}.avif`,
      rating_avg: avg,
      review_count: list.length,
      sold_count: sold,
      is_featured: featured,
      is_best_seller: best,
      is_active: true,
      category,
      images: [1, 2, 3].map((n, i) => ({
        id: pid * 10 + n,
        url: `/images/products/${slug}${n === 1 ? "" : `-${n}`}.avif`,
        alt: `${name} foto ${n}`,
        sort_order: i,
      })),
      option_groups: groups,
      rating_summary: { average: avg, count: list.length, breakdown },
    });
  }
}

export const outlets: Outlet[] = [
  {
    id: 1, name: "Kamee Coffee Cikokol", slug: "kamee-cikokol",
    address: "Jl. MH. Thamrin No. 8, Cikokol, Kec. Tangerang, Kota Tangerang, Banten 15117", city: "Tangerang",
    lat: -6.20881, lng: 106.63652, phone_wa: "6281211110001",
    open_time: "07:00", close_time: "22:00", is_open: true, is_open_now: true, delivery_radius_km: 7,
  },
  {
    id: 2, name: "Kamee Coffee Karawaci", slug: "kamee-karawaci",
    address: "Jl. Imam Bonjol No. 21, Karawaci, Kota Tangerang, Banten 15115", city: "Tangerang",
    lat: -6.19183, lng: 106.61015, phone_wa: "6281211110002",
    open_time: "08:00", close_time: "23:00", is_open: true, is_open_now: true, delivery_radius_km: 6,
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
  { id: 2, title: "Signature Baru: Klepon Latte", subtitle: "Rasa kue tradisional dalam secangkir kopi", image_desktop_url: "/images/banners/banner-2.avif", image_mobile_url: "/images/banners/banner-2.avif", link_url: "/menu/klepon-latte", placement: "home", sort_order: 1 },
  { id: 3, title: "Gratis Ongkir se-Tangerang", subtitle: "Minimal belanja Rp50.000 dengan kode GRATISONGKIR", image_desktop_url: "/images/banners/banner-3.avif", image_mobile_url: "/images/banners/banner-3.avif", link_url: "/promo", placement: "home", sort_order: 2 },
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
  ["Cara Menyeduh Kopi Susu Aren ala Kamee di Rumah", 1, "Resep sederhana kopi susu aren yang creamy tanpa mesin espresso.", article(
    ["Kopi susu aren adalah menu yang paling sering dipesan di Kamee. Kabar baiknya, kamu bisa membuat versi rumahan yang tetap nikmat hanya dengan alat sederhana.",
     "Kuncinya ada pada kopi yang pekat, susu yang dingin, dan gula aren cair yang dimasak sampai kental."],
    "Bahan yang dibutuhkan",
    ["30 ml kopi pekat (moka pot atau french press)", "150 ml susu segar dingin", "20 ml gula aren cair", "Es batu secukupnya"])],
  ["Mengenal Perbedaan Arabika dan Robusta", 1, "Dua jenis kopi paling populer punya karakter rasa yang sangat berbeda.", article(
    ["Arabika dikenal dengan rasa yang lebih kompleks, asam buah yang cerah, dan aroma floral. Tanaman ini tumbuh di dataran tinggi sehingga pematangannya lebih lambat.",
     "Robusta memiliki body tebal, rasa pahit cokelat, dan kafein hampir dua kali lipat. Di Kamee, kami memadukan keduanya untuk kopi susu yang seimbang."])],
  ["5 Tips Menyimpan Biji Kopi agar Tetap Segar", 1, "Biji kopi yang disimpan dengan benar tetap harum hingga berminggu-minggu.", article(
    ["Kesegaran biji kopi turun cepat saat terkena udara, cahaya, panas, dan kelembapan. Berikut cara sederhana menjaganya."],
    "Tips penyimpanan",
    ["Simpan dalam wadah kedap udara dengan katup satu arah", "Jauhkan dari sinar matahari langsung", "Jangan simpan di kulkas", "Giling sesaat sebelum menyeduh", "Beli secukupnya untuk 2–3 minggu"])],
  ["Cerita di Balik Klepon Latte", 2, "Bagaimana kue tradisional favorit masa kecil menjadi signature drink kami.", article(
    ["Klepon Latte lahir dari obrolan santai tim barista tentang jajanan pasar favorit. Kami ingin rasa pandan, gula merah, dan kelapa hadir dalam satu tegukan.",
     "Setelah lebih dari 20 kali percobaan, resep akhirnya pas: espresso lembut, susu pandan, lapisan gula merah, dan taburan kelapa sangrai."])],
  ["Kenalan dengan Barista Kamee Karawaci", 2, "Di balik setiap cangkir ada tangan-tangan yang penuh dedikasi.", article(
    ["Tim barista Kamee Karawaci terdiri dari enam orang dengan latar belakang beragam, dari mahasiswa hingga mantan juara latte art tingkat kota.",
     "Mereka percaya secangkir kopi yang baik dimulai dari sapaan yang hangat."])],
  ["Kamee Coffee Buka Outlet Baru di Cikokol", 3, "Outlet kedua kami hadir lebih dekat dengan pusat Kota Tangerang.", article(
    ["Kamee Coffee Cikokol resmi dibuka dengan area kerja yang nyaman, colokan di setiap meja, dan Wi-Fi cepat.",
     "Selama minggu pembukaan, nikmati diskon 20% untuk semua menu dengan kode KAMEEHEMAT."])],
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
