/**
 * Kontrak respons API Kamee (/api/v1, bagian 8) — sama dengan API Resource di kamee-api.
 * Semua harga integer rupiah; waktu ISO 8601 (Asia/Jakarta).
 */

export interface Paginated<T> {
  data: T[];
  meta: { page: number; per_page: number; total: number; last_page: number };
}

export interface ApiItem<T> {
  data: T;
  message?: string;
}

export interface ApiErrorBody {
  message: string;
  errors?: Record<string, string[]>;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  products_count?: number;
}

export interface Option {
  id: number;
  name: string;
  price_delta: number;
  sort_order: number;
}

export interface OptionGroup {
  id: number;
  name: string;
  type: "single" | "multi";
  is_required: boolean;
  options: Option[];
}

export interface ProductImage {
  id: number;
  url: string;
  alt: string | null;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  base_price: number;
  image_url: string | null;
  rating_avg: number;
  review_count: number;
  sold_count: number;
  is_featured: boolean;
  is_best_seller: boolean;
  is_active: boolean;
  category?: Category;
  images?: ProductImage[];
  option_groups?: OptionGroup[];
}

export interface ProductDetail extends Product {
  description: string | null;
  composition: string | null;
  calories: number | null;
  rating_summary: {
    average: number;
    count: number;
    breakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
  };
}

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  photo_url: string | null;
  reply: string | null;
  customer_name?: string;
  product?: { id: number; name: string; slug: string };
  created_at: string;
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  image_desktop_url: string;
  image_mobile_url: string;
  link_url: string | null;
  placement: string;
  sort_order: number;
}

export type PromotionType = "percent" | "fixed" | "bogo" | "free_delivery";

export interface Promotion {
  id: number;
  code: string | null;
  name: string;
  type: PromotionType;
  type_label: string;
  value: number;
  min_spend: number;
  max_discount: number | null;
  per_customer_limit: number | null;
  outlet_id: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_automatic: boolean;
}

export interface Voucher extends Promotion {
  used: number;
  remaining_uses: number | null;
}

export interface Outlet {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  phone_wa: string;
  open_time: string;
  close_time: string;
  is_open: boolean;
  is_open_now: boolean;
  delivery_radius_km: number;
}

export interface DeliveryQuote {
  distance_km: number;
  fee: number;
  radius_km: number;
  within_radius: boolean;
  outlet_id: number;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  blogs_count?: number;
}

export interface Blog {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_url: string | null;
  category?: BlogCategory | null;
  author?: string | null;
  status: "draft" | "published";
  published_at: string | null;
  views: number;
  content?: string;
  meta_title?: string;
  meta_description?: string;
}

export type Fulfillment = "pickup" | "delivery" | "dine_in";
export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "completed" | "cancelled";
export type PaymentMethod = "qris" | "ewallet" | "bank_transfer" | "cash";
export type PaymentStatus = "pending" | "paid" | "expired" | "failed" | "refunded";

export interface Payment {
  id: number;
  method: PaymentMethod;
  method_label: string;
  provider: string;
  reference: string | null;
  amount: number;
  status: PaymentStatus;
  status_label: string;
  qr_string: string | null;
  va_number: string | null;
  bank: string | null;
  deeplink: string | null;
  expires_at: string | null;
  paid_at: string | null;
  /** QRIS statis (provider "manual"): gambar QR toko, dikonfirmasi admin. Null untuk provider lain. */
  qris_image_url?: string | null;
  merchant_name?: string | null;
  nmid?: string | null;
  requires_manual_confirmation?: boolean;
}

export interface OrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  unit_price: number;
  qty: number;
  subtotal: number;
  note: string | null;
  options?: { name: string; price_delta: number }[];
}

export interface Order {
  id: number;
  code: string;
  status: OrderStatus;
  status_label: string;
  channel: "web" | "whatsapp" | "pos";
  fulfillment: Fulfillment;
  fulfillment_label: string;
  outlet?: { id: number; name: string; phone_wa: string };
  customer_name: string;
  customer_phone: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  scheduled_at: string | null;
  subtotal: number;
  discount: number;
  points_redeemed: number;
  points_discount: number;
  delivery_fee: number;
  service_fee: number;
  total: number;
  note: string | null;
  cancelled_reason: string | null;
  items?: OrderItem[];
  payment?: Payment | null;
  timeline?: { status: OrderStatus; note: string | null; at: string }[];
  paid_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PaymentStatusResponse {
  order_code: string;
  order_status: OrderStatus;
  order_status_label: string;
  total: number;
  payment_deadline: string;
  payment: Payment | null;
}

export interface QuoteResult {
  items: {
    product_id: number;
    product_name: string;
    qty: number;
    base_price: number;
    unit_price: number;
    subtotal: number;
    options: { id: number; name: string; group: string | null; price_delta: number }[];
    note: string | null;
  }[];
  subtotal: number;
  discount: number;
  promotion: { id: number; code: string | null; name: string } | null;
  points_redeemed: number;
  points_value: number;
  delivery_fee: number;
  delivery_distance_km: number | null;
  service_fee: number;
  total: number;
}

export interface LoyaltyTier {
  id: number;
  name: string;
  min_spend: number;
  point_multiplier: number;
  perks: string[];
}

export interface Customer {
  id: number;
  name: string;
  phone_wa: string;
  email: string | null;
  birth_date: string | null;
  points_balance: number;
  lifetime_spend: number;
  tier?: LoyaltyTier | null;
  referral_code: string;
  created_at: string;
}

export interface CustomerAddress {
  id: number;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  is_default: boolean;
}

export interface LoyaltyTransaction {
  id: number;
  type: "earn" | "redeem" | "expire" | "adjust";
  type_label: string;
  points: number;
  balance_after: number;
  order_code?: string | null;
  note: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface PointsSummary {
  balance: number;
  point_value: number;
  balance_value: number;
  expiring_in_30_days: number;
  lifetime_spend: number;
  tier: LoyaltyTier | null;
  next_tier: { name: string; min_spend: number; remaining_spend: number } | null;
}

export interface RedeemPreview {
  requested_points: number;
  applicable_points: number;
  max_points: number;
  point_value: number;
  discount: number;
  subtotal_after: number;
  balance: number;
  balance_after: number;
  message: string;
}

export interface ReorderResult {
  outlet_id: number;
  items: {
    product_id: number;
    product_name: string;
    qty: number;
    option_ids: number[];
    note: string | null;
    unit_price_now: number;
    missing_options: string[];
  }[];
  unavailable: { product_name: string; reason: string }[];
}

/** Payload POST /orders, /orders/quote, /orders/whatsapp */
export interface OrderPayload {
  outlet_id: number;
  customer: { name: string; phone: string };
  fulfillment: Fulfillment;
  address?: { text: string; lat: number; lng: number; note?: string };
  scheduled_at?: string | null;
  items: { product_id: number; qty: number; option_ids: number[]; note?: string | null }[];
  promo_code?: string | null;
  redeem_points?: number;
  note?: string | null;
}
