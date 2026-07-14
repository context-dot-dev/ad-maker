/** Canonicalization policy for user-supplied Brand domains. */

import { AD_RUN_LIMITS } from "@/lib/ad-run-policy";

const PRIVATE_HOST =
  /^(localhost|.*\.localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[?::1\]?)$/i;

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

/** Normalize "https://www.stripe.com/pricing" → "stripe.com". Null when invalid/private. */
export function normalizeDomain(input: string): string | null {
  let host = input.trim().toLowerCase();
  try {
    host = new URL(host.includes("://") ? host : `https://${host}`).hostname;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, "");
  if (
    host.length > AD_RUN_LIMITS.domain ||
    /^\d+(?:\.\d+){3}$/.test(host) ||
    !DOMAIN_RE.test(host) ||
    PRIVATE_HOST.test(host)
  ) {
    return null;
  }
  return host;
}
