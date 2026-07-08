import { generateObject } from "ai";
import type { OpenAIProvider } from "@ai-sdk/openai";
import { z } from "zod";
import { DESIGN_SYSTEMS } from "./presets";
import type { Brand, CreativeDirection, Copy } from "./types";

const designKeys = Object.keys(DESIGN_SYSTEMS) as [string, ...string[]];

const designDescribe = Object.entries(DESIGN_SYSTEMS)
  .map(([k, v]) => `- ${k}: ${v.look}`)
  .join("\n");

/**
 * STEP 1 — the campaign decision. Picks a coherent design language, ONE big
 * idea, and N distinct angles. No pixels, no layout, no illustration here.
 */
export async function creativeDirector(openai: OpenAIProvider, brand: Brand, count: number, styleHint?: string): Promise<CreativeDirection> {
  const { object } = await generateObject({
    model: openai("gpt-4.1-mini"),
    schema: z.object({
      industry: z.string().describe("e.g. developer tools, fintech, AI, security, consumer"),
      designLanguage: z.enum(designKeys),
      campaignConcept: z.string().describe("ONE unforgettable idea for the whole set, 2-5 words (e.g. 'Ideas become connected', 'Global infrastructure')"),
      mood: z.string().describe("1-3 words"),
      paletteUsage: z.string().describe("how to split the palette, e.g. '90% background, 8% primary, 2% accent'"),
      backgroundApproach: z.string().describe("the atmosphere of the background — never flat/empty"),
      avoid: z.array(z.string()).describe("things that would make this feel generic or off-brand"),
      angles: z.array(z.string().describe("a distinct message angle, e.g. speed, trust, a hero feature")).min(count).max(count),
    }),
    system:
      "You are a world-class creative director at a top brand studio (think the teams behind Stripe, Linear, Vercel, Apple). " +
      "You choose ONE coherent design language from the provided list and ONE big campaign idea. " +
      "Match the language to the brand's industry and soul (dev tools → linear/vercel/technical, fintech → stripe, consumer/productivity → apple/notion, AI → linear/stripe, design → editorial/swiss). " +
      "Think in terms of a memorable BRAND POSTER, not a templated ad.",
    prompt: [
      `BRAND: ${brand.name} (${brand.domain})`,
      brand.description ? `POSITIONING: ${brand.description}` : "",
      brand.pageContext ? `SITE CONTENT (for accuracy):\n${brand.pageContext.slice(0, 1200)}` : "",
      brand.colors.length ? `PALETTE: ${brand.colors.join(", ")}` : "",
      "",
      "AVAILABLE DESIGN LANGUAGES:",
      designDescribe,
      "",
      styleHint ? `PREFERRED TONE (a hint, still stay true to the brand): ${styleHint}` : "",
      `Give ${count} distinct angle(s), all under the single campaign concept.`,
    ].filter(Boolean).join("\n"),
    temperature: 0.75,
  });
  return object as CreativeDirection;
}

/**
 * STEP 3 — copy. Poster copy: a short, confident headline and one supporting
 * line. No CTA button, no filler. Typography SUPPORTS the visual.
 */
export async function copywriter(openai: OpenAIProvider, brand: Brand, creative: CreativeDirection): Promise<Copy[]> {
  const { object } = await generateObject({
    model: openai("gpt-4.1-mini"),
    schema: z.object({
      copies: z.array(z.object({
        headline: z.string().describe("max 5 words, confident, poster-like"),
        sub: z.string().describe("one supporting line, max 10 words"),
      })).min(creative.angles.length).max(creative.angles.length),
    }),
    system: "You are a world-class advertising copywriter. Poster copy: short, concrete, on-brand. Never generic filler, never invented features. No calls-to-action.",
    prompt: [
      `BRAND: ${brand.name}`,
      brand.description ? `ABOUT: ${brand.description}` : "",
      brand.pageContext ? `SITE CONTENT:\n${brand.pageContext.slice(0, 900)}` : "",
      `CAMPAIGN CONCEPT: ${creative.campaignConcept}`,
      `MOOD: ${creative.mood}`,
      "",
      "Write copy for each angle below. Keep the set cohesive.",
      ...creative.angles.map((a, i) => `${i + 1}. ${a}`),
    ].filter(Boolean).join("\n"),
    temperature: 0.85,
  });
  return object.copies as Copy[];
}
