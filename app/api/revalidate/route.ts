import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/**
 * On-demand ISR dari Laravel (mis. observer Product/Blog/Banner):
 *   POST /api/revalidate
 *   Header: x-revalidate-secret: <REVALIDATE_SECRET>
 *   Body:   { "tags": ["products", "product:aren-kame"], "paths": ["/menu"] }
 * Tag yang tersedia: categories, products, product:{slug}, banners, promotions, outlets, testimonials, blogs, blog:{slug}
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ message: "Rahasia revalidate tidak valid." }, { status: 401 });
  }

  let body: { tags?: unknown; paths?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body harus JSON." }, { status: 400 });
  }

  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string" && /^[\w:-]{1,100}$/.test(t)) : [];
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string" && p.startsWith("/")) : [];
  if (!tags.length && !paths.length) return NextResponse.json({ message: "Sertakan minimal satu tag atau path." }, { status: 422 });

  tags.forEach((t) => revalidateTag(t));
  paths.forEach((p) => revalidatePath(p));

  return NextResponse.json({ message: "Cache diperbarui.", revalidated: { tags, paths }, at: new Date().toISOString() });
}
