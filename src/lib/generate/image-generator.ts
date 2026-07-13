import { generateImage } from "ai";
import { FORMAT_SPEC, type FormatId } from "./presets";
import type { AIProvider } from "./provider";

export type RefBuffer = { data: Buffer; type: string; name: string };

const RASTER = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_BYTES = 20 * 1024 * 1024;

/** Download brand assets once so they can be sent as gpt-image-1 references. */
export async function downloadReferences(urls: string[]): Promise<RefBuffer[]> {
  const out = await Promise.all(
    urls.map(async (url, i): Promise<RefBuffer | null> => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        if (!RASTER.has(type)) return null; // gpt-image-1 edits need raster (skips SVG logos)
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;
        const ext = type === "image/webp" ? "webp" : type.includes("png") ? "png" : "jpg";
        return { data: buf, type, name: `ref-${i}.${ext}` };
      } catch {
        return null;
      }
    }),
  );
  return out.filter((r): r is RefBuffer => r !== null);
}

/**
 * STEP 5 — render. Prefers gpt-image-1 with real brand references (image edit),
 * falls back to plain generation, then dall-e-3 (direct OpenAI only — the
 * gateway doesn't serve dall-e-3).
 */
export async function renderPoster(opts: {
  provider: AIProvider;
  prompt: string;
  format: FormatId;
  refs: RefBuffer[];
  quality?: "low" | "medium" | "high" | "auto";
}): Promise<string> {
  const { provider, prompt, format, refs, quality = "medium" } = opts;
  const size = FORMAT_SPEC[format].canvas;
  const providerOptions = { openai: { quality } };

  // 1) Style-reference edit — the brand's real assets guide the output.
  if (refs.length > 0) {
    try {
      const { image } = await generateImage({
        model: provider.image("gpt-image-1"),
        prompt: { text: prompt, images: refs.map((r) => r.data) },
        size,
        providerOptions,
      });
      return `data:${image.mediaType ?? "image/png"};base64,${image.base64}`;
    } catch (err) {
      console.warn("[image] gpt-image-1 edit failed, falling back:", (err as Error)?.message);
    }
  }

  // 2) Plain gpt-image-1.
  try {
    const { image } = await generateImage({
      model: provider.image("gpt-image-1"),
      prompt,
      size,
      providerOptions,
    });
    return `data:${image.mediaType ?? "image/png"};base64,${image.base64}`;
  } catch (err) {
    if (provider.name !== "openai") throw err;
    console.warn("[image] gpt-image-1 generate failed, trying dall-e-3:", (err as Error)?.message);
  }

  // 3) dall-e-3 last resort (helps OpenAI orgs not yet verified for gpt-image-1).
  const { image } = await generateImage({
    model: provider.image("dall-e-3"),
    prompt,
    size: FORMAT_SPEC[format].dalle,
  });
  return `data:${image.mediaType ?? "image/png"};base64,${image.base64}`;
}
