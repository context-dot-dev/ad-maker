import { generateObject } from "ai";
import type { OpenAIProvider } from "@ai-sdk/openai";
import { z } from "zod";
import type { Brand, Copy } from "./types";

/**
 * Poster copy only. We do NOT decide campaign/mood/composition — the reference
 * image already answers those. This just writes a short, on-brand line per ad.
 */
export async function copywriter(openai: OpenAIProvider, brand: Brand, count: number): Promise<Copy[]> {
  const { object } = await generateObject({
    model: openai("gpt-4.1-mini"),
    schema: z.object({
      copies: z.array(z.object({
        headline: z.string().describe("max 5 words, confident, poster-like"),
        sub: z.string().describe("one supporting line, max 10 words"),
      })).min(count).max(count),
    }),
    system: "You are a world-class advertising copywriter. Poster copy: short, concrete, on-brand. No filler, no invented features, no calls-to-action.",
    prompt: [
      `BRAND: ${brand.name} (${brand.domain})`,
      brand.description ? `ABOUT: ${brand.description}` : "",
      brand.pageContext ? `SITE CONTENT:\n${brand.pageContext.slice(0, 900)}` : "",
      "",
      `Write ${count} distinct poster headline(s) (each with a short supporting line) for ${brand.name}, each a different angle, cohesive as one set.`,
    ].filter(Boolean).join("\n"),
    temperature: 0.85,
  });
  return object.copies as Copy[];
}
