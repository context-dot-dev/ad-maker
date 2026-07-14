import "server-only";

import { createGateway } from "@ai-sdk/gateway";
import type { ImageModel, LanguageModel } from "ai";
import type { ImageModelId } from "./models";

export function hasGatewayConfiguration(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
}

function gateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!apiKey) throw new Error("AI generation is not configured");
  return createGateway({ apiKey });
}

export function gatewayTextModel(model: "openai/gpt-5.4-mini"): LanguageModel {
  return gateway()(model);
}

export function gatewayImageModel(model: ImageModelId): ImageModel {
  return gateway().imageModel(model);
}

export type GatewayImageFailure =
  | { kind: "transient" }
  | { kind: "image_input_rejected" }
  | { kind: "nontransient" }
  | { kind: "aborted" };

function errorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && !seen.has(current) && chain.length < 6) {
    seen.add(current);
    chain.push(current);
    const record = current as { lastError?: unknown; cause?: unknown };
    current = record.lastError ?? record.cause;
  }
  return chain;
}

/** Normalize provider-specific Gateway errors for the Rendered Ad module. */
export function classifyGatewayImageError(
  error: unknown,
  hadLogo: boolean,
  signal?: AbortSignal,
): GatewayImageFailure {
  const chain = errorChain(error);
  const text = chain
    .map((entry) => (entry as { message?: unknown }).message)
    .filter((message): message is string => typeof message === "string")
    .join(" ")
    .toLowerCase();

  if (
    signal?.aborted ||
    chain.some(
      (entry) =>
        (entry as { name?: unknown }).name === "AbortError" ||
        (entry as { reason?: unknown }).reason === "abort",
    )
  ) {
    return { kind: "aborted" };
  }

  const status = chain
    .map((entry) => {
      const record = entry as { status?: unknown; statusCode?: unknown };
      return record.status ?? record.statusCode;
    })
    .find((value): value is number => typeof value === "number");

  if (
    hadLogo &&
    (status === 404 ||
      /image input|input image|image edit|editing|does not support.{0,30}image|unsupported.{0,30}image|not found/.test(
        text,
      ))
  ) {
    return { kind: "image_input_rejected" };
  }

  if (
    status === 408 ||
    status === 429 ||
    (typeof status === "number" && status >= 500) ||
    /fetch failed|timed? ?out|timeout|econn|socket hang up|network error/.test(text)
  ) {
    return { kind: "transient" };
  }

  return { kind: "nontransient" };
}
