import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGateway } from "@ai-sdk/gateway";
import { z } from "zod";

export const maxDuration = 30;

const requestSchema = z.object({
  domain: z.string(),
  brandName: z.string(),
  description: z.string(),
  pageMarkdown: z.string(),
  promoting: z.string(),
  keyMessage: z.string(),
  ctaOverride: z.string().optional().default(""),
  style: z.string(),
  format: z.string(),
  count: z.number().min(1).max(6).optional().default(3),
});

const outputSchema = z.object({
  ads: z.array(
    z.object({
      headline: z.string().describe("Short punchy headline, max 8 words"),
      highlight: z.string().describe("The single most important word or two-word phrase from the headline to visually emphasize. Must appear verbatim inside headline."),
      body: z.string().describe("One supporting sentence, max 18 words"),
      cta: z.string().describe("Call-to-action button text, 2-3 words"),
    }),
  ),
});

function resolveModel() {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) return createOpenAI({ apiKey: openAiKey })("gpt-4.1-mini");
  const gatewayKey = (process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_API_KEY)?.trim();
  if (gatewayKey) return createGateway({ apiKey: gatewayKey })("openai/gpt-4.1-mini");
  return null;
}

const STYLE_GUIDE: Record<string, string> = {
  clean:    "Professional, clear, trust-building. Simple vocabulary.",
  bold:     "High-energy, punchy, confident claims.",
  minimal:  "Ultra-concise. Every word earns its place.",
  playful:  "Warm, witty, conversational. Light humor welcome.",
  elegant:  "Refined, premium, sophisticated tone.",
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const model = resolveModel();
  if (!model) {
    return Response.json(
      { error: "No AI key configured. Set OPENAI_API_KEY or AI_GATEWAY_API_KEY." },
      { status: 500 },
    );
  }

  const { brandName, description, pageMarkdown, promoting, keyMessage, ctaOverride, style, format, count } = parsed.data;

  const prompt = [
    `Brand: ${brandName}`,
    description ? `About: ${description}` : "",
    pageMarkdown ? `Website content:\n${pageMarkdown.slice(0, 2000)}` : "",
    promoting ? `Promoting: ${promoting}` : "",
    keyMessage ? `Key message to emphasize: ${keyMessage}` : "",
    ctaOverride ? `Use this exact CTA text: ${ctaOverride}` : "",
    "",
    `Tone/style: ${STYLE_GUIDE[style] ?? STYLE_GUIDE.clean}`,
    `Ad format: ${format}`,
    "",
    `Write exactly ${count} distinct ad variations. Each must take a genuinely different angle or hook.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { object } = await generateObject({
      model,
      schema: outputSchema,
      system:
        "You are a world-class advertising copywriter. Write compelling, specific, honest ad copy grounded in the real brand content provided. Never use generic filler.",
      prompt,
      temperature: 0.85,
    });
    return Response.json(object);
  } catch {
    return Response.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
