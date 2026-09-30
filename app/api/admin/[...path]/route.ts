/**
 * BFF proxy untuk panel admin: /api/admin/* → {API}/api/v1/admin/*.
 *
 * - Token Sanctum hanya ada di cookie httpOnly; browser tidak pernah melihatnya.
 * - Request yang mengubah data wajib membawa header `X-Requested-With: kamee-admin` dan Origin yang sama (CSRF).
 * - `auth/login` & `auth/logout` ditangani di sini untuk memasang / menghapus cookie.
 * - `broadcasting/auth` diteruskan ke endpoint otorisasi channel privat Reverb.
 * - Mode mock: request dijawab handler MSW admin di server (mocks/admin), tanpa backend.
 */
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import {
  ADMIN_COOKIE,
  CSRF_HEADER,
  CSRF_VALUE,
  REMEMBER_MAX_AGE,
  SESSION_MAX_AGE,
  cookieOptions,
} from "@/lib/admin/server/session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

const json = (status: number, body: unknown) => NextResponse.json(body, { status });

async function upstream(url: string, init: RequestInit): Promise<Response> {
  if (env.mocking) {
    const { mockAdminFetch } = await import("@/mocks/admin/server");
    return mockAdminFetch(url, init);
  }
  try {
    return await fetch(url, { ...init, cache: "no-store", redirect: "manual" });
  } catch {
    return json(502, { message: "Server API tidak dapat dihubungi." });
  }
}

function isSecure(req: NextRequest) {
  return req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
}

function clearSession(res: NextResponse, secure: boolean) {
  res.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions(secure), maxAge: 0 });
  return res;
}

function passHeaders(res: Response): Headers {
  const out = new Headers();
  for (const h of ["content-type", "content-disposition", "retry-after", "x-ratelimit-remaining"]) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }
  out.set("cache-control", "no-store");
  return out;
}

async function login(req: NextRequest) {
  let body: { email?: string; password?: string; remember?: boolean };
  try {
    body = await req.json();
  } catch {
    return json(422, { message: "Data tidak valid." });
  }
  const res = await upstream(`${env.apiUrl}/admin/auth/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": req.headers.get("user-agent") ?? "kamee-web" },
    body: JSON.stringify({ email: body.email, password: body.password, device_name: "kamee-web-admin" }),
  });
  const payload = (await res.json().catch(() => ({}))) as { message?: string; data?: { token: string; user: unknown } };
  if (!res.ok || !payload.data?.token) {
    return new NextResponse(JSON.stringify(payload), { status: res.status || 500, headers: passHeaders(res) });
  }
  const secure = isSecure(req);
  const maxAge = body.remember ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;
  const out = json(200, { message: payload.message, data: { user: payload.data.user } });
  out.cookies.set(ADMIN_COOKIE, payload.data.token, cookieOptions(secure, maxAge));
  return out;
}

async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const method = req.method.toUpperCase();

  // Tolak segmen berbahaya (path traversal / query injection)
  if (path.some((s) => s === ".." || s === "." || s.includes("?") || s.includes("#"))) return json(400, { message: "Path tidak valid." });
  const joined = path.map(encodeURIComponent).join("/");

  if (method !== "GET" && method !== "HEAD") {
    if (req.headers.get(CSRF_HEADER) !== CSRF_VALUE) return json(403, { message: "Permintaan ditolak (CSRF)." });
    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin) return json(403, { message: "Origin tidak diizinkan." });
  }

  if (joined === "auth/login" && method === "POST") return login(req);

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const secure = isSecure(req);

  if (joined === "auth/logout") {
    if (token) {
      await upstream(`${env.apiUrl}/admin/auth/logout`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
    }
    return clearSession(json(200, { message: "Berhasil keluar." }), secure);
  }

  if (!token) return clearSession(json(401, { message: "Sesi berakhir. Silakan masuk kembali." }), secure);

  const target =
    joined === "broadcasting/auth" ? `${env.apiUrl}/broadcasting/auth` : `${env.apiUrl}/admin/${joined}${req.nextUrl.search}`;

  const headers: Record<string, string> = { Accept: req.headers.get("accept") ?? "application/json", Authorization: `Bearer ${token}` };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const res = await upstream(target, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer(),
  });

  const out = new NextResponse(res.body, { status: res.status, headers: passHeaders(res) });
  return res.status === 401 ? clearSession(out, secure) : out;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
