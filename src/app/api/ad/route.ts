import { NextResponse } from "next/server";
import { decodeRenderedAdQuery } from "@/lib/ad-run";
import { adRenderer, type RenderAdFailure } from "@/lib/generate/renderer";

export const runtime = "nodejs";
export const maxDuration = 300;

const CACHE_OK = "public, s-maxage=86400, stale-while-revalidate=604800";
const NO_STORE = { "Cache-Control": "no-store", "CDN-Cache-Control": "no-store" };

function fail(message: string, status: 400 | 502 | 503) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

function renderFailure(error: RenderAdFailure) {
  if (error.code === "not_configured") {
    return fail("Ad generation is temporarily unavailable.", 503);
  }
  return fail("This ad failed to render. Try this slot again.", 502);
}

/**
 * One canonical GET URL identifies one CDN-cached Rendered Ad. Parsing,
 * rendering policy, retries, and logo downgrade live behind deeper modules.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  let query;
  try {
    query = decodeRenderedAdQuery(url);
  } catch {
    return fail("Invalid ad request.", 400);
  }

  const requestedHref = `${url.pathname}${url.search}`;
  if (requestedHref !== query.canonicalHref) {
    return NextResponse.redirect(new URL(query.canonicalHref, url), {
      status: 308,
      headers: NO_STORE,
    });
  }

  const result = await adRenderer.render(query, request.signal);
  if (!result.ok) return renderFailure(result.error);

  const { bytes, mediaType, concept, model } = result.value;
  return new NextResponse(Uint8Array.from(bytes).buffer, {
    headers: {
      "Content-Type": mediaType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": CACHE_OK,
      "CDN-Cache-Control": CACHE_OK,
      "X-Ad-Concept": concept,
      "X-Ad-Model": model,
    },
  });
}
