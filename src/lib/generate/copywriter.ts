import { generateObject } from "ai";
import type { OpenAIProvider } from "@ai-sdk/openai";
import { z } from "zod";
import type { Brand, Copy } from "./types";

/**
 * Brand-aware poster copy. The #1 failure mode is inventing positioning the
 * company would never ship (e.g. calling Vercel an "AI agent builder"). So we
 * treat the scraped homepage as the source of truth and force the model to
 * continue the brand's REAL campaign using its own vocabulary — no invention.
 */
export async function copywriter(openai: OpenAIProvider, brand: Brand, count: number): Promise<Copy[]> {
  const { object } = await generateObject({
    model: openai("gpt-4.1-mini"),
    schema: z.object({
      keywords: z.array(z.string()).describe("3-6 words/phrases lifted from the homepage that capture how this brand actually talks"),
      copies: z.array(z.object({
        headline: z.string().describe("max 5 words, confident, poster-like, in the brand's own voice"),
        sub: z.string().describe("one supporting line, max 9 words"),
      })).min(count).max(count),
    }),
    system: [
      "You are a senior brand copywriter continuing a company's EXISTING marketing campaign.",
      "Write only copy this company could realistically publish on its own site.",
      "Infer positioning strictly from the homepage content provided — never invent product categories, features, or markets the company doesn't actually serve.",
      "Mirror the brand's real vocabulary, tone and level of technicality. No filler, no clichés, no calls-to-action.",
    ].join(" "),
    prompt: [
      `BRAND: ${brand.name} (${brand.domain})`,
      brand.description ? `DESCRIPTION: ${brand.description}` : "",
      brand.pageContext
        ? `HOMEPAGE CONTENT (source of truth — mirror this positioning & wording):\n"""\n${brand.pageContext.slice(0, 1800)}\n"""`
        : "",
      "",
      `First extract the brand's real keywords from the content above.`,
      `Then write ${count} distinct ad headline(s), each with a short supporting line, for ${brand.name}.`,
      `Each headline must be defensible from the homepage content — a marketer at ${brand.name} should nod, not cringe.`,
      `Different angles, but cohesive as one campaign.`,
    ].filter(Boolean).join("\n"),
    temperature: 0.7,
  });
  return object.copies as Copy[];
}
