/**
 * Mock API untuk sisi server (Server Components, sitemap, OG image).
 * Request diteruskan langsung ke handler MSW yang sama dengan browser lewat `getResponse`,
 * tanpa menambal global fetch (Next.js menambal fetch sendiri di dev, sehingga
 * intersepsi msw/node bisa terlewat pada render berikutnya).
 */
import { getResponse } from "msw";
import { handlers } from "./handlers";

export async function mockFetch(url: string, init: RequestInit): Promise<Response> {
  const request = new Request(url, { method: init.method, headers: init.headers, body: init.body });
  const response = await getResponse(handlers, request);
  return response ?? new Response(JSON.stringify({ message: "Endpoint tidak ditemukan." }), { status: 404, headers: { "Content-Type": "application/json" } });
}
