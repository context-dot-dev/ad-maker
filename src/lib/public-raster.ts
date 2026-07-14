import { lookup as dnsLookup } from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { parsePublicHttpUrl } from "@/lib/public-url";

export type PublicRaster = {
  bytes: Uint8Array;
  mediaType: "image/png" | "image/jpeg" | "image/webp";
};

type ResolvedAddress = { address: string; family: 4 | 6 };

type HopResponse = {
  statusCode: number;
  headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  body: AsyncIterable<Uint8Array>;
  close(): void;
};

/** Internal I/O seam exported only so the complete policy can be tested without the network. */
export type PublicRasterFetcherDependencies = {
  resolveHost(hostname: string, signal: AbortSignal): Promise<readonly ResolvedAddress[]>;
  requestHop(target: URL, pinned: ResolvedAddress, signal: AbortSignal): Promise<HopResponse>;
};

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const DEADLINE_MS = 8_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const MEDIA_TYPES = new Set<PublicRaster["mediaType"]>([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const ipv4 = (a: number, b: number, c: number, d: number) =>
  (((a << 24) >>> 0) + (b << 16) + (c << 8) + d) >>> 0;

const NON_PUBLIC_IPV4: ReadonlyArray<readonly [number, number]> = [
  [ipv4(0, 0, 0, 0), 8],
  [ipv4(10, 0, 0, 0), 8],
  [ipv4(100, 64, 0, 0), 10],
  [ipv4(127, 0, 0, 0), 8],
  [ipv4(169, 254, 0, 0), 16],
  [ipv4(172, 16, 0, 0), 12],
  // IETF protocol assignments. Reject the entire block conservatively.
  [ipv4(192, 0, 0, 0), 24],
  [ipv4(192, 0, 2, 0), 24],
  [ipv4(192, 31, 196, 0), 24],
  [ipv4(192, 52, 193, 0), 24],
  [ipv4(192, 88, 99, 0), 24],
  [ipv4(192, 168, 0, 0), 16],
  [ipv4(192, 175, 48, 0), 24],
  [ipv4(198, 18, 0, 0), 15],
  [ipv4(198, 51, 100, 0), 24],
  [ipv4(203, 0, 113, 0), 24],
  [ipv4(224, 0, 0, 0), 4],
  [ipv4(240, 0, 0, 0), 4],
];

function parseIpv4(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    result = ((result << 8) | octet) >>> 0;
  }
  return result;
}

function isPublicIpv4(value: string): boolean {
  const address = parseIpv4(value);
  if (address === null) return false;
  return !NON_PUBLIC_IPV4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return ((address & mask) >>> 0) === ((base & mask) >>> 0);
  });
}

function parseIpv6(input: string): Uint16Array | null {
  let value = input.toLowerCase();
  if (value.includes("%")) return null;

  const ipv4Tail = value.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  if (ipv4Tail) {
    const parsed = parseIpv4(ipv4Tail);
    if (parsed === null) return null;
    value = `${value.slice(0, -ipv4Tail.length)}${(parsed >>> 16).toString(16)}:${(parsed & 0xffff).toString(16)}`;
  }

  if ((value.match(/::/g) ?? []).length > 1) return null;
  const compressed = value.includes("::");
  const [left = "", right = ""] = compressed ? value.split("::") : [value, ""];
  const leftParts = left ? left.split(":") : [];
  const rightParts = right ? right.split(":") : [];
  const explicitCount = leftParts.length + rightParts.length;
  if ((compressed && explicitCount >= 8) || (!compressed && explicitCount !== 8)) return null;

  const parts = compressed
    ? [...leftParts, ...Array<string>(8 - explicitCount).fill("0"), ...rightParts]
    : leftParts;
  if (parts.length !== 8) return null;

  const words = new Uint16Array(8);
  for (let index = 0; index < parts.length; index++) {
    if (!/^[0-9a-f]{1,4}$/.test(parts[index])) return null;
    words[index] = Number.parseInt(parts[index], 16);
  }
  return words;
}

function matchesIpv6Prefix(words: Uint16Array, prefix: readonly number[], bits: number): boolean {
  const wholeWords = Math.floor(bits / 16);
  for (let index = 0; index < wholeWords; index++) {
    if (words[index] !== (prefix[index] ?? 0)) return false;
  }
  const remaining = bits % 16;
  if (remaining === 0) return true;
  const mask = (0xffff << (16 - remaining)) & 0xffff;
  return (words[wholeWords] & mask) === ((prefix[wholeWords] ?? 0) & mask);
}

function isPublicIpv6(value: string): boolean {
  const words = parseIpv6(value);
  if (!words) return false;

  const isMapped =
    words[0] === 0 &&
    words[1] === 0 &&
    words[2] === 0 &&
    words[3] === 0 &&
    words[4] === 0 &&
    words[5] === 0xffff;
  if (isMapped) {
    const mapped = (((words[6] << 16) >>> 0) + words[7]) >>> 0;
    return isPublicIpv4(
      `${mapped >>> 24}.${(mapped >>> 16) & 255}.${(mapped >>> 8) & 255}.${mapped & 255}`,
    );
  }

  // Currently allocated global unicast space is 2000::/3. Reject everything
  // else (ULA, link-local, multicast, unspecified, and unallocated space).
  if ((words[0] & 0xe000) !== 0x2000) return false;

  const special: ReadonlyArray<readonly [readonly number[], number]> = [
    [[0x2001, 0x0000], 23], // IETF protocol assignments
    [[0x2001, 0x0db8], 32], // documentation
    [[0x2002], 16], // 6to4
    [[0x3ffe], 16], // former 6bone allocation, returned to IANA
    [[0x3fff, 0x0000], 20], // documentation
  ];
  return !special.some(([prefix, bits]) => matchesIpv6Prefix(words, prefix, bits));
}

function isPublicAddress(address: ResolvedAddress): boolean {
  const family = isIP(address.address);
  if (family !== address.family) return false;
  return family === 4 ? isPublicIpv4(address.address) : isPublicIpv6(address.address);
}

function validateTarget(raw: string | URL): URL | null {
  return parsePublicHttpUrl(raw);
}

function singleHeader(
  headers: HopResponse["headers"],
  wantedName: string,
): string | undefined | null {
  const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === wantedName);
  if (!entry) return undefined;
  const value = entry[1];
  if (Array.isArray(value)) return value.length === 1 ? value[0] : null;
  return value as string | undefined;
}

function parseContentLength(headers: HopResponse["headers"]): number | undefined | null {
  const value = singleHeader(headers, "content-length");
  if (value === undefined) return undefined;
  if (value === null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function matchesMagic(bytes: Uint8Array, mediaType: PublicRaster["mediaType"]): boolean {
  if (mediaType === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return png.every((byte, index) => bytes[index] === byte);
  }
  if (mediaType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason ?? new Error("Aborted"));
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new Error("Aborted"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

async function readRaster(
  response: HopResponse,
  signal: AbortSignal,
): Promise<PublicRaster | null> {
  const rawMediaType = singleHeader(response.headers, "content-type");
  if (typeof rawMediaType !== "string") return null;
  const mediaType = rawMediaType.split(";", 1)[0].trim().toLowerCase();
  if (!MEDIA_TYPES.has(mediaType as PublicRaster["mediaType"])) return null;

  const expectedLength = parseContentLength(response.headers);
  if (
    expectedLength === null ||
    (expectedLength !== undefined && (expectedLength === 0 || expectedLength > MAX_BYTES))
  ) {
    return null;
  }

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  for await (const chunk of response.body) {
    if (signal.aborted) throw signal.reason ?? new Error("Aborted");
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    byteLength += bytes.byteLength;
    if (byteLength > MAX_BYTES) return null;
    chunks.push(bytes);
  }

  if (byteLength === 0 || (expectedLength !== undefined && byteLength !== expectedLength)) return null;
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const typedMediaType = mediaType as PublicRaster["mediaType"];
  return matchesMagic(bytes, typedMediaType) ? { bytes, mediaType: typedMediaType } : null;
}

async function resolveHost(hostname: string, signal: AbortSignal): Promise<readonly ResolvedAddress[]> {
  const records = await abortable(dnsLookup(hostname, { all: true, verbatim: true }), signal);
  return records
    .filter((record): record is { address: string; family: 4 | 6 } => record.family === 4 || record.family === 6)
    .map(({ address, family }) => ({ address, family }));
}

/** Node request options that preserve the URL host while pinning the vetted IP. */
function createPinnedRequestOptions(
  target: URL,
  pinned: ResolvedAddress,
  signal: AbortSignal,
): https.RequestOptions {
  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) callback(null, [pinned]);
    else callback(null, pinned.address, pinned.family);
  };

  return {
    method: "GET",
    agent: false,
    family: pinned.family,
    lookup: pinnedLookup,
    servername: target.protocol === "https:" ? target.hostname : undefined,
    signal,
    headers: {
      Accept: "image/png,image/jpeg,image/webp",
      Connection: "close",
      "User-Agent": "Branda/1.0 public-raster-fetcher",
    },
  };
}

function requestHop(
  target: URL,
  pinned: ResolvedAddress,
  signal: AbortSignal,
): Promise<HopResponse> {
  return new Promise((resolve, reject) => {
    const transport = target.protocol === "https:" ? https : http;
    const request = transport.request(
      target,
      createPinnedRequestOptions(target, pinned, signal),
      (response) => {
        resolve({
          statusCode: response.statusCode ?? 0,
          headers: response.headers,
          body: response,
          close: () => response.destroy(),
        });
      },
    );
    request.once("error", reject);
    request.setTimeout(DEADLINE_MS, () => request.destroy(new Error("Public raster request timed out")));
    request.end();
  });
}

export function createPublicRasterFetcher(dependencies: PublicRasterFetcherDependencies) {
  return async function fetchWithPolicy(
    rawUrl: string,
    callerSignal?: AbortSignal,
  ): Promise<PublicRaster | null> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error("Public raster fetch timed out")),
      DEADLINE_MS,
    );
    timeout.unref();
    const abortFromCaller = () => controller.abort(callerSignal?.reason ?? new Error("Aborted"));
    if (callerSignal?.aborted) abortFromCaller();
    else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });

    try {
      if (controller.signal.aborted) return null;
      let target = validateTarget(rawUrl);
      if (!target) return null;

      for (let redirects = 0; ; redirects++) {
        if (controller.signal.aborted) return null;
        const addresses = await abortable(
          dependencies.resolveHost(target.hostname, controller.signal),
          controller.signal,
        );
        if (addresses.length === 0 || addresses.some((address) => !isPublicAddress(address))) return null;

        const response = await abortable(
          dependencies.requestHop(target, addresses[0], controller.signal),
          controller.signal,
        );
        try {
          if (REDIRECT_STATUSES.has(response.statusCode)) {
            if (redirects >= MAX_REDIRECTS) return null;
            const location = singleHeader(response.headers, "location");
            if (typeof location !== "string") return null;
            target = validateTarget(new URL(location, target));
            if (!target) return null;
            continue;
          }

          if (response.statusCode < 200 || response.statusCode >= 300) return null;
          return await abortable(readRaster(response, controller.signal), controller.signal);
        } finally {
          response.close();
        }
      }
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    }
  };
}

export const fetchPublicRaster = createPublicRasterFetcher({ resolveHost, requestHop });
