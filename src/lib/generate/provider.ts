import { createGateway } from "@ai-sdk/gateway";
import { createOpenAI } from "@ai-sdk/openai";
import type { ImageModel, LanguageModel } from "ai";

/**
 * One AI provider for the whole pipeline. Prefers the Vercel AI Gateway
 * (AI_GATEWAY_API_KEY) and falls back to OpenAI directly (OPENAI_API_KEY).
 *
 * Model ids are always passed as full gateway slugs ("openai/gpt-5.4-mini",
 * "xai/grok-imagine-image"). On the direct-OpenAI fallback the "openai/"
 * prefix is stripped and non-OpenAI image models map to gpt-image-1.
 */
export type AIProvider = {
  name: "gateway" | "openai";
  text: (modelSlug: string) => LanguageModel;
  image: (modelSlug: string) => ImageModel;
};

const strip = (slug: string) => (slug.includes("/") ? slug.split("/")[1] : slug);

export function getProvider(): AIProvider | null {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    const gateway = createGateway({ apiKey: gatewayKey });
    return {
      name: "gateway",
      text: (slug) => gateway(slug),
      image: (slug) => gateway.imageModel(slug),
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    return {
      name: "openai",
      text: (slug) => openai(slug.startsWith("openai/") ? strip(slug) : "gpt-4.1-mini"),
      image: (slug) => openai.imageModel(slug.startsWith("openai/") ? strip(slug) : "gpt-image-1"),
    };
  }

  return null;
}
