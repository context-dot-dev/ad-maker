import { generateObject } from "ai";
import type { OpenAIProvider } from "@ai-sdk/openai";
import { z } from "zod";
import type { Brand } from "./types";
import type { RefBuffer } from "./image-generator";

/**
 * Pick the SINGLE best brand asset to style a new ad. Handing gpt-image-1 several
 * references makes it blend them into a muddy composite, so we let a quick vision
 * model choose one strong, campaign-like image and pass only that to the renderer.
 */
export async function pickBestReference(openai: OpenAIProvider, brand: Brand, refs: RefBuffer[]): Promise<number> {
  if (refs.length <= 1) return 0;

  try {
    const { object } = await generateObject({
      model: openai("gpt-4.1-mini"),
      schema: z.object({
        index: z.number().int().describe(`0-based index of the single best asset (0 to ${refs.length - 1})`),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `These are ${refs.length} real brand assets from ${brand.name} (${brand.domain}), numbered 0 to ${refs.length - 1} in the order shown.`,
                `Pick the SINGLE best one to use as the visual style reference for a new premium marketing ad.`,
                `Prefer rich, polished, campaign-like imagery (illustration, photography, atmospheric art) with a clear, cohesive style.`,
                `Avoid plain logos, flat solid-color marks, screenshots, or busy UI. Return only its index.`,
              ].join(" "),
            },
            ...refs.map((r) => ({
              type: "image" as const,
              image: `data:${r.type};base64,${r.data.toString("base64")}`,
            })),
          ],
        },
      ],
      temperature: 0,
    });

    const i = object.index;
    return Number.isInteger(i) && i >= 0 && i < refs.length ? i : 0;
  } catch {
    return 0;
  }
}
