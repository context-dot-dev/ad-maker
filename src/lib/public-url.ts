/** Parse a syntactically safe public HTTP(S) URL; DNS policy is applied separately. */
export function parsePublicHttpUrl(raw: string | URL): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== (url.protocol === "http:" ? "80" : "443")) return null;

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (
    !hostname ||
    /^\d+(?:\.\d+){3}$/.test(hostname) ||
    hostname.includes(":") ||
    /^(?:localhost|.*\.(?:localhost|local|internal))$/i.test(hostname)
  ) {
    return null;
  }

  url.hash = "";
  return url;
}
