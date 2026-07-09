import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { selectReferences } from "@/lib/generate/references";
import { copywriter } from "@/lib/generate/copywriter";
import { buildPosterPrompt } from "@/lib/generate/prompt-builder";
import { downloadReferences, renderPoster } from "@/lib/generate/image-generator";
import { FORMAT_SPEC, type FormatId } from "@/lib/generate/presets";
import type { Brand, Copy } from "@/lib/generate/types";

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
    // ONE strongest reference — avoid averaging multiple assets into AI soup.
    const candidateUrls = selectReferences({ backdrops: d.backdrops, logoUrl: d.logoUrl });
    const downloaded = await downloadReferences(candidateUrls);
    const refs = downloaded.slice(0, 1);

    const copies: Copy[] = d.textFree ? [] : await copywriter(openai, brand, d.formats.length);

    const cta = d.ctaOverride.trim() || undefined;
    const images = await Promise.all(
      d.formats.map((format, i) => {
        const copy: Copy = {
          headline: d.mainMessage.trim() || copies[i]?.headline || "",
          sub: d.subMessage.trim() || copies[i]?.sub || "",
        };
        const prompt = buildPosterPrompt({ brand, copy, format, hasRefs: refs.length > 0, textFree: d.textFree, cta });
        return renderPoster({ apiKey: key, prompt, format, refs }).then((url) => ({ format, url }));
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
