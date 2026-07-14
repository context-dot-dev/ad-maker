# Branda

Branda turns one Brand domain into a fixed Ad Run of on-brand images. This glossary names the planning, rendering, and Gallery concepts shared by the browser and server modules.

## Language

**Brand**:
The organization or product whose public site supplies the identity and source material for an Ad Run.

**Brief**:
The normalized Brand facts and descriptive visual attributes used throughout one Ad Run.
_Avoid_: Prompt, brand data

**Creative Direction**:
A named visual treatment with a dedicated prompt implementation.
_Avoid_: Style, template

**Planned Concept**:
One Creative Direction paired with Brand-grounded copy and an Image Model for an Ad Slot.
_Avoid_: Creative Direction

**Ad Run**:
A set of exactly six Planned Concepts generated together from one Brief.
_Avoid_: Campaign, batch

**Ad Slot**:
The rendering lifecycle and result of one Planned Concept within an Ad Run.

**Rendered Ad**:
The finished raster image produced for an Ad Slot.
_Avoid_: Asset, creative

**Image Model**:
A catalogued image generator with a placement tier and declared raster-logo capability.
_Avoid_: Provider

**Gallery**:
The browser view of an Ad Run and the current state of its six Ad Slots.

## Relationships

- A **Brand** supplies exactly one **Brief** for an **Ad Run**.
- An **Ad Run** contains exactly six distinct **Planned Concepts**.
- A **Planned Concept** selects exactly one **Creative Direction** and one **Image Model**.
- Each **Planned Concept** owns exactly one **Ad Slot**.
- An **Ad Slot** may produce one **Rendered Ad** at a time.
- A **Gallery** presents exactly one active **Ad Run**.

## Module map

- `src/lib/ad-run-policy.ts` owns the fixed Ad Run size and shared field limits.
- `src/lib/ad-run.ts` owns Ad Run validation and canonical HTTP codecs.
- `src/lib/generate/planner.ts` owns Brand research policy and produces validated Ad Runs.
- `src/lib/generate/renderer.ts` owns Image Model retry and raster-logo downgrade behavior.
- `src/lib/public-raster.ts` owns DNS-pinned loading of untrusted public raster URLs.
- `src/hooks/use-ad-maker.ts` owns Gallery state, cancellation, retries, and object-URL lifetime.

## Example dialogue

> **Dev:** "Can two Ad Slots in an Ad Run use the same Creative Direction?"
> **Domain expert:** "No. Every Planned Concept uses a distinct Creative Direction and Image Model, although a failed Ad Slot may retry its same plan."

## Flagged ambiguities

- "concept" previously meant both a reusable visual treatment and a run-specific plan; use **Creative Direction** for the reusable treatment and **Planned Concept** for the copy-and-model assignment.
- "creative" previously meant both a plan and its image; use **Planned Concept** before rendering and **Rendered Ad** after rendering.
