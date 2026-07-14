import { EventEmitter } from "node:events";
import type { RequestOptions } from "node:https";
import type { LookupFunction } from "node:net";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nodeMocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  httpRequest: vi.fn(),
  httpsRequest: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({ lookup: nodeMocks.lookup }));
vi.mock("node:http", () => ({ request: nodeMocks.httpRequest }));
vi.mock("node:https", () => ({ request: nodeMocks.httpsRequest }));

import { fetchPublicRaster } from "./public-raster";

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1,
]);

describe("production public-raster Node adapter", () => {
  beforeEach(() => {
    nodeMocks.lookup.mockReset();
    nodeMocks.httpRequest.mockReset();
    nodeMocks.httpsRequest.mockReset();
  });

  it("passes the vetted IP lookup and original hostname SNI to https.request", async () => {
    const pinned = { address: "93.184.216.34", family: 4 as const };
    nodeMocks.lookup.mockResolvedValue([pinned]);
    nodeMocks.httpsRequest.mockImplementation(
      (
        _target: URL,
        _options: RequestOptions,
        callback: (response: Readable & {
          statusCode: number;
          headers: Record<string, string>;
          destroy(): void;
        }) => void,
      ) => {
        const response = Object.assign(Readable.from([PNG]), {
          statusCode: 200,
          headers: { "content-type": "image/png" },
        });
        const request = Object.assign(new EventEmitter(), {
          setTimeout: vi.fn(),
          destroy: vi.fn(),
          end: vi.fn(() => callback(response)),
        });
        return request;
      },
    );

    await expect(
      fetchPublicRaster("https://assets.example/logo.png"),
    ).resolves.toEqual({ bytes: PNG, mediaType: "image/png" });

    expect(nodeMocks.lookup).toHaveBeenCalledWith("assets.example", {
      all: true,
      verbatim: true,
    });
    expect(nodeMocks.httpsRequest).toHaveBeenCalledOnce();
    const [target, options] = nodeMocks.httpsRequest.mock.calls[0] as [
      URL,
      RequestOptions,
    ];
    expect(target.href).toBe("https://assets.example/logo.png");
    expect(options).toMatchObject({
      agent: false,
      family: 4,
      servername: "assets.example",
    });

    const resolved = await new Promise<{ address: string; family: number }>(
      (resolve, reject) => {
        (options.lookup as LookupFunction)(
          "rebinding.example",
          { all: false },
          (error, address, family) => {
            if (error) reject(error);
            else if (typeof address === "string" && family !== undefined) {
              resolve({ address, family });
            } else {
              reject(new Error("Expected one pinned address"));
            }
          },
        );
      },
    );
    expect(resolved).toEqual(pinned);
    expect(nodeMocks.httpRequest).not.toHaveBeenCalled();
  });
});
