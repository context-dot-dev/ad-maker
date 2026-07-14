# Branda

Branda turns one Brand domain into a bounded Ad Run of on-brand company and Product images. This glossary names the planning, rendering, and Gallery concepts shared by the browser and server modules.

## Language

**Brand**:
The organization or product whose public site supplies the identity and source material for an Ad Run.

**Brief**:
The normalized Brand facts and descriptive visual attributes used throughout one Ad Run. Its palette comes from the extracted styleguide, and its font family is present only when the styleguide identifies a referenced Google Font.
_Avoid_: Prompt, brand data

**Product**:
A distinct offering fact-grounded in the Brand's public site. Products are extracted through Context.dev `web.extract` using JSON Schema generated from a Zod schema.
_Avoid_: Invented offering, generic product

**Creative Direction**:
A named visual treatment with a dedicated prompt implementation.
_Avoid_: Style, template

**Planned Concept**:
One Creative Direction paired with fact-grounded copy, a company-or-Product subject, and an Image Model for an Ad Slot.
_Avoid_: Creative Direction

**Company Planned Concept**:
A Planned Concept whose subject is the Brand as a company.

**Product Planned Concept**:
A Planned Concept whose subject is one extracted Product.

**Ad Run**:
An ordered set of four to six Planned Concepts generated together from one Brief: exactly three Company Planned Concepts followed by one to three Product Planned Concepts for distinct Products.
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
The browser view of an Ad Run and the current state of its four to six Ad Slots.

## Relationships

- A **Brand** supplies exactly one **Brief** and one to three distinct extracted **Products** for an **Ad Run**.
- An **Ad Run** contains exactly three **Company Planned Concepts** followed by one to three **Product Planned Concepts**.
- Each **Product Planned Concept** targets a different extracted **Product**.
- A **Planned Concept** selects exactly one **Creative Direction** and one **Image Model**.
- Every **Planned Concept** in an **Ad Run** uses a distinct **Creative Direction** and **Image Model**.
- The three **Company Planned Concepts** use the three primary **Image Models**; the **Product Planned Concepts** use one to three secondary **Image Models**.
- Each **Planned Concept** owns exactly one **Ad Slot**.
- An **Ad Slot** may produce one **Rendered Ad** at a time.
- A **Gallery** presents exactly one active **Ad Run**.

## Module map

- `src/lib/ad-run-policy.ts` owns Ad Run composition, ordering, and shared field limits.
- `src/lib/ad-run.ts` owns Ad Run validation and canonical HTTP codecs.
- `src/lib/context.ts` owns Context.dev Brand/styleguide research and fact-grounded Product extraction through `web.extract` and a Zod-derived JSON Schema.
- `src/lib/generate/planner.ts` owns Brand research policy and produces validated Ad Runs.
- `src/lib/generate/renderer.ts` owns Image Model retry and raster-logo downgrade behavior.
- `src/lib/public-raster.ts` owns DNS-pinned loading of untrusted public raster URLs.
- `src/hooks/use-ad-maker.ts` owns Gallery state, cancellation, retries, and object-URL lifetime.

## Example dialogue

> **Dev:** "Can two Ad Slots in an Ad Run use the same Creative Direction?"
> **Domain expert:** "No. Every Planned Concept uses a distinct Creative Direction and Image Model. The first three advertise the company with primary models; the remaining one to three each advertise a distinct extracted Product with secondary models. A failed Ad Slot may retry its same plan."

## Flagged ambiguities

- "concept" previously meant both a reusable visual treatment and a run-specific plan; use **Creative Direction** for the reusable treatment and **Planned Concept** for the copy-and-model assignment.
- "creative" previously meant both a plan and its image; use **Planned Concept** before rendering and **Rendered Ad** after rendering.
- "product" means a fact-grounded **Product** extracted from the Brand's site, not a generic object inferred solely for an image composition.
