import { createGateway } from "@ai-sdk/gateway";
import { createOpenAI } from "@ai-sdk/openai";
import type { ImageModel, LanguageModel } from "ai";

/**
 * One AI provider for the whole pipeline. Prefers the Vercel AI Gateway
 * (AI_GATEWAY_API_KEY) and falls back to OpenAI directly (OPENAI_API_KEY).
 * Model ids are passed OpenAI-style ("gpt-4.1-mini") and prefixed for the gateway.
 */
export type AIProvider = {
  name: "gateway" | "openai";
  text: (modelId: string) => LanguageModel;
  image: (modelId: string) => ImageModel;
};

export function getProvider(): AIProvider | null {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    const gateway = createGateway({ apiKey: gatewayKey });
    return {
      name: "gateway",
      text: (id) => gateway(`openai/${id}`),
      image: (id) => gateway.imageModel(`openai/${id}`),
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    return {
      name: "openai",
      text: (id) => openai(id),
      image: (id) => openai.imageModel(id),
    };
  }

  return null;
}
