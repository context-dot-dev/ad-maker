import { expect, test } from "vitest";
import {
  CREATIVE_DIRECTIONS,
  directionByKey,
  type CreativeDirectionKey,
} from "./directions";
import {
  IMAGE_MODELS,
  assignImageModels,
  imageModelById,
  imageModelsByTier,
  type ImageModelId,
} from "./models";

test("direction metadata is the source of typed keys and lookup results", () => {
  const key: CreativeDirectionKey = "typographic";
  expect(CREATIVE_DIRECTIONS).toHaveLength(12);
  expect(directionByKey(key)?.label).toBe("Type Poster");
  expect(directionByKey("not-a-direction")).toBeUndefined();
});

test("Image Model records own tier, display name, and raster-logo capability", () => {
  const id: ImageModelId = "openai/gpt-image-2";
  expect(IMAGE_MODELS).toHaveLength(6);
  expect(imageModelsByTier("primary")).toHaveLength(3);
  expect(imageModelsByTier("secondary")).toHaveLength(3);
  expect(imageModelById(id)).toEqual({
    id,
    tier: "primary",
    displayName: "GPT Image 2",
    rasterLogo: true,
  });
  expect(imageModelById("not-a-model")).toBeUndefined();
});

test("Image Model assignment is unique and primary-first", () => {
  const assigned = assignImageModels(() => 0);

  expect(new Set(assigned).size).toBe(IMAGE_MODELS.length);
  expect(
    assigned.slice(0, 3).every((id) => imageModelById(id)?.tier === "primary"),
  ).toBe(true);
  expect(
    assigned.slice(3).every((id) => imageModelById(id)?.tier === "secondary"),
  ).toBe(true);
});
