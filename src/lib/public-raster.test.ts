import { describe, expect, it, vi } from "vitest";
import {
  createPublicRasterFetcher,
  type PublicRasterFetcherDependencies,
} from "./public-raster";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1,
]);

async function* chunks(...values: Uint8Array[]) {
  yield* values;
}

function hop(
  statusCode: number,
  headers: Record<string, string> = {},
  values: Uint8Array[] = [],
) {
  return {
    statusCode,
    headers,
    body: chunks(...values),
    close: vi.fn(),
  };
}

function dependencies(
  addresses: readonly { address: string; family: 4 | 6 }[] = [
    { address: "93.184.216.34", family: 4 },
  ],
  response = hop(200, { "content-type": "image/png" }, [PNG]),
) {
  return {
    resolveHost: vi.fn(async () => addresses),
    requestHop: vi.fn(async () => response),
  } satisfies PublicRasterFetcherDependencies;
}

describe("fetchPublicRaster policy", () => {
  it("returns a verified raster and passes the vetted address to the pinned request", async () => {
    const deps = dependencies();
    const fetchRaster = createPublicRasterFetcher(deps);

    const raster = await fetchRaster("https://assets.example/logo.png#ignored");

    expect(raster).toEqual({ bytes: PNG, mediaType: "image/png" });
    expect(deps.resolveHost).toHaveBeenCalledWith("assets.example", expect.any(AbortSignal));
    expect(deps.requestHop).toHaveBeenCalledWith(
      new URL("https://assets.example/logo.png"),
      { address: "93.184.216.34", family: 4 },
      expect.any(AbortSignal),
    );
    expect(deps.requestHop.mock.results[0]).toBeDefined();
  });

  it.each([
    "file:///tmp/logo.png",
    "https://user:secret@assets.example/logo.png",
    "https://127.0.0.1/logo.png",
    "https://[::1]/logo.png",
    "https://assets.example:8443/logo.png",
    "http://assets.example:443/logo.png",
    "https://logo.local/image.png",
  ])("rejects an invalid target before DNS: %s", async (url) => {
    const deps = dependencies();
    const fetchRaster = createPublicRasterFetcher(deps);

    await expect(fetchRaster(url)).resolves.toBeNull();
    expect(deps.resolveHost).not.toHaveBeenCalled();
    expect(deps.requestHop).not.toHaveBeenCalled();
  });

  it.each([
    { address: "0.1.2.3", family: 4 as const },
    { address: "10.0.0.1", family: 4 as const },
    { address: "100.64.0.1", family: 4 as const },
    { address: "127.0.0.1", family: 4 as const },
    { address: "169.254.1.1", family: 4 as const },
    { address: "172.16.0.1", family: 4 as const },
    { address: "192.168.1.1", family: 4 as const },
    { address: "198.18.0.1", family: 4 as const },
    { address: "203.0.113.1", family: 4 as const },
    { address: "224.0.0.1", family: 4 as const },
    { address: "240.0.0.1", family: 4 as const },
    { address: "::1", family: 6 as const },
    { address: "fc00::1", family: 6 as const },
    { address: "fe80::1", family: 6 as const },
    { address: "ff02::1", family: 6 as const },
    { address: "2001:db8::1", family: 6 as const },
    { address: "3ffe::1", family: 6 as const },
    { address: "::ffff:127.0.0.1", family: 6 as const },
  ])("rejects non-public DNS address $address", async (address) => {
    const deps = dependencies([address]);
    const fetchRaster = createPublicRasterFetcher(deps);

    await expect(fetchRaster("https://assets.example/logo.png")).resolves.toBeNull();
    expect(deps.requestHop).not.toHaveBeenCalled();
  });

  it("rejects a hostname when any returned address is non-public", async () => {
    const deps = dependencies([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ]);

    await expect(
      createPublicRasterFetcher(deps)("https://assets.example/logo.png"),
    ).resolves.toBeNull();
    expect(deps.requestHop).not.toHaveBeenCalled();
  });

  it("allows a mapped IPv4 address only when the embedded address is public", async () => {
    const deps = dependencies([{ address: "::ffff:93.184.216.34", family: 6 }]);

    await expect(
      createPublicRasterFetcher(deps)("http://assets.example/logo.png"),
    ).resolves.toMatchObject({ mediaType: "image/png" });
    expect(deps.requestHop).toHaveBeenCalledOnce();
  });

  it("revalidates DNS and pins a new address after every redirect", async () => {
    const first = hop(302, { location: "https://cdn.example/final.png" });
    const second = hop(200, { "content-type": "image/png" }, [PNG]);
    const resolveHost = vi.fn(async (hostname: string) =>
      hostname === "assets.example"
        ? [{ address: "93.184.216.34", family: 4 as const }]
        : [{ address: "1.1.1.1", family: 4 as const }],
    );
    const requestHop = vi
      .fn<PublicRasterFetcherDependencies["requestHop"]>()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const result = await createPublicRasterFetcher({ resolveHost, requestHop })(
      "https://assets.example/logo.png",
    );

    expect(result?.mediaType).toBe("image/png");
    expect(resolveHost.mock.calls.map(([hostname]) => hostname)).toEqual([
      "assets.example",
      "cdn.example",
    ]);
    expect(requestHop.mock.calls[1][1]).toEqual({ address: "1.1.1.1", family: 4 });
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).toHaveBeenCalledOnce();
  });

  it("does not follow more than three redirects", async () => {
    const responses = Array.from({ length: 4 }, (_, index) =>
      hop(302, { location: `https://hop-${index + 1}.example/logo.png` }),
    );
    const deps = dependencies();
    deps.requestHop
      .mockResolvedValueOnce(responses[0])
      .mockResolvedValueOnce(responses[1])
      .mockResolvedValueOnce(responses[2])
      .mockResolvedValueOnce(responses[3]);

    await expect(
      createPublicRasterFetcher(deps)("https://hop-0.example/logo.png"),
    ).resolves.toBeNull();
    expect(deps.requestHop).toHaveBeenCalledTimes(4);
  });

  it("blocks a redirect whose new DNS result is private", async () => {
    const resolveHost = vi.fn(async (hostname: string) => [
      {
        address: hostname === "assets.example" ? "93.184.216.34" : "127.0.0.1",
        family: 4 as const,
      },
    ]);
    const requestHop = vi.fn(async () =>
      hop(302, { location: "http://internal.example/secret.png" }),
    );

    await expect(
      createPublicRasterFetcher({ resolveHost, requestHop })("https://assets.example/logo.png"),
    ).resolves.toBeNull();
    expect(requestHop).toHaveBeenCalledOnce();
  });

  it.each([
    ["image/png", PNG],
    ["image/jpeg", JPEG],
    ["image/webp", WEBP],
  ] as const)("accepts %s only when its magic bytes match", async (mediaType, bytes) => {
    const deps = dependencies(
      undefined,
      hop(200, { "content-type": `${mediaType}; charset=binary` }, [bytes]),
    );

    await expect(
      createPublicRasterFetcher(deps)("https://assets.example/logo"),
    ).resolves.toEqual({ bytes, mediaType });
  });

  it("rejects a media type and magic-byte mismatch", async () => {
    const deps = dependencies(
      undefined,
      hop(200, { "content-type": "image/png" }, [JPEG]),
    );

    await expect(
      createPublicRasterFetcher(deps)("https://assets.example/logo.png"),
    ).resolves.toBeNull();
  });

  it("rejects an oversized Content-Length before consuming the body", async () => {
    let consumed = false;
    async function* body() {
      consumed = true;
      yield PNG;
    }
    const response = {
      statusCode: 200,
      headers: {
        "content-type": "image/png",
        "content-length": String(8 * 1024 * 1024 + 1),
      },
      body: body(),
      close: vi.fn(),
    };
    const deps = dependencies(undefined, response);

    await expect(
      createPublicRasterFetcher(deps)("https://assets.example/logo.png"),
    ).resolves.toBeNull();
    expect(consumed).toBe(false);
  });

  it("stops a streamed response once it exceeds eight MiB", async () => {
    const deps = dependencies(
      undefined,
      hop(200, { "content-type": "image/png" }, [PNG, new Uint8Array(8 * 1024 * 1024)]),
    );

    await expect(
      createPublicRasterFetcher(deps)("https://assets.example/logo.png"),
    ).resolves.toBeNull();
  });

  it("soft-fails dependency errors and caller aborts", async () => {
    const failed = dependencies();
    failed.resolveHost.mockRejectedValue(new Error("DNS failed"));
    await expect(
      createPublicRasterFetcher(failed)("https://assets.example/logo.png"),
    ).resolves.toBeNull();

    const aborted = dependencies();
    const controller = new AbortController();
    controller.abort();
    await expect(
      createPublicRasterFetcher(aborted)("https://assets.example/logo.png", controller.signal),
    ).resolves.toBeNull();
    expect(aborted.resolveHost).not.toHaveBeenCalled();
  });
});
