import { createGateway } from "@ai-sdk/gateway";
import type { ImageModel, LanguageModel } from "ai";

/**
 * One AI provider for the whole pipeline, backed by the Vercel AI Gateway
 * (AI_GATEWAY_API_KEY). Model ids are always passed as full gateway slugs
 * ("openai/gpt-5.4-mini", "xai/grok-imagine-image"), so a single key serves
 * concept picking, copy, and every image model.
 */
export type AIProvider = {
  text: (modelSlug: string) => LanguageModel;
  image: (modelSlug: string) => ImageModel;
};

export function getProvider(): AIProvider | null {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!gatewayKey) return null;

  const gateway = createGateway({ apiKey: gatewayKey });
  return {
    text: (slug) => gateway(slug),
    image: (slug) => gateway.imageModel(slug),
  };
}
