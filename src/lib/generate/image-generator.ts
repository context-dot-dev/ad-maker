import { experimental_generateImage as generateImage } from "ai";
import type { OpenAIProvider } from "@ai-sdk/openai";
import { FORMAT_SPEC } from "./presets";
import type { FormatId } from "./presets";

const DALLE_SIZE: Record<FormatId, `${number}x${number}`> = {
  x_banner: "1792x1024",
  li_banner: "1792x1024",
  ad_16_9: "1792x1024",
  li_post: "1024x1024",
};

/** STEP 10 (render) — gpt-image-1, falling back to dall-e-3. */
export async function renderImage(openai: OpenAIProvider, prompt: string, format: FormatId): Promise<string> {
  try {
    const { image } = await generateImage({
      model: openai.image("gpt-image-1"),
      prompt,
      size: FORMAT_SPEC[format].canvas,
      providerOptions: { openai: { quality: "high" } },
    });
    return `data:${image.mediaType ?? "image/png"};base64,${image.base64}`;
  } catch (err) {
    console.warn("[image] gpt-image-1 failed, trying dall-e-3:", (err as Error)?.message);
    const { image } = await generateImage({
      model: openai.image("dall-e-3"),
      prompt,
      size: DALLE_SIZE[format],
    });
    return `data:${image.mediaType ?? "image/png"};base64,${image.base64}`;
  }
}
