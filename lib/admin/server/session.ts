import "server-only";

/**
 * Sesi admin: token Sanctum disimpan di cookie httpOnly (tidak terbaca JavaScript → aman dari XSS),
 * dan semua panggilan /api/v1/admin melewati proxy Next.js (BFF) yang menempelkan Bearer token.
 */
export const ADMIN_COOKIE = "kamee_admin";
/** Header wajib untuk request non-GET: form lintas situs tidak bisa mengirim header kustom (proteksi CSRF). */
export const CSRF_HEADER = "x-requested-with";
export const CSRF_VALUE = "kamee-admin";

export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 jam
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

export function cookieOptions(secure: boolean, maxAge?: number) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", ...(maxAge ? { maxAge } : {}) };
}
