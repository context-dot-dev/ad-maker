import { describe, expect, it } from "vitest";
import { describeColor, pickBrandColors } from "./colors";

describe("brand prompt colors", () => {
  it("describes valid three- and six-digit colors without leaking hex", () => {
    expect(describeColor("#fff")).toBe("off-white");
    expect(describeColor("#000000")).toBe("near-black");
    expect(describeColor("#543cfc")).not.toContain("#");
  });

  it("rejects trailing data and alpha channels", () => {
    expect(describeColor("#ffffffjunk")).toBe("deep navy");
    expect(describeColor("#00000000")).toBe("deep navy");
  });

  it("chooses two distinct descriptive colors when possible", () => {
    const colors = pickBrandColors([{ hex: "#ff0000" }, { hex: "#0000ff" }]);

    expect(colors.a).not.toBe(colors.b);
    expect(colors.a).not.toContain("#");
    expect(colors.b).not.toContain("#");
  });
});
