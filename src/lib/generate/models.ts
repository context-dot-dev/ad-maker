import {
  AD_PRIMARY_MODEL_COUNT,
  AD_RUN_SIZE,
  type Six,
} from "@/lib/ad-run-policy";

export type ImageModelTier = "primary" | "secondary";

/** Cross-runtime Image Model catalog. Capabilities live with the model record. */
export const IMAGE_MODELS = [
  {
    id: "openai/gpt-image-1",
    tier: "primary",
    displayName: "GPT Image 1",
    rasterLogo: true,
  },
  {
    id: "openai/gpt-image-2",
    tier: "primary",
    displayName: "GPT Image 2",
    rasterLogo: true,
  },
  {
    id: "xai/grok-imagine-image",
    tier: "primary",
    displayName: "Grok Imagine",
    rasterLogo: true,
  },
  {
    id: "google/imagen-4.0-generate-001",
    tier: "secondary",
    displayName: "Imagen 4",
    rasterLogo: false,
  },
  {
    id: "bytedance/seedream-4.5",
    tier: "secondary",
    displayName: "Seedream 4.5",
    rasterLogo: true,
  },
  {
    id: "recraft/recraft-v4.1",
    tier: "secondary",
    displayName: "Recraft V4.1",
    rasterLogo: false,
  },
] as const satisfies readonly {
  id: string;
  tier: ImageModelTier;
  displayName: string;
  rasterLogo: boolean;
}[];

export type ImageModel = (typeof IMAGE_MODELS)[number];
export type ImageModelId = ImageModel["id"];

const imageModelCount: typeof AD_RUN_SIZE = IMAGE_MODELS.length;

export const IMAGE_MODEL_IDS = IMAGE_MODELS.map(({ id }) => id) as [
  ImageModelId,
  ...ImageModelId[],
];

export function imageModelById(id: string): ImageModel | undefined {
  return IMAGE_MODELS.find((model) => model.id === id);
}

export function imageModelsByTier(tier: ImageModelTier): readonly ImageModel[] {
  return IMAGE_MODELS.filter((model) => model.tier === tier);
}

const primaryModelCount = imageModelsByTier("primary").length;
if (primaryModelCount !== AD_PRIMARY_MODEL_COUNT) {
  throw new Error(
    `Expected ${AD_PRIMARY_MODEL_COUNT} primary Image Models, received ${primaryModelCount}`,
  );
}

/** Assign every Image Model once, with primary placements before secondary ones. */
export function assignImageModels(
  random: () => number = Math.random,
): Six<ImageModelId> {
  const shuffle = (models: readonly ImageModel[]) => {
    const result = [...models];
    for (let index = result.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  };

  const assigned = [
    ...shuffle(imageModelsByTier("primary")),
    ...shuffle(imageModelsByTier("secondary")),
  ].map(({ id }) => id);
  if (assigned.length !== imageModelCount) {
    throw new Error(`Expected ${imageModelCount} Image Models, received ${assigned.length}`);
  }
  return assigned as unknown as Six<ImageModelId>;
}
