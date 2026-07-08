import { experimental_generateImage as generateImage, generateObject } from "ai";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { z } from "zod";

export const maxDuration = 120;

const requestSchema = z.object({
  domain: z.string(),
  brandName: z.string(),
  description: z.string(),
  colors: z.array(z.string()).default([]),
  mainMessage: z.string().default(""),
  subMessage: z.string().default(""),
  ctaOverride: z.string().default(""),
  style: z.string().default("clean"),
  format: z.string().default("ad_16_9"),
  count: z.number().min(1).max(3).optional().default(3),
});

// Three distinct, genuinely beautiful art directions — all anchored to the brand palette.
const ART_DIRECTIONS = [
  "hero gradient made from the brand's own colors, with soft volumetric 3D glass and chrome shapes, gentle light bloom and depth; ultra-premium, the kind of visual that trends on Dribbble",
  "confident dark editorial layout on a near-black canvas, the brand's primary color used as a glowing accent, subtle grid and fine lines, huge bold typography, tons of negative space; Awwwards-worthy",
  "bright, airy, minimal poster with a single large brand-colored shape, crisp modern type and elegant spacing; clean Apple-keynote energy",
];

const STYLE_NOTE: Record<string, string> = {
  clean: "clean and professional",
  bold: "bold and high-energy",
  minimal: "ultra-minimal",
  playful: "friendly and playful",
  elegant: "refined and elegant",
};

// Per-format composition guidance so the design reads correctly at the target crop.
const FORMAT_BRIEF: Record<string, string> = {
  x_banner: "Compose as a WIDE horizontal banner. Place the headline, logo and CTA in a centered horizontal band and leave generous empty margins at the very top and bottom so nothing important is near the edges.",
  li_banner: "Compose as an ULTRA-WIDE cover banner. Keep the headline and logo tightly centered with lots of breathing room on all sides.",
  li_post: "Compose as a balanced SQUARE post with the headline centered.",
  ad_16_9: "Compose as a 16:9 landscape ad with a clear focal point.",
  custom: "Compose as a clean landscape ad with a clear focal point.",
};

// gpt-image-1 supported sizes.
const SIZE_FOR_FORMAT: Record<string, `${number}x${number}`> = {
  x_banner: "1536x1024",
  li_banner: "1536x1024",
  ad_16_9: "1536x1024",
  li_post: "1024x1024",
  custom: "1536x1024",
};
// dall-e-3 fallback sizes.
const DALLE_SIZE_FOR_FORMAT: Record<string, `${number}x${number}`> = {
  x_banner: "1792x1024",
  li_banner: "1792x1024",
  ad_16_9: "1792x1024",
  li_post: "1024x1024",
  custom: "1792x1024",
};

type Brief = { headline: string; sub: string; cta: string };

async function makeBriefs(
  openai: OpenAIProvider,
  input: { brandName: string; description: string; mainMessage: string; subMessage: string; ctaOverride: string; style: string; count: number },
): Promise<Brief[]> {
  const cta = input.ctaOverride.trim() || "Get started";

  // If the user wrote their own headline, use it verbatim across all variations.
  if (input.mainMessage.trim()) {
    return Array.from({ length: input.count }, () => ({
      headline: input.mainMessage.trim(),
      sub: input.subMessage.trim(),
      cta,
    }));
  }

  const { object } = await generateObject({
    model: openai("gpt-4.1-mini"),
    schema: z.object({
      briefs: z.array(z.object({
        headline: z.string().describe("Punchy ad headline, max 7 words"),
        sub: z.string().describe("One short supporting line, max 12 words"),
        cta: z.string().describe("2-3 word call to action"),
      })),
    }),
    system: "You are a world-class advertising copywriter. Write concrete, specific, on-brand ad copy. No generic filler.",
    prompt: [
      `Brand: ${input.brandName}`,
      input.description ? `About: ${input.description}` : "",
      `Tone: ${STYLE_NOTE[input.style] ?? "clean and professional"}`,
      `Write ${input.count} distinct ad concepts, each with a different angle.`,
    ].filter(Boolean).join("\n"),
    temperature: 0.85,
  });

  return object.briefs.slice(0, input.count).map((b) => ({ ...b, cta: input.ctaOverride.trim() || b.cta }));
}

function buildPrompt(opts: { brandName: string; description: string; colors: string[]; brief: Brief; style: string; format: string; art: string }): string {
  const { brandName, description, colors, brief, style, format, art } = opts;
  const palette = colors.length ? colors.join(", ") : "a cohesive modern palette";
  return [
    `Design an award-winning, scroll-stopping advertisement creative for the brand "${brandName}" — the kind of ad people screenshot and share.`,
    description ? `What the brand does: ${description}.` : "",
    `This is CRITICAL: the whole design must feel unmistakably on-brand for ${brandName}. Make ${palette} the dominant colors of the composition (backgrounds, shapes, accents) — do NOT default to generic blue/purple.`,
    FORMAT_BRIEF[format] ?? FORMAT_BRIEF.ad_16_9,
    `Headline, set in large, bold, perfectly-spelled typography as the clear focal point: "${brief.headline}".`,
    brief.sub ? `A smaller supporting line beneath it: "${brief.sub}".` : "",
    `A tasteful "${brandName}" wordmark in one corner and a small solid call-to-action button labelled "${brief.cta}".`,
    `Art direction: ${art}. Mood: ${STYLE_NOTE[style] ?? "clean and professional"}.`,
    `Requirements: professional graphic-design quality, striking modern sans-serif typography with strong hierarchy, deliberate composition, rich but harmonious color, real visual depth.`,
    `Strictly avoid: misspelled or gibberish text, duplicated letters, lorem ipsum, watermarks, stock-photo people, ugly clip-art, cluttered layouts, and any border frame around the whole image.`,
  ].filter(Boolean).join(" ");
}

async function renderOne(openai: OpenAIProvider, prompt: string, format: string): Promise<string> {
  // Prefer gpt-image-1 (great at text); fall back to dall-e-3 if unavailable.
  try {
    const { image } = await generateImage({
      model: openai.image("gpt-image-1"),
      prompt,
      size: SIZE_FOR_FORMAT[format] ?? "1536x1024",
      providerOptions: { openai: { quality: "high" } },
    });
    return `data:${image.mediaType ?? "image/png"};base64,${image.base64}`;
  } catch (err) {
    console.warn("[generate] gpt-image-1 failed, trying dall-e-3:", (err as Error)?.message);
    const { image } = await generateImage({
      model: openai.image("dall-e-3"),
      prompt,
      size: DALLE_SIZE_FOR_FORMAT[format] ?? "1792x1024",
    });
    return `data:${image.mediaType ?? "image/png"};base64,${image.base64}`;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return Response.json({ error: "OpenAI key required for image generation. Set OPENAI_API_KEY in admaker/.env." }, { status: 500 });
  const openai = createOpenAI({ apiKey: key });

  const { brandName, description, colors, mainMessage, subMessage, ctaOverride, style, format, count } = parsed.data;

  try {
    const briefs = await makeBriefs(openai, { brandName, description, mainMessage, subMessage, ctaOverride, style, count });

    const images = await Promise.all(
      briefs.map((brief, i) =>
        renderOne(openai, buildPrompt({ brandName, description, colors, brief, style, format, art: ART_DIRECTIONS[i % ART_DIRECTIONS.length] }), format),
      ),
    );

    return Response.json({ images });
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
