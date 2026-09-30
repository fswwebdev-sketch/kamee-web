/**
 * Menjawab request proxy admin dengan handler MSW di server (mode mock), seperti mocks/server-fetch.ts.
 */
import { getResponse } from "msw";
import { adminHandlers } from "./handlers";

export async function mockAdminFetch(url: string, init: RequestInit): Promise<Response> {
  const request = new Request(url, { method: init.method, headers: init.headers, body: init.body as BodyInit | undefined });
  const response = await getResponse(adminHandlers, request);
  // Sedikit jeda agar skeleton & state loading terlihat realistis
  await new Promise((r) => setTimeout(r, 120));
  return response ?? new Response(JSON.stringify({ message: "Endpoint tidak ditemukan." }), { status: 404, headers: { "Content-Type": "application/json" } });
}
