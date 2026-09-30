"use client";

/**
 * Klien API admin. Semua request lewat proxy same-origin /api/admin (token di cookie httpOnly).
 */
import type { ApiErrorBody } from "@/types/api";
import { ApiError } from "@/lib/api";

export type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

export interface AdminApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

export function toSearch(query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

let redirecting = false;
function toLogin() {
  if (redirecting || typeof window === "undefined") return;
  redirecting = true;
  const next = window.location.pathname + window.location.search;
  window.location.assign(`/admin/login?next=${encodeURIComponent(next)}&expired=1`);
}

async function request(path: string, options: AdminApiOptions & { accept?: string } = {}): Promise<Response> {
  let method = options.method ?? "GET";
  let body: BodyInit | undefined;
  const headers: Record<string, string> = { Accept: options.accept ?? "application/json", "X-Requested-With": "kamee-admin" };

  if (options.body instanceof FormData) {
    // Laravel tidak mem-parse multipart pada PATCH/PUT → method spoofing
    if (method === "PATCH" || method === "PUT") {
      options.body.set("_method", method);
      method = "POST";
    }
    body = options.body;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(`/api/admin/${path.replace(/^\//, "")}${toSearch(options.query)}`, { method, headers, body, signal: options.signal, credentials: "same-origin" });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, {});
  }
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as ApiErrorBody;
    if (res.status === 401 && !path.startsWith("auth/login")) toLogin();
    const retry = Number(res.headers.get("Retry-After"));
    throw new ApiError(res.status, json, Number.isFinite(retry) && retry > 0 ? retry : null);
  }
  return res;
}

export async function adminApi<T>(path: string, options: AdminApiOptions = {}): Promise<T> {
  const res = await request(path, options);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Unduh berkas (mis. laporan XLSX) lewat proxy lalu simpan di perangkat. */
export async function adminDownload(path: string, query: Query, fallbackName: string): Promise<void> {
  const res = await request(path, { query, accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: decodeURIComponent(name) });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
