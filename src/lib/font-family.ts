import { AD_RUN_LIMITS } from "@/lib/ad-run-policy";

const SAFE_FONT_FAMILY = /^[\p{L}\p{N}][\p{L}\p{N} .,'&()+-]*$/u;

/** Keep externally extracted font names bounded and inert inside image prompts. */
export function normalizeFontFamily(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const family = value.trim();
  if (
    family.length === 0 ||
    family.length > AD_RUN_LIMITS.fontFamily ||
    !SAFE_FONT_FAMILY.test(family)
  ) {
    return null;
  }
  return family;
}
