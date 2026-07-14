import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { RenderedAdQuery } from "@/lib/ad-run";
import {
  createAdRenderer,
  type AdRendererDependencies,
  type ImageGenerationResult,
} from "./renderer";

const OUTPUT = new Uint8Array([1, 2, 3]);
const LOGO = {
  bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  mediaType: "image/png" as const,
};

const query = (overrides: Partial<RenderedAdQuery> = {}): RenderedAdQuery => ({
  domain: "stripe.com",
  concept: "typographic",
  model: "openai/gpt-image-1",
  subject: { kind: "company" },
  headline: "Move money",
  subheadline: "Financial infrastructure for every business",
  brandName: "Stripe",
  colorA: "vivid violet",
  colorB: "deep navy",
  summary: "Stripe provides programmable financial services.",
  industry: "Technology · Payments",
  mood: "modern, confident, premium",
  fontFamily: "Inter",
  logoUrl: "https://cdn.example/stripe.png",
  canonicalHref: "/api/ad?canonical=true",
  ...overrides,
});

const success = (): ImageGenerationResult => ({
  ok: true,
  value: { bytes: OUTPUT, mediaType: "image/png" },
});

function dependencies(overrides: Partial<AdRendererDependencies> = {}) {
  return {
    isReady: vi.fn(() => true),
    generateImage: vi.fn(async () => success()),
    loadRaster: vi.fn(async () => LOGO),
    sleep: vi.fn(async () => undefined),
    ...overrides,
  } satisfies AdRendererDependencies;
}

describe("Ad Renderer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads and attaches a raster logo only when the Image Model catalog allows it", async () => {
    const capable = dependencies();
    const capableResult = await createAdRenderer(capable).render(query());

    expect(capableResult).toEqual({
      ok: true,
      value: {
        bytes: OUTPUT,
        mediaType: "image/png",
        concept: "typographic",
        model: "openai/gpt-image-1",
      },
    });
    expect(capable.loadRaster).toHaveBeenCalledWith(
      "https://cdn.example/stripe.png",
      undefined,
    );
    expect(vi.mocked(capable.generateImage).mock.calls[0][0]).toMatchObject({
      model: "openai/gpt-image-1",
      logo: LOGO,
      aspectRatio: "1:1",
      quality: "medium",
    });
    expect(vi.mocked(capable.generateImage).mock.calls[0][0].prompt).toContain(
      "The attached image is Stripe's REAL logo mark.",
    );

    for (const model of [
      "bytedance/seedream-4.5",
      "recraft/recraft-v4.1",
    ] as const) {
      const incapable = dependencies();
      await createAdRenderer(incapable).render(query({ model }));
      expect(incapable.loadRaster).not.toHaveBeenCalled();
      expect(vi.mocked(incapable.generateImage).mock.calls[0][0].logo).toBeNull();
      expect(vi.mocked(incapable.generateImage).mock.calls[0][0].prompt).not.toContain(
        "REAL logo mark",
      );
    }
  });

  it("makes the selected Product the explicit campaign focus", async () => {
    const deps = dependencies({ loadRaster: vi.fn(async () => null) });

    await createAdRenderer(deps).render(
      query({
        subject: {
          kind: "product",
          name: "Stripe Billing",
          description: "Subscription billing and recurring revenue tools.",
        },
      }),
    );

    const prompt = vi.mocked(deps.generateImage).mock.calls[0][0].prompt;
    expect(prompt).toContain('specific Stripe product "Stripe Billing"');
    expect(prompt).toContain(
      "Subscription billing and recurring revenue tools.",
    );
    expect(prompt).toContain("not a generic company-level metaphor");
  });

  it("uses the verified styleguide Google Font and preserves the generic fallback", async () => {
    const branded = dependencies({ loadRaster: vi.fn(async () => null) });
    await createAdRenderer(branded).render(query({ fontFamily: "DM Sans" }));

    const brandedPrompt = vi.mocked(branded.generateImage).mock.calls[0][0].prompt;
    expect(brandedPrompt).toContain(
      "Use DM Sans, the brand's Google Font, for every text element.",
    );
    expect(brandedPrompt).not.toContain("Inter / Geist / Helvetica style");

    const fallback = dependencies({ loadRaster: vi.fn(async () => null) });
    await createAdRenderer(fallback).render(query({ fontFamily: null }));

    const fallbackPrompt = vi.mocked(fallback.generateImage).mock.calls[0][0].prompt;
    expect(fallbackPrompt).toContain("Inter / Geist / Helvetica style");
    expect(fallbackPrompt).not.toContain("the brand's Google Font");
  });

  it("softly falls back to text-only when raster loading fails", async () => {
    const deps = dependencies({
      loadRaster: vi.fn(async () => {
        throw new Error("logo unavailable");
      }),
    });

    const result = await createAdRenderer(deps).render(query());

    expect(result.ok).toBe(true);
    expect(vi.mocked(deps.generateImage).mock.calls[0][0].logo).toBeNull();
  });

  it("downgrades an image-input rejection exactly once without consuming a transient retry", async () => {
    const generateImage = vi
      .fn<AdRendererDependencies["generateImage"]>()
      .mockResolvedValueOnce({ ok: false, error: { kind: "transient" } })
      .mockResolvedValueOnce({ ok: false, error: { kind: "image_input_rejected" } })
      .mockResolvedValueOnce({ ok: false, error: { kind: "transient" } })
      .mockResolvedValueOnce(success());
    const deps = dependencies({ generateImage });

    const result = await createAdRenderer(deps).render(query());

    expect(result.ok).toBe(true);
    expect(generateImage).toHaveBeenCalledTimes(4);
    expect(generateImage.mock.calls[0][0].logo).toBe(LOGO);
    expect(generateImage.mock.calls[1][0].logo).toBe(LOGO);
    expect(generateImage.mock.calls[2][0].logo).toBeNull();
    expect(generateImage.mock.calls[3][0].logo).toBeNull();
    expect(generateImage.mock.calls[2][0].prompt).not.toContain("REAL logo mark");
    expect(vi.mocked(deps.sleep).mock.calls.map(([delay]) => delay)).toEqual([800, 1800]);
  });

  it("does not retry a second image-input rejection after logo downgrade", async () => {
    const generateImage = vi
      .fn<AdRendererDependencies["generateImage"]>()
      .mockResolvedValue({ ok: false, error: { kind: "image_input_rejected" } });
    const deps = dependencies({ generateImage });

    const result = await createAdRenderer(deps).render(query());

    expect(result).toEqual({
      ok: false,
      error: { code: "generation_failed", retryable: false },
    });
    expect(generateImage).toHaveBeenCalledTimes(2);
    expect(deps.sleep).not.toHaveBeenCalled();
  });

  it("retries transient failures after 800ms and 1800ms", async () => {
    const generateImage = vi
      .fn<AdRendererDependencies["generateImage"]>()
      .mockResolvedValueOnce({ ok: false, error: { kind: "transient" } })
      .mockResolvedValueOnce({ ok: false, error: { kind: "transient" } })
      .mockResolvedValueOnce(success());
    const deps = dependencies({ generateImage, loadRaster: vi.fn(async () => null) });

    const result = await createAdRenderer(deps).render(query());

    expect(result.ok).toBe(true);
    expect(generateImage).toHaveBeenCalledTimes(3);
    expect(vi.mocked(deps.sleep).mock.calls.map(([delay]) => delay)).toEqual([800, 1800]);
  });

  it("stops immediately on a nontransient failure", async () => {
    const generateImage = vi
      .fn<AdRendererDependencies["generateImage"]>()
      .mockResolvedValue({ ok: false, error: { kind: "nontransient" } });
    const deps = dependencies({ generateImage });

    const result = await createAdRenderer(deps).render(query());

    expect(result).toEqual({
      ok: false,
      error: { code: "generation_failed", retryable: false },
    });
    expect(generateImage).toHaveBeenCalledOnce();
    expect(deps.sleep).not.toHaveBeenCalled();
  });

  it("reports retryable exhaustion after three transient attempts", async () => {
    const generateImage = vi
      .fn<AdRendererDependencies["generateImage"]>()
      .mockResolvedValue({ ok: false, error: { kind: "transient" } });
    const deps = dependencies({ generateImage });

    const result = await createAdRenderer(deps).render(query());

    expect(result).toEqual({
      ok: false,
      error: { code: "generation_failed", retryable: true },
    });
    expect(generateImage).toHaveBeenCalledTimes(3);
    expect(vi.mocked(deps.sleep).mock.calls.map(([delay]) => delay)).toEqual([800, 1800]);
  });

  it("returns not_configured without touching external dependencies", async () => {
    const deps = dependencies({ isReady: vi.fn(() => false) });

    const result = await createAdRenderer(deps).render(query());

    expect(result).toEqual({ ok: false, error: { code: "not_configured" } });
    expect(deps.loadRaster).not.toHaveBeenCalled();
    expect(deps.generateImage).not.toHaveBeenCalled();
  });

  it("returns aborted for work cancelled before rendering or during backoff", async () => {
    const before = dependencies();
    const alreadyAborted = new AbortController();
    alreadyAborted.abort();
    await expect(
      createAdRenderer(before).render(query(), alreadyAborted.signal),
    ).resolves.toEqual({ ok: false, error: { code: "aborted" } });
    expect(before.generateImage).not.toHaveBeenCalled();

    const duringBackoff = new AbortController();
    const sleep = vi.fn(async () => {
      duringBackoff.abort();
      throw new Error("aborted");
    });
    const deps = dependencies({
      generateImage: vi.fn(async () => ({
        ok: false as const,
        error: { kind: "transient" as const },
      })),
      sleep,
    });
    await expect(
      createAdRenderer(deps).render(query(), duringBackoff.signal),
    ).resolves.toEqual({ ok: false, error: { code: "aborted" } });
  });
});
