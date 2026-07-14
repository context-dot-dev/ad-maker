import {
  normalizeBrandColorHex,
  type BrandColor,
} from "@/lib/brand-color";
import {
  AD_PRIMARY_MODEL_COUNT,
  AD_RUN_LIMITS,
  AD_RUN_SIZE,
  type Six,
} from "@/lib/ad-run-policy";
import {
  CREATIVE_DIRECTION_KEYS,
  type CreativeDirectionKey,
} from "@/lib/generate/directions";
import {
  IMAGE_MODEL_IDS,
  imageModelById,
  type ImageModelId,
} from "@/lib/generate/models";
import { normalizeDomain } from "@/lib/net";
import { parsePublicHttpUrl } from "@/lib/public-url";

export {
  AD_PRIMARY_MODEL_COUNT,
  AD_RUN_LIMITS,
  AD_RUN_SIZE,
  type Six,
} from "@/lib/ad-run-policy";

export type { BrandColor } from "@/lib/brand-color";

export type AdBrief = {
  domain: string;
  brandName: string;
  description: string;
  industry: string;
  summary: string;
  mood: string;
  colorA: string;
  colorB: string;
  logoUrl: string | null;
  colors: BrandColor[];
};

export type PlannedConcept = {
  key: CreativeDirectionKey;
  model: ImageModelId;
  headline: string;
  subheadline: string;
};

export type AdRunPlan = {
  brief: AdBrief;
  concepts: Six<PlannedConcept>;
};

export type RenderedAdQuery = {
  domain: string;
  concept: CreativeDirectionKey;
  model: ImageModelId;
  headline: string;
  subheadline: string;
  brandName: string;
  colorA: string;
  colorB: string;
  summary: string;
  industry: string;
  mood: string;
  logoUrl: string | null;
  canonicalHref: string;
};

type RecordValue = Record<string, unknown>;

const DIRECTIONS = new Set<string>(CREATIVE_DIRECTION_KEYS);
const MODELS = new Set<string>(IMAGE_MODEL_IDS);

function invalid(message: string): never {
  throw new Error(`Invalid Ad Run contract: ${message}`);
}

function record(value: unknown, name: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid(`${name} must be an object`);
  }
  return value as RecordValue;
}

function onlyKeys(value: RecordValue, allowed: readonly string[], name: string): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unknown) invalid(`${name} contains unknown field ${unknown}`);
}

function text(
  value: unknown,
  name: string,
  options: { min?: number; max: number; trim?: boolean },
): string {
  if (typeof value !== "string") invalid(`${name} must be a string`);
  const parsed = options.trim ? value.trim() : value;
  if (parsed.length < (options.min ?? 0) || parsed.length > options.max) {
    invalid(`${name} has an invalid length`);
  }
  return parsed;
}

function words(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function canonicalDomain(value: unknown): string {
  const domain = text(value, "domain", { min: 1, max: AD_RUN_LIMITS.domain });
  if (normalizeDomain(domain) !== domain) invalid("domain must be canonical");
  return domain;
}

function publicHttpUrl(value: unknown, name: string): string {
  const raw = text(value, name, { min: 1, max: AD_RUN_LIMITS.logoUrl });
  const normalized = parsePublicHttpUrl(raw);
  if (!normalized) invalid(`${name} must be a public HTTP(S) URL`);
  return normalized.href;
}

function decodeColor(value: unknown, index: number): BrandColor {
  const color = record(value, `colors[${index}]`);
  onlyKeys(color, ["hex", "name"], `colors[${index}]`);
  const hex = text(color.hex, `colors[${index}].hex`, { min: 1, max: 7 });
  if (normalizeBrandColorHex(hex) !== hex) invalid(`colors[${index}].hex is invalid`);

  const name =
    color.name === null
      ? null
      : text(color.name, `colors[${index}].name`, { max: AD_RUN_LIMITS.colorName });
  return { hex, name };
}

function decodeBrief(value: unknown): AdBrief {
  const brief = record(value, "brief");
  onlyKeys(
    brief,
    [
      "domain",
      "brandName",
      "description",
      "industry",
      "summary",
      "mood",
      "colorA",
      "colorB",
      "logoUrl",
      "colors",
    ],
    "brief",
  );

  if (!Array.isArray(brief.colors) || brief.colors.length > AD_RUN_LIMITS.palette) {
    invalid("brief.colors must contain at most eight colors");
  }

  return {
    domain: canonicalDomain(brief.domain),
    brandName: text(brief.brandName, "brief.brandName", {
      min: 1,
      max: AD_RUN_LIMITS.brandName,
      trim: true,
    }),
    description: text(brief.description, "brief.description", {
      max: AD_RUN_LIMITS.description,
    }),
    industry: text(brief.industry, "brief.industry", { max: AD_RUN_LIMITS.industry }),
    summary: text(brief.summary, "brief.summary", { max: AD_RUN_LIMITS.summary }),
    mood: text(brief.mood, "brief.mood", {
      min: 1,
      max: AD_RUN_LIMITS.mood,
      trim: true,
    }),
    colorA: text(brief.colorA, "brief.colorA", {
      min: 1,
      max: AD_RUN_LIMITS.promptColor,
      trim: true,
    }),
    colorB: text(brief.colorB, "brief.colorB", {
      min: 1,
      max: AD_RUN_LIMITS.promptColor,
      trim: true,
    }),
    logoUrl: brief.logoUrl === null ? null : publicHttpUrl(brief.logoUrl, "brief.logoUrl"),
    colors: brief.colors.map(decodeColor),
  };
}

function direction(value: unknown): CreativeDirectionKey {
  const key = text(value, "concept.key", {
    min: 1,
    max: AD_RUN_LIMITS.directionKey,
  });
  if (!DIRECTIONS.has(key)) invalid("concept.key is unknown");
  return key as CreativeDirectionKey;
}

function imageModel(value: unknown): ImageModelId {
  const model = text(value, "concept.model", {
    min: 1,
    max: AD_RUN_LIMITS.imageModelId,
  });
  if (!MODELS.has(model)) invalid("concept.model is unknown");
  return model as ImageModelId;
}

function decodeConcept(value: unknown): PlannedConcept {
  const concept = record(value, "concept");
  onlyKeys(concept, ["key", "model", "headline", "subheadline"], "concept");
  const headline = text(concept.headline, "concept.headline", {
    min: 1,
    max: AD_RUN_LIMITS.headline,
    trim: true,
  });
  const subheadline = text(concept.subheadline, "concept.subheadline", {
    max: AD_RUN_LIMITS.subheadline,
    trim: true,
  });
  if (words(headline) > AD_RUN_LIMITS.headlineWords) {
    invalid("concept.headline contains too many words");
  }
  if (words(subheadline) > AD_RUN_LIMITS.subheadlineWords) {
    invalid("concept.subheadline contains too many words");
  }

  return {
    key: direction(concept.key),
    model: imageModel(concept.model),
    headline,
    subheadline,
  };
}

export function decodeAdRunPlan(value: unknown): AdRunPlan {
  const plan = record(value, "Ad Run");
  onlyKeys(plan, ["brief", "concepts"], "Ad Run");
  if (!Array.isArray(plan.concepts) || plan.concepts.length !== AD_RUN_SIZE) {
    invalid(`an Ad Run must contain exactly ${AD_RUN_SIZE} Planned Concepts`);
  }

  const concepts = plan.concepts.map(decodeConcept);
  if (new Set(concepts.map(({ key }) => key)).size !== AD_RUN_SIZE) {
    invalid("an Ad Run must contain distinct Creative Directions");
  }
  if (new Set(concepts.map(({ model }) => model)).size !== AD_RUN_SIZE) {
    invalid("an Ad Run must contain distinct Image Models");
  }
  concepts.forEach(({ model }, index) => {
    const expectedTier = index < AD_PRIMARY_MODEL_COUNT ? "primary" : "secondary";
    if (imageModelById(model)?.tier !== expectedTier) {
      invalid(`${expectedTier} Image Model required in slot ${index + 1}`);
    }
  });

  return {
    brief: decodeBrief(plan.brief),
    concepts: concepts as unknown as Six<PlannedConcept>,
  };
}

const RENDERED_AD_QUERY_KEYS = [
  "domain",
  "concept",
  "model",
  "headline",
  "sub",
  "name",
  "colorA",
  "colorB",
  "summary",
  "industry",
  "mood",
  "logo",
] as const;

function encodeRenderedAdQuery(query: Omit<RenderedAdQuery, "canonicalHref">): string {
  const params = new URLSearchParams({
    domain: query.domain,
    concept: query.concept,
    model: query.model,
    headline: query.headline,
    sub: query.subheadline,
    name: query.brandName,
    colorA: query.colorA,
    colorB: query.colorB,
    summary: query.summary,
    industry: query.industry,
    mood: query.mood,
  });
  if (query.logoUrl) params.set("logo", query.logoUrl);
  return `/api/ad?${params.toString()}`;
}

/** Canonical GET URL for the CDN-cached Brief. */
export function briefHref(rawDomain: string): string {
  const domain = normalizeDomain(rawDomain);
  if (!domain) invalid("Brief domain is invalid");
  return `/api/brief?${new URLSearchParams({ domain }).toString()}`;
}

/** Canonical GET URL for one CDN-cached Rendered Ad. */
export function renderedAdHref(brief: AdBrief, concept: PlannedConcept): string {
  const validBrief = decodeBrief(brief);
  const validConcept = decodeConcept(concept);
  return encodeRenderedAdQuery({
    domain: validBrief.domain,
    concept: validConcept.key,
    model: validConcept.model,
    headline: validConcept.headline,
    subheadline: validConcept.subheadline,
    brandName: validBrief.brandName,
    colorA: validBrief.colorA,
    colorB: validBrief.colorB,
    summary: validBrief.summary,
    industry: validBrief.industry,
    mood: validBrief.mood,
    logoUrl: validBrief.logoUrl,
  });
}

function searchParamsFrom(input: URL | URLSearchParams | string): URLSearchParams {
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  if (input instanceof URL) return new URLSearchParams(input.searchParams);
  if (input.startsWith("/") || input.includes("://")) {
    return new URL(input, "https://branda.invalid").searchParams;
  }
  return new URLSearchParams(input.startsWith("?") ? input.slice(1) : input);
}

function requiredParameter(params: URLSearchParams, name: string): string {
  const values = params.getAll(name);
  if (values.length !== 1) invalid(`${name} must appear exactly once`);
  return values[0];
}

/** Decode and validate the public query used to render an Ad. */
export function decodeRenderedAdQuery(input: URL | URLSearchParams | string): RenderedAdQuery {
  const params = searchParamsFrom(input);
  for (const key of new Set(params.keys())) {
    if (!(RENDERED_AD_QUERY_KEYS as readonly string[]).includes(key)) {
      invalid(`unknown Rendered Ad parameter ${key}`);
    }
    if (params.getAll(key).length !== 1) invalid(`${key} must appear exactly once`);
  }

  const query = {
    domain: canonicalDomain(requiredParameter(params, "domain")),
    concept: direction(requiredParameter(params, "concept")),
    model: imageModel(requiredParameter(params, "model")),
    headline: decodeConcept({
      key: requiredParameter(params, "concept"),
      model: requiredParameter(params, "model"),
      headline: requiredParameter(params, "headline"),
      subheadline: requiredParameter(params, "sub"),
    }).headline,
    subheadline: text(requiredParameter(params, "sub"), "sub", {
      max: AD_RUN_LIMITS.subheadline,
      trim: true,
    }),
    brandName: text(requiredParameter(params, "name"), "name", {
      min: 1,
      max: AD_RUN_LIMITS.brandName,
      trim: true,
    }),
    colorA: text(requiredParameter(params, "colorA"), "colorA", {
      min: 1,
      max: AD_RUN_LIMITS.promptColor,
      trim: true,
    }),
    colorB: text(requiredParameter(params, "colorB"), "colorB", {
      min: 1,
      max: AD_RUN_LIMITS.promptColor,
      trim: true,
    }),
    summary: text(requiredParameter(params, "summary"), "summary", {
      max: AD_RUN_LIMITS.summary,
    }),
    industry: text(requiredParameter(params, "industry"), "industry", {
      max: AD_RUN_LIMITS.industry,
    }),
    mood: text(requiredParameter(params, "mood"), "mood", {
      min: 1,
      max: AD_RUN_LIMITS.mood,
      trim: true,
    }),
    logoUrl: params.has("logo") ? publicHttpUrl(requiredParameter(params, "logo"), "logo") : null,
  };

  return { ...query, canonicalHref: encodeRenderedAdQuery(query) };
}
