/**
 * Kontrak respons /api/v1/admin (kamee-api, Admin*Resource). Memakai ulang tipe publik bila sama.
 */
import type {
  Banner,
  Blog,
  BlogCategory,
  Category,
  Customer,
  CustomerAddress,
  Fulfillment,
  LoyaltyTransaction,
  Order,
  OrderStatus,
  Outlet,
  Payment,
  PaymentMethod,
  Product,
  ProductImage,
  Promotion,
  OptionGroup,
} from "@/types/api";

export type { Paginated } from "@/types/api";

export type AdminRole = "super_admin" | "outlet_admin";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  role_label: string;
  outlet_id: number | null;
  outlet: { id: number; name: string } | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface StatusLog {
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  changed_by: string | null;
  at: string;
}

export interface AdminOrder extends Order {
  outlet_id: number;
  customer_id: number | null;
  updated_at?: string;
  handled_by?: { id: number; name: string } | null;
  payments?: Payment[];
  status_logs?: StatusLog[];
}

/** Payload event Reverb `order.created` / `order.status-updated` (OrderBroadcastPayload). */
export interface OrderEvent {
  id: number;
  code: string;
  outlet_id: number;
  status: OrderStatus;
  status_label: string;
  fulfillment: Fulfillment;
  channel: Order["channel"];
  customer_name: string;
  total: number;
  updated_at: string | null;
}

export interface DashboardSummary {
  period: { from: string; to: string };
  revenue: number;
  orders: number;
  paid_orders: number;
  cancelled_orders: number;
  pending_orders: number;
  average_order_value: number;
  new_customers: number;
  by_status: Partial<Record<OrderStatus, number>>;
  by_channel: Partial<Record<Order["channel"], number>>;
}

export interface RevenuePoint {
  period: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  qty: number;
  revenue: number;
}

export type ReportGroup = "day" | "month" | "product" | "outlet" | "payment_method";

export interface ReportRow {
  key: string;
  label: string;
  orders: number;
  qty: number | null;
  revenue: number;
  share: number;
}

export interface SalesReport {
  group_by: ReportGroup;
  rows: ReportRow[];
  totals: { orders: number; revenue: number };
}

export interface AdminProduct extends Product {
  category_id: number;
  description: string | null;
  composition: string | null;
  calories: number | null;
  images?: ProductImage[];
  option_groups?: OptionGroup[];
  option_group_ids?: number[];
  unavailable_outlet_ids: number[];
  deleted_at: string | null;
}

export type ProductBulkAction = "activate" | "deactivate" | "feature" | "unfeature" | "best_seller" | "unbest_seller" | "delete";

export interface AdminPromotion extends Promotion {
  quota: number | null;
  used: number;
  is_active: boolean;
}

export interface AdminBanner extends Banner {
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface AdminBlog extends Blog {
  blog_category_id?: number | null;
}

export interface AdminCustomer extends Customer {
  orders_count?: number;
  stats?: { orders_count: number; completed_orders: number; total_spend: number; last_order_at: string | null };
  addresses?: CustomerAddress[];
}

export interface AdminCustomerDetail {
  data: AdminCustomer;
  recent_orders: Order[];
  points_history: LoyaltyTransaction[];
}

export type ContactStatus = "new" | "read" | "replied";

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  created_at: string;
}

export interface Settings {
  payment_timeout_minutes: number;
  service_fee: number;
  delivery_base_fee: number;
  delivery_base_km: number;
  delivery_per_km_fee: number;
  points_earn_per_amount: number;
  point_value: number;
  points_max_redeem_percent: number;
  points_min_redeem: number;
  points_expiry_months: number;
  whatsapp_number: string;
  default_open_time: string;
  default_close_time: string;
}

export type { Banner, Blog, BlogCategory, Category, Customer, Order, OrderStatus, Outlet, Payment, PaymentMethod, Promotion, OptionGroup };

/** Label status pesanan (sama dengan OrderStatus::label() di backend). */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Menunggu pembayaran",
  paid: "Sudah dibayar",
  processing: "Sedang diproses",
  shipped: "Dalam pengantaran",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  qris: "QRIS",
  ewallet: "E-Wallet",
  bank_transfer: "Transfer Bank",
  cash: "Tunai",
};

export const CHANNEL_LABEL: Record<Order["channel"], string> = { web: "Website", whatsapp: "WhatsApp", pos: "Kasir" };
export const FULFILLMENT_LABEL: Record<Fulfillment, string> = { pickup: "Ambil di outlet", delivery: "Delivery", dine_in: "Makan di tempat" };
