/**
 * "Database" in-memory untuk mock MSW. Di browser disimpan ke localStorage agar pesanan,
 * login, favorit, dan alamat tetap ada setelah reload halaman.
 */
import type { Customer, CustomerAddress, LoyaltyTransaction, Order, Payment } from "@/types/api";
import { tiers } from "./data";

export interface MockState {
  orders: Order[];
  payments: (Payment & { order_code: string; created_ms: number })[];
  customers: Customer[];
  tokens: Record<string, number>;
  favorites: Record<number, number[]>;
  addresses: Record<number, CustomerAddress[]>;
  loyalty: Record<number, LoyaltyTransaction[]>;
  promoUsage: Record<string, { code: string; phone: string }[]>;
  idempotency: Record<string, { status: number; body: unknown }>;
  seq: number;
}

const KEY = "kamee-mock-db";
const isBrowser = typeof window !== "undefined";

function seed(): MockState {
  const demo: Customer = {
    id: 1,
    name: "Dinda Putri",
    phone_wa: "6281234567890",
    email: "dinda@example.com",
    birth_date: "1998-05-17",
    points_balance: 240,
    lifetime_spend: 1_240_000,
    tier: tiers[1]!,
    referral_code: "KMDINDA1",
    created_at: "2026-06-01T10:00:00+07:00",
  };
  return {
    orders: [],
    payments: [],
    customers: [demo],
    tokens: {},
    favorites: { 1: [4, 13] },
    addresses: {
      1: [{ id: 1, label: "Rumah", address: "Jl. Merdeka No. 10, Sukarasa, Tangerang", lat: -6.2005, lng: 106.6312, note: "Pagar hitam", is_default: true }],
    },
    loyalty: {
      1: [
        { id: 2, type: "earn", type_label: "Poin didapat", points: 90, balance_after: 240, order_code: "KM260920DEMO2", note: "Poin dari pesanan KM260920DEMO2", expires_at: "2027-09-20T15:00:00+07:00", created_at: "2026-09-20T15:00:00+07:00" },
        { id: 1, type: "earn", type_label: "Poin didapat", points: 150, balance_after: 150, order_code: "KM260801DEMO1", note: "Poin dari pesanan KM260801DEMO1", expires_at: "2027-08-01T12:00:00+07:00", created_at: "2026-08-01T12:00:00+07:00" },
      ],
    },
    promoUsage: {},
    idempotency: {},
    seq: 1000,
  };
}

let state: MockState | null = null;

export function db(): MockState {
  if (state) return state;
  if (isBrowser) {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) state = { ...seed(), ...(JSON.parse(raw) as MockState) };
    } catch {
      /* abaikan data rusak */
    }
  }
  state ??= seed();
  return state;
}

export function persist() {
  if (!isBrowser || !state) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* kuota penuh: abaikan */
  }
}

export function nextId() {
  const s = db();
  s.seq += 1;
  return s.seq;
}

export function resetMockDb() {
  state = seed();
  persist();
}
