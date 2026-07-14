// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AD_RUN_SIZE, type AdRunPlan } from "@/lib/ad-run";
import { CREATIVE_DIRECTIONS } from "@/lib/generate/directions";
import { IMAGE_MODELS } from "@/lib/generate/models";
import { useAdMaker, type AdMakerController } from "./use-ad-maker";

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function planFor(domain = "stripe.com"): AdRunPlan {
  const concepts = CREATIVE_DIRECTIONS.slice(0, AD_RUN_SIZE).map(
    (direction, index) => ({
      key: direction.key,
      model: IMAGE_MODELS[index].id,
      headline: `Concept ${index + 1}`,
      subheadline: "A concise supporting line",
    }),
  );

  return {
    brief: {
      domain,
      brandName: "Stripe",
      description: "Financial infrastructure for the internet.",
      industry: "Technology · Payments",
      summary: "Stripe provides programmable financial services.",
      mood: "modern, confident, premium",
      colorA: "vivid violet",
      colorB: "deep navy",
      logoUrl: null,
      colors: [{ hex: "#635bff", name: "Purple" }],
    },
    concepts: [
      concepts[0],
      concepts[1],
      concepts[2],
      concepts[3],
      concepts[4],
      concepts[5],
    ],
  };
}

function jsonResponse(value: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 502,
    json: async () => value,
  } as Response;
}

function imageResponse(type = "image/png", ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 502,
    blob: async () => new Blob(["image"], { type }),
  } as Response;
}

function atPhase<Phase extends AdMakerController["phase"]>(
  controller: AdMakerController,
  phase: Phase,
): Extract<AdMakerController, { phase: Phase }> {
  expect(controller.phase).toBe(phase);
  if (controller.phase !== phase) throw new Error(`Expected ${phase}`);
  return controller as Extract<AdMakerController, { phase: Phase }>;
}

describe("useAdMaker", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const createObjectURL = vi.fn<(blob: Blob) => string>();
  const revokeObjectURL = vi.fn<(url: string) => void>();

  beforeEach(() => {
    let nextUrl = 0;
    fetchMock.mockReset();
    createObjectURL.mockReset();
    createObjectURL.mockImplementation(() => `blob:ad-${++nextUrl}`);
    revokeObjectURL.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("canonicalizes a mixed-case submitted domain before planning", async () => {
    const pendingAd = deferred<Response>();
    fetchMock.mockImplementation((input) => {
      const href = String(input);
      if (href.startsWith("/api/brief")) {
        return Promise.resolve(jsonResponse(planFor()));
      }
      return pendingAd.promise;
    });
    const { result, unmount } = renderHook(() => useAdMaker());
    const start = atPhase(result.current, "idle").start;

    await act(() => start("HTTPS://WWW.Stripe.COM/Pricing"));

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/brief?domain=stripe.com");
    const generating = atPhase(result.current, "generating");
    expect(generating.submittedDomain).toBe("stripe.com");
    expect(generating.brief.domain).toBe("stripe.com");
    unmount();
  });

  it("rejects a valid plan for a domain other than the submitted domain", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(planFor("linear.app")));
    const { result } = renderHook(() => useAdMaker());
    const start = atPhase(result.current, "idle").start;

    await act(() => start("stripe.com"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(atPhase(result.current, "idle").error).toBe(
      "The Brief did not match the submitted domain.",
    );
    expect(atPhase(result.current, "idle").domain).toBe("stripe.com");
  });

  it("stays generating when the original requests settle before an in-flight retry", async () => {
    const originalRenders = deferred<Response>();
    const retry = deferred<Response>();
    let adRequest = 0;
    fetchMock.mockImplementation((input) => {
      const href = String(input);
      if (href.startsWith("/api/brief")) {
        return Promise.resolve(jsonResponse(planFor()));
      }
      adRequest += 1;
      if (adRequest === 1)
        return Promise.resolve(imageResponse("image/png", false));
      if (adRequest <= AD_RUN_SIZE) return originalRenders.promise;
      return retry.promise;
    });
    const { result } = renderHook(() => useAdMaker());
    const start = atPhase(result.current, "idle").start;

    await act(() => start("stripe.com"));
    await waitFor(() => {
      expect(atPhase(result.current, "generating").slots[0].status).toBe(
        "error",
      );
    });

    act(() => atPhase(result.current, "generating").retrySlot(0));
    expect(atPhase(result.current, "generating").slots[0].status).toBe(
      "loading",
    );

    await act(async () => originalRenders.resolve(imageResponse()));
    await waitFor(() =>
      expect(atPhase(result.current, "generating").doneCount).toBe(5),
    );
    expect(atPhase(result.current, "generating").slots[0].status).toBe(
      "loading",
    );

    await act(async () => retry.resolve(imageResponse("image/webp")));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    const callsBeforeDoneRetry = fetchMock.mock.calls.length;
    const completed = atPhase(result.current, "done");
    act(() => completed.retrySlot(1));
    expect(result.current.phase).toBe("done");
    expect(fetchMock).toHaveBeenCalledTimes(callsBeforeDoneRetry);
  });

  it("aborts and ignores stale Rendered Ads after reset", async () => {
    const pendingAd = deferred<Response>();
    fetchMock.mockImplementation((input) =>
      String(input).startsWith("/api/brief")
        ? Promise.resolve(jsonResponse(planFor()))
        : pendingAd.promise,
    );
    const { result } = renderHook(() => useAdMaker());
    const start = atPhase(result.current, "idle").start;

    await act(() => start("stripe.com"));
    const generating = atPhase(result.current, "generating");
    const rootSignal = (fetchMock.mock.calls[1]?.[1] as RequestInit).signal;

    act(() => generating.reset());
    expect(rootSignal?.aborted).toBe(true);
    expect(result.current.phase).toBe("idle");
    expect(atPhase(result.current, "idle").domain).toBe("");

    await act(async () => {
      pendingAd.resolve(imageResponse());
      await pendingAd.promise;
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("idle");
  });

  it("keeps a settled gallery visible while retrying a failed slot", async () => {
    const retry = deferred<Response>();
    let adRequest = 0;
    fetchMock.mockImplementation((input) => {
      const href = String(input);
      if (href.startsWith("/api/brief")) {
        return Promise.resolve(jsonResponse(planFor()));
      }
      adRequest += 1;
      if (adRequest === 1) {
        return Promise.resolve(imageResponse("image/png", false));
      }
      if (adRequest <= AD_RUN_SIZE) return Promise.resolve(imageResponse());
      return retry.promise;
    });
    const { result } = renderHook(() => useAdMaker());
    const start = atPhase(result.current, "idle").start;

    await act(() => start("stripe.com"));
    await waitFor(() => expect(result.current.phase).toBe("done"));

    act(() => atPhase(result.current, "done").retrySlot(0));
    expect(result.current.phase).toBe("done");
    expect(atPhase(result.current, "done").slots[0].status).toBe("loading");

    await act(async () => retry.resolve(imageResponse("image/webp")));
    await waitFor(() =>
      expect(atPhase(result.current, "done").slots[0].status).toBe("done"),
    );
  });

  it("revokes every owned object URL on unmount", async () => {
    fetchMock.mockImplementation((input) =>
      String(input).startsWith("/api/brief")
        ? Promise.resolve(jsonResponse(planFor()))
        : Promise.resolve(imageResponse()),
    );
    const { result, unmount } = renderHook(() => useAdMaker());
    const start = atPhase(result.current, "idle").start;

    await act(() => start("stripe.com"));
    await waitFor(() => expect(result.current.phase).toBe("done"));
    expect(createObjectURL).toHaveBeenCalledTimes(AD_RUN_SIZE);

    unmount();
    expect(new Set(revokeObjectURL.mock.calls.map(([url]) => url))).toEqual(
      new Set(
        Array.from(
          { length: AD_RUN_SIZE },
          (_, index) => `blob:ad-${index + 1}`,
        ),
      ),
    );
  });
});
