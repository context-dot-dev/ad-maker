import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { selectReferences } from "@/lib/generate/references";
import { pickBestReference } from "@/lib/generate/reference-picker";
import { copywriter } from "@/lib/generate/copywriter";
import { buildPosterPrompt, buildArtworkPrompt } from "@/lib/generate/prompt-builder";
import { downloadReferences, renderPoster } from "@/lib/generate/image-generator";
import { FORMAT_SPEC, type FormatId, type RenderMode } from "@/lib/generate/presets";
import { DEFAULT_LAYOUT, type Brand, type Copy, type TextLayout } from "@/lib/generate/types";

export const maxDuration = 300;

const formatIds = Object.keys(FORMAT_SPEC) as [FormatId, ...FormatId[]];

const requestSchema = z.object({
  domain: z.string(),
  brandName: z.string(),
  description: z.string().default(""),
  pageContext: z.string().default(""),
  colors: z.array(z.string()).default([]),
  colorNames: z.array(z.string()).default([]),
  logoUrl: z.string().default(""),
  backdrops: z.array(z.string()).default([]),
  mainMessage: z.string().default(""),
  subMessage: z.string().default(""),
  ctaOverride: z.string().default(""),
  textFree: z.boolean().default(false),
  formats: z.array(z.enum(formatIds)).min(1).max(3),
});

type GeneratedAd = {
  format: FormatId;
  url: string;
  mode: RenderMode;
  headline: string;
  sub: string;
  cta: string;
  layout: TextLayout;
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return Response.json({ error: "OpenAI key required for image generation. Set OPENAI_API_KEY in admaker/.env." }, { status: 500 });
  const openai = createOpenAI({ apiKey: key });

  const d = parsed.data;
  const brand: Brand = {
    domain: d.domain,
    name: d.brandName || d.domain,
    description: d.description,
    pageContext: d.pageContext,
    colors: d.colors,
    colorNames: d.colorNames,
  };

  try {
    const cta = d.ctaOverride.trim();
    // Copy is only needed for text posters (banners are pure backdrops now).
    const posterCount = d.formats.filter((f) => !d.textFree && FORMAT_SPEC[f].mode === "poster").length;

    // Download every brand asset and write the copy at the same time.
    const candidateUrls = selectReferences({ backdrops: d.backdrops, logoUrl: d.logoUrl });
    const [downloaded, copies] = await Promise.all([
      downloadReferences(candidateUrls),
      posterCount > 0 ? copywriter(openai, brand, posterCount) : Promise.resolve<Copy[]>([]),
    ]);

    // Let a vision model choose the ONE strongest asset, then style off just that.
    // Sending several references to gpt-image-1 makes it blend them into a mess.
    const candidates = downloaded.slice(0, 4);
    const best = candidates.length > 1 ? await pickBestReference(openai, brand, candidates) : 0;
    const refs = candidates.slice(best, best + 1);
    const refCount = refs.length;

    let pIdx = 0;
    const images: GeneratedAd[] = await Promise.all(
      d.formats.map(async (format): Promise<GeneratedAd> => {
        const spec = FORMAT_SPEC[format];
        const mode: RenderMode = d.textFree ? "art" : spec.mode;

        let copy: Copy = { headline: "", sub: "" };
        if (mode === "poster") {
          copy = {
            headline: d.mainMessage.trim() || copies[pIdx]?.headline || "",
            sub: d.subMessage.trim() || copies[pIdx]?.sub || "",
          };
          pIdx++;
        }

        const prompt =
          mode === "art"
            ? buildArtworkPrompt({ brand, format, refCount, reserveLeft: false })
            : buildPosterPrompt({ brand, copy, format, refCount, cta: cta || undefined });

        const url = await renderPoster({ apiKey: key, prompt, format, refs });
        const layout: TextLayout = DEFAULT_LAYOUT; // poster bakes text; art has none — no overlay
        return { format, url, mode, headline: copy.headline, sub: copy.sub, cta, layout };
      }),
    );

    return Response.json({ images, usedReferences: refs.length });
  } catch (err) {
    console.error("[generate] error:", err);
    const e = err as { status?: number; statusCode?: number; message?: string };
    const status = e?.status ?? e?.statusCode;
    let message = "Image generation failed. Please try again.";
    if (status === 401) message = "The AI provider rejected the API key (401). Check OPENAI_API_KEY in admaker/.env.";
    else if (status === 429) message = "Rate limited by OpenAI. Try again in a moment.";
    else if (status === 403) message = "Your OpenAI account can't access the image model yet (needs org verification for gpt-image-1).";
    return Response.json({ error: message }, { status: 500 });
  }
}
