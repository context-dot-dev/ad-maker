import { NextResponse } from "next/server";
import { generateImage } from "ai";
import { getProvider } from "@/lib/generate/provider";
import { AD_MODELS, IMAGE_INPUT_MODELS, conceptByKey, type PromptInput } from "@/lib/generate/concepts";
import { isPublicUrl, normalizeDomain } from "@/lib/net";

export const maxDuration = 300;

/**
 * GET /api/ad?domain=…&concept=…&model=…&headline=…&…
 *
 * Renders ONE square ad. Everything the prompt needs travels in the query
 * string so the finished PNG is cached on the Vercel CDN keyed by the full
 * URL — the (CDN-cached) brief for a domain always produces the same ad URLs,
 * so repeat visitors get every image straight from the edge.
 */
const CACHE_OK = "public, s-maxage=86400, stale-while-revalidate=604800";

const RASTER = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_LOGO_BYTES = 8 * 1024 * 1024;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

async function fetchLogo(url: string): Promise<Buffer | null> {
  if (!isPublicUrl(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!RASTER.has(type)) return null; // image edits need raster (skips SVG logos)
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.byteLength > 0 && buf.byteLength <= MAX_LOGO_BYTES ? buf : null;
  } catch {
    return null;
  }
}

const isTransient = (err: unknown) => {
  const e = err as { status?: number; statusCode?: number; message?: string };
  const status = e?.status ?? e?.statusCode;
  return status === 429 || (typeof status === "number" && status >= 500) || /fetch failed|timeout|ECONN/i.test(e?.message ?? "");
};

/**
 * Loose on purpose: providers phrase "this model can't take an image input"
 * in wildly different ways ("Not Found" from Recraft, "Image editing failed…"
 * from Imagen). Any non-transient failure while a logo is attached is worth
 * one text-only retry before giving up.
 */
const rejectsImageInput = (err: unknown) => {
  const msg = ((err as Error)?.message ?? "").toLowerCase();
  return /image|not found|edit/.test(msg);
};

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;

  const domain = normalizeDomain(q.get("domain") ?? "");
  const concept = conceptByKey(q.get("concept") ?? "");
  const model = q.get("model") ?? "";
  if (!domain) return fail("Invalid domain.", 400);
  if (!concept) return fail("Unknown concept.", 400);
  if (!AD_MODELS.includes(model)) return fail("Unknown model.", 400);

  const provider = getProvider();
  if (!provider) {
    return fail("An AI key is required. Set AI_GATEWAY_API_KEY in ad-maker/.env.", 500);
  }

  const input: PromptInput = {
    brandName: (q.get("name") ?? domain).slice(0, 80),
    domain,
    summary: (q.get("summary") ?? "").slice(0, 480),
    industry: (q.get("industry") ?? "").slice(0, 120),
    mood: (q.get("mood") ?? "modern, confident, premium").slice(0, 160),
    colorA: (q.get("colorA") ?? "vivid violet").slice(0, 40),
    colorB: (q.get("colorB") ?? "deep navy").slice(0, 40),
    headline: (q.get("headline") ?? "").slice(0, 60),
    subheadline: (q.get("sub") ?? "").slice(0, 120),
  };
  if (!input.headline) return fail("Missing headline.", 400);

  let prompt = concept.buildPrompt(input);
  const supportsLogo = IMAGE_INPUT_MODELS.has(model);
  let logo = supportsLogo && q.get("logo") ? await fetchLogo(q.get("logo")!) : null;
  if (logo) {
    prompt += `\n\nThe attached image is ${input.brandName}'s REAL logo mark. Where the wordmark/logo appears, reproduce this exact mark faithfully — do not redraw, restyle, or hallucinate a different logo.`;
  }

  const backoffs = [0, 800, 1800];
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (backoffs[attempt] > 0) await sleep(backoffs[attempt]);
    try {
      const { image } = await generateImage({
        model: provider.image(model),
        prompt: logo ? { text: prompt, images: [logo] } : prompt,
        // aspectRatio translates across every gateway image model, where fixed
        // pixel sizes don't.
        aspectRatio: "1:1",
        providerOptions: { openai: { quality: "medium" } },
      });

      const bytes = Buffer.from(image.base64, "base64");
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": image.mediaType ?? "image/png",
          "Content-Length": String(bytes.byteLength),
          "Cache-Control": CACHE_OK,
          "CDN-Cache-Control": CACHE_OK,
          "X-Ad-Concept": concept.key,
          "X-Ad-Model": model,
        },
      });
    } catch (err) {
      lastErr = err;
      if (logo && rejectsImageInput(err)) {
        // This provider won't take image inputs — retry text-only.
        logo = null;
        prompt = concept.buildPrompt(input);
        continue;
      }
      if (!isTransient(err)) break;
    }
  }

  console.error(`[ad] ${concept.key} via ${model} failed:`, (lastErr as Error)?.message);
  return fail("This ad failed to render. Hit retry — it's free.", 502);
}
