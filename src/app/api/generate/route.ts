import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { creativeDirector, copywriter } from "@/lib/generate/creative-director";
import { artDirector } from "@/lib/generate/art-director";
import { buildImagePrompt } from "@/lib/generate/prompt-builder";
import { renderImage } from "@/lib/generate/image-generator";
import { FORMAT_SPEC, type FormatId } from "@/lib/generate/presets";
import type { Brand } from "@/lib/generate/types";

export const maxDuration = 300;

const formatIds = Object.keys(FORMAT_SPEC) as [FormatId, ...FormatId[]];

const requestSchema = z.object({
  domain: z.string(),
  brandName: z.string(),
  description: z.string().default(""),
  pageContext: z.string().default(""),
  colors: z.array(z.string()).default([]),
  colorNames: z.array(z.string()).default([]),
  mainMessage: z.string().default(""),
  subMessage: z.string().default(""),
  ctaOverride: z.string().default(""),
  style: z.string().default(""),
  formats: z.array(z.enum(formatIds)).min(1).max(3),
});

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
    // Staged pipeline: creative direction → (copy ‖ art direction) → poster prompt → image.
    const creative = await creativeDirector(openai, brand, d.formats.length, d.style);
    const [copies, concepts] = await Promise.all([
      copywriter(openai, brand, creative),
      artDirector(openai, brand, creative),
    ]);

    const cta = d.ctaOverride.trim() || undefined;
    const images = await Promise.all(
      d.formats.map((format, i) => {
        const copy = { ...(copies[i] ?? copies[0]) };
        // Honour a user-supplied headline / sub across the set.
        if (d.mainMessage.trim()) copy.headline = d.mainMessage.trim();
        if (d.subMessage.trim()) copy.sub = d.subMessage.trim();

        const prompt = buildImagePrompt({
          brand,
          creative,
          concept: concepts[i] ?? concepts[0],
          copy,
          angle: creative.angles[i] ?? creative.angles[0],
          format,
          cta,
        });
        return renderImage(openai, prompt, format).then((url) => ({ format, url }));
      }),
    );

    return Response.json({ images, creative });
  } catch (err) {
    console.error("[generate] error:", err);
    const e = err as { statusCode?: number; message?: string };
    let message = "Image generation failed. Please try again.";
    if (e?.statusCode === 401) message = "The AI provider rejected the API key (401). Check OPENAI_API_KEY in admaker/.env.";
    else if (e?.statusCode === 429) message = "Rate limited by OpenAI. Try again in a moment.";
    else if (e?.statusCode === 403) message = "Your OpenAI account can't access the image model yet (needs org verification for gpt-image-1).";
    return Response.json({ error: message }, { status: 500 });
  }
}
