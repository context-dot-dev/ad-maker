import { describe, expect, it } from "vitest";
import { classifyGatewayImageError } from "./gateway";

describe("Gateway image error normalization", () => {
  it("downgrades explicit image-input rejection before considering a 5xx transient", () => {
    const error = Object.assign(new Error("Image editing failed: input image unsupported"), {
      status: 500,
    });

    expect(classifyGatewayImageError(error, true)).toEqual({
      kind: "image_input_rejected",
    });
  });

  it("treats a provider's bare 404 as image rejection only when a logo was attached", () => {
    const error = Object.assign(new Error("Not Found"), { status: 404 });

    expect(classifyGatewayImageError(error, true)).toEqual({
      kind: "image_input_rejected",
    });
    expect(classifyGatewayImageError(error, false)).toEqual({ kind: "nontransient" });
  });

  it.each([
    Object.assign(new Error("upstream failed"), { status: 503 }),
    { cause: Object.assign(new Error("rate limited"), { statusCode: 429 }) },
    new Error("socket hang up"),
  ])("normalizes transient failures", (error) => {
    expect(classifyGatewayImageError(error, false)).toEqual({ kind: "transient" });
  });

  it("normalizes cancellation and nontransient rejection", () => {
    const controller = new AbortController();
    controller.abort();

    expect(classifyGatewayImageError(new Error("anything"), false, controller.signal)).toEqual({
      kind: "aborted",
    });
    expect(
      classifyGatewayImageError(
        Object.assign(new Error("unauthorized"), { status: 401 }),
        false,
      ),
    ).toEqual({ kind: "nontransient" });
  });
});
