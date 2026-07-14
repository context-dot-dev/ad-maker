import { generateImage as generateImageWithAi } from "ai";
import type { RenderedAdQuery } from "@/lib/ad-run";
import { fetchPublicRaster, type PublicRaster } from "@/lib/public-raster";
import { buildConceptPrompt } from "./concepts";
import {
  classifyGatewayImageError,
  gatewayImageModel,
  hasGatewayConfiguration,
  type GatewayImageFailure,
} from "./gateway";
import { imageModelById, type ImageModelId } from "./models";
import type { CreativeDirectionKey } from "./directions";

export type RenderedAdMediaType = "image/png" | "image/jpeg" | "image/webp";

export type RenderedAd = {
  bytes: Uint8Array;
  mediaType: RenderedAdMediaType;
  concept: CreativeDirectionKey;
  model: ImageModelId;
};

export type RenderAdFailure =
  | { code: "not_configured" }
  | { code: "generation_failed"; retryable: boolean }
  | { code: "aborted" };

export type RenderAdResult =
  | { ok: true; value: RenderedAd }
  | { ok: false; error: RenderAdFailure };

export type ImageGenerationFailure = GatewayImageFailure;

export type ImageGenerationRequest = {
  model: ImageModelId;
  prompt: string;
  logo: PublicRaster | null;
  aspectRatio: "1:1";
  quality: "medium";
};

export type ImageGenerationResult =
  | {
      ok: true;
      value: { bytes: Uint8Array; mediaType: RenderedAdMediaType };
    }
  | { ok: false; error: ImageGenerationFailure };

export type AdRendererDependencies = {
  isReady(): boolean;
  generateImage(
    request: ImageGenerationRequest,
    signal?: AbortSignal,
  ): Promise<ImageGenerationResult>;
  loadRaster(url: string, signal?: AbortSignal): Promise<PublicRaster | null>;
  sleep(milliseconds: number, signal?: AbortSignal): Promise<void>;
};

export type AdRenderer = {
  render(query: RenderedAdQuery, signal?: AbortSignal): Promise<RenderAdResult>;
};

const LOGO_INSTRUCTION = (brandName: string) =>
  `The attached image is ${brandName}'s REAL logo mark. Where the wordmark/logo appears, reproduce this exact mark faithfully — do not redraw, restyle, or hallucinate a different logo.`;

const TRANSIENT_DELAYS = [800, 1800] as const;

const failed = (retryable: boolean): RenderAdResult => ({
  ok: false,
  error: { code: "generation_failed", retryable },
});

export function createAdRenderer(dependencies: AdRendererDependencies): AdRenderer {
  return {
    async render(query, signal) {
      if (signal?.aborted) return { ok: false, error: { code: "aborted" } };

      let ready = false;
      try {
        ready = dependencies.isReady();
      } catch {
        // Configuration checks are intentionally converted to the same safe result.
      }
      if (!ready) return { ok: false, error: { code: "not_configured" } };

      const model = imageModelById(query.model);
      if (!model) return failed(false);

      const promptInput = {
        brandName: query.brandName,
        domain: query.domain,
        summary: query.summary,
        industry: query.industry,
        mood: query.mood,
        colorA: query.colorA,
        colorB: query.colorB,
        headline: query.headline,
        subheadline: query.subheadline,
      };
      const basePrompt = buildConceptPrompt(query.concept, promptInput);

      let logo: PublicRaster | null = null;
      if (model.rasterLogo && query.logoUrl) {
        try {
          logo = await dependencies.loadRaster(query.logoUrl, signal);
        } catch {
          // A logo is enrichment, never a reason to lose the Rendered Ad.
        }
        if (signal?.aborted) return { ok: false, error: { code: "aborted" } };
      }

      let prompt = logo ? `${basePrompt}\n\n${LOGO_INSTRUCTION(query.brandName)}` : basePrompt;
      let logoDowngraded = false;
      let transientFailures = 0;

      for (;;) {
        if (signal?.aborted) return { ok: false, error: { code: "aborted" } };

        let generated: ImageGenerationResult;
        try {
          generated = await dependencies.generateImage(
            {
              model: query.model,
              prompt,
              logo,
              aspectRatio: "1:1",
              quality: "medium",
            },
            signal,
          );
        } catch {
          if (signal?.aborted) return { ok: false, error: { code: "aborted" } };
          return failed(false);
        }

        if (generated.ok) {
          return {
            ok: true,
            value: {
              ...generated.value,
              concept: query.concept,
              model: query.model,
            },
          };
        }

        if (generated.error.kind === "aborted" || signal?.aborted) {
          return { ok: false, error: { code: "aborted" } };
        }

        if (
          generated.error.kind === "image_input_rejected" &&
          logo !== null &&
          !logoDowngraded
        ) {
          logo = null;
          prompt = basePrompt;
          logoDowngraded = true;
          continue;
        }

        if (generated.error.kind !== "transient") return failed(false);
        if (transientFailures >= TRANSIENT_DELAYS.length) return failed(true);

        const delay = TRANSIENT_DELAYS[transientFailures++];
        try {
          await dependencies.sleep(delay, signal);
        } catch {
          if (signal?.aborted) return { ok: false, error: { code: "aborted" } };
          return failed(true);
        }
      }
    },
  };
}

function mediaType(value: string | undefined): RenderedAdMediaType | null {
  if (value === undefined) return "image/png";
  const normalized = value.toLowerCase().split(";", 1)[0].trim();
  return normalized === "image/png" ||
    normalized === "image/jpeg" ||
    normalized === "image/webp"
    ? normalized
    : null;
}

async function generateImage(
  request: ImageGenerationRequest,
  signal?: AbortSignal,
): Promise<ImageGenerationResult> {
  try {
    const { image } = await generateImageWithAi({
      model: gatewayImageModel(request.model),
      prompt: request.logo
        ? { text: request.prompt, images: [request.logo.bytes] }
        : request.prompt,
      aspectRatio: request.aspectRatio,
      providerOptions: { openai: { quality: request.quality } },
      maxRetries: 0,
      abortSignal: signal,
    });

    const outputMediaType = mediaType(image.mediaType);
    const bytes = Uint8Array.from(Buffer.from(image.base64, "base64"));
    if (!outputMediaType || bytes.byteLength === 0) {
      return { ok: false, error: { kind: "nontransient" } };
    }
    return { ok: true, value: { bytes, mediaType: outputMediaType } };
  } catch (error) {
    return {
      ok: false,
      error: classifyGatewayImageError(error, request.logo !== null, signal),
    };
  }
}

function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("Aborted"));
      return;
    }

    const timer = setTimeout(done, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(signal?.reason ?? new Error("Aborted"));
    };
    function done() {
      signal?.removeEventListener("abort", abort);
      resolve();
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export const adRenderer = createAdRenderer({
  isReady: hasGatewayConfiguration,
  generateImage,
  loadRaster: fetchPublicRaster,
  sleep,
});
