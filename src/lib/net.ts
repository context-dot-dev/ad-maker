/** Light SSRF guards for user-supplied domains / asset URLs. */

const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[?::1\]?)$/i;

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
  if (!DOMAIN_RE.test(host) || PRIVATE_HOST.test(host)) return null;
  return host;
}

/** True when a URL is a plausible public http(s) asset we may fetch server-side. */
export function isPublicUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (PRIVATE_HOST.test(u.hostname)) return false;
    // Reject raw IPv4/IPv6 hosts entirely — brand CDNs always use hostnames.
    if (/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.includes(":")) return false;
    return true;
  } catch {
    return false;
  }
}
