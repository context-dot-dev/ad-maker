import OpenAI, { toFile } from "openai";
import { FORMAT_SPEC, type FormatId } from "./presets";

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
 * STEP 5 — render. Prefers gpt-image-1 with real brand references (images.edit),
 * falls back to plain generation, then dall-e-3.
 */
export async function renderPoster(opts: {
  apiKey: string;
  prompt: string;
  format: FormatId;
  refs: RefBuffer[];
  quality?: "low" | "medium" | "high" | "auto";
}): Promise<string> {
  const { apiKey, prompt, format, refs, quality = "medium" } = opts;
  const client = new OpenAI({ apiKey });
  const size = FORMAT_SPEC[format].canvas;

  // 1) Style-reference edit — the brand's real assets guide the output. We hand the
  // model every raster asset we have and let the prompt tell it to pick the best one.
  if (refs.length > 0) {
    try {
      const files = await Promise.all(refs.map((r) => toFile(r.data, r.name, { type: r.type })));
      const r = await client.images.edit({ model: "gpt-image-1", image: files, prompt, size, quality });
      const b64 = r.data?.[0]?.b64_json;
      if (b64) return `data:image/png;base64,${b64}`;
    } catch (err) {
      console.warn("[image] gpt-image-1 edit failed, falling back:", (err as Error)?.message);
    }
  }

  // 2) Plain gpt-image-1.
  try {
    const r = await client.images.generate({ model: "gpt-image-1", prompt, size, quality });
    const b64 = r.data?.[0]?.b64_json;
    if (b64) return `data:image/png;base64,${b64}`;
  } catch (err) {
    console.warn("[image] gpt-image-1 generate failed, trying dall-e-3:", (err as Error)?.message);
  }

  // 3) dall-e-3 last resort.
  const r = await client.images.generate({ model: "dall-e-3", prompt, size: FORMAT_SPEC[format].dalle, response_format: "b64_json" });
  const b64 = r.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned");
  return `data:image/png;base64,${b64}`;
}
