import type { ApiErrorBody } from "@/types/api";
import { env } from "./env";
import { mockReady } from "./mock-ready";

/** Error API dengan pesan & error per field (format kamee-api). */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: Record<string, string[]>;
  /** Detik dari header Retry-After (khusus 429) */
  readonly retryAfter: number | null;

  constructor(status: number, body: Partial<ApiErrorBody>, retryAfter: number | null = null) {
    super(body.message || ApiError.fallbackMessage(status));
    this.name = "ApiError";
    this.status = status;
    this.errors = body.errors ?? {};
    this.retryAfter = retryAfter;
  }

  /** Pesan error pertama untuk field tertentu (mis. "items.0.qty"). */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }

  static fallbackMessage(status: number): string {
    if (status === 0) return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
    if (status === 401) return "Sesi Anda berakhir. Silakan masuk kembali.";
    if (status === 403) return "Anda tidak memiliki akses.";
    if (status === 404) return "Data tidak ditemukan.";
    if (status === 429) return "Terlalu banyak permintaan. Coba lagi sebentar.";
    if (status >= 500) return "Terjadi kesalahan pada server. Silakan coba lagi.";
    return "Permintaan tidak dapat diproses.";
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

type TokenGetter = () => string | null;
let getToken: TokenGetter = () => null;
let onUnauthorized: () => void = () => {};

/** Dipasang oleh store auth di sisi klien. */
export function configureAuth(getter: TokenGetter, unauthorized: () => void) {
  getToken = getter;
  onUnauthorized = unauthorized;
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined | (string | number)[]>;
  idempotencyKey?: string;
  /** false = jangan kirim token walau ada */
  auth?: boolean;
  signal?: AbortSignal;
  /** Opsi cache Next.js untuk fetch di server (ISR) */
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
}

export function buildUrl(path: string, query?: ApiOptions["query"]): string {
  const url = new URL(env.apiUrl + (path.startsWith("/") ? path : `/${path}`));
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return url.toString();
}

/** Fetch wrapper: JSON, Bearer token, Idempotency-Key, error handling seragam. */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser && env.mocking) await mockReady();

  const headers: Record<string, string> = { Accept: "application/json" };
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  const token = isBrowser && options.auth !== false ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = buildUrl(path, options.query);
  const init: RequestInit & { next?: ApiOptions["next"] } = {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    signal: options.signal,
    ...(options.next ? { next: options.next } : {}),
    ...(options.cache ? { cache: options.cache } : {}),
  };

  let response: Response;
  try {
    if (!isBrowser && env.mocking) {
      // Mock sisi server: handler MSW dipanggil langsung (lihat mocks/server-fetch.ts).
      const { mockFetch } = await import("@/mocks/server-fetch");
      response = await mockFetch(url, init);
    } else {
      response = await fetch(url, init);
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, {});
  }

  const text = await response.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized();
    const retryAfter = Number(response.headers.get("Retry-After"));
    throw new ApiError(response.status, (json as ApiErrorBody) ?? {}, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
  }

  return json as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch untuk Server Component: ISR + tag agar bisa di-revalidate dari Laravel.
 * Saat build/ISR, 429 dari rate limit API dicoba ulang sesuai Retry-After (maks 2×).
 */
export async function serverApi<T>(path: string, options: Omit<ApiOptions, "auth"> & { revalidate?: number; tags?: string[] } = {}): Promise<T> {
  const { revalidate = 300, tags = [], ...rest } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await api<T>(path, { ...rest, auth: false, next: { revalidate, tags } });
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 429 || attempt >= 2) throw e;
      await sleep(Math.min(60, Math.max(1, e.retryAfter ?? 10)) * 1000);
    }
  }
}
