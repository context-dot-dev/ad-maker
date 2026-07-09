import { generateObject } from "ai";
import type { OpenAIProvider } from "@ai-sdk/openai";
import { z } from "zod";

/** Where/how our canvas should lay type over a generated artwork. */
export type TextLayout = {
  x: number; y: number; w: number; h: number; // fractions of the image (0..1), top-left origin
  align: "left" | "center" | "right";
  theme: "light" | "dark"; // light = light text (dark/busy area), dark = dark text (bright/empty area)
  scrim: boolean;          // add a soft contrast wash behind the type
};

export const DEFAULT_LAYOUT: TextLayout = { x: 0.06, y: 0.14, w: 0.5, h: 0.72, align: "left", theme: "light", scrim: true };

const schema = z.object({
  x: z.number().min(0).max(0.9),
  y: z.number().min(0).max(0.9),
  w: z.number().min(0.25).max(1),
  h: z.number().min(0.25).max(1),
  align: z.enum(["left", "center", "right"]),
  theme: z.enum(["light", "dark"]),
  scrim: z.boolean(),
});

/**
 * Vision "art director": look at the actual artwork and decide the calmest place
 * for a headline (using the real empty space, not a hardcoded band), plus whether
 * text should be light or dark for contrast. Falls back gracefully.
 */
export async function planLayout(openai: OpenAIProvider, dataUrl: string, ratioLabel: string): Promise<TextLayout> {
  try {
    const { object } = await generateObject({
      model: openai("gpt-4.1"),
      schema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `You are an art director placing a headline + short subheadline on this ${ratioLabel} campaign background.`,
                `Find the single calmest, least-busy region where large type will read cleanly and NOT collide with the focal artwork.`,
                `Use as much of the available empty space as is comfortable (a bigger box lets the type breathe) — don't cram it into a tiny corner.`,
                `Return the text box as fractions of the image: x,y = top-left corner; w,h = width,height (0..1).`,
                `align = how the text should sit inside that box.`,
                `theme = "light" if that region is dark/busy (so use light text) or "dark" if it's bright/empty (so use dark text).`,
                `scrim = true only if the region needs a subtle contrast wash to stay legible.`,
              ].join(" "),
            },
            { type: "image", image: dataUrl },
          ],
        },
      ],
      temperature: 0.2,
    });
    return object as TextLayout;
  } catch (e) {
    console.warn("[layout] vision plan failed, using default:", (e as Error)?.message);
    return DEFAULT_LAYOUT;
  }
}
