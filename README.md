<p align="center">
  <img src="./public/logo.png" width="220" alt="Branda logo">
</p>

<p align="center">
Paste any URL. Get scroll-stopping, on-brand ads in seconds.
</p>

<p align="center">

⭐ Star us • ⚡ Powered by [Context.dev](https://context.dev) • 📜 MIT

</p>

<p align="center">
<img src="./public/cover.png" alt="Branda — generate on-brand ads from any URL">
</p>

---

## Built by the [Context.dev](https://context.dev) team 🥠

Branda is a fully open-source ad generator that turns **any website URL** into a set of polished, on-brand marketing creatives. There's no login, no setup, no design skills required — paste a URL and Branda pulls the brand's real logo, colors, and imagery straight from the [Context.dev Brand API](https://context.dev), then generates ready-to-ship ads that actually look like they belong to the brand.

Paste `notion.com` and Branda will:

- 🎨 Pull the brand's logo, palette, and campaign imagery from [Context.dev](https://context.dev)
- 👀 Read the homepage so the copy speaks in the brand's real voice
- 🧠 Pick the single strongest brand asset to style the ad off (no muddy blends)
- 🖼️ Generate distinct ads per format with `gpt-image-1`
- 📤 Export or share the result straight to X

---

## Table of contents

- [What you get](#what-you-get)
- [Ad formats](#ad-formats)
- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Tech stack](#tech-stack)
- [Built using Context.dev](#built-using-contextdev)
- [License](#license)

---

## What you get

- **URL → ads, instantly** — one input. Branda resolves the brand and generates creatives; no assets to upload.
- **Genuinely on-brand** — logos, colors, and campaign backdrops come from the real brand via [Context.dev](https://context.dev), not generic stock.
- **Smart reference selection** — a vision model inspects every brand asset and picks the single strongest one to style the ad, so outputs stay coherent instead of blending everything together.
- **Brand-grounded copy** — headlines are written from the brand's actual homepage content, in its own vocabulary — never invented positioning.
- **Multiple formats at once** — pick up to three formats and get one distinct ad for each.
- **Brand kit flex** — the brand overview surfaces everything Context.dev returns: colors, logos, imagery, and socials.
- **One-tap share** — a compact share sheet opens X with your caption ready and the ad copied to your clipboard.

---

## Ad formats

| Format | Size | What's generated |
|---|---|---|
| **LinkedIn post** | 1200 × 1200 | Full ad with a baked-in headline (poster) |
| **X (Twitter) banner** | 1500 × 500 | On-brand backdrop, text-free |
| **LinkedIn banner** | 1584 × 396 | On-brand backdrop, text-free |

> Wide banners are generated as pure backdrops on purpose — diffusion models mangle typography in extreme aspect ratios, so banners stay clean and text-free while the square post carries the headline.

---

## How it works

```
┌──────────────┐   POST /api/brand    ┌──────────────────┐
│   Paste URL  │ ───────────────────▶ │  Context.dev API │
└──────────────┘  brand + homepage md └──────────────────┘
                          │ logo · colors · backdrops · copy context
                          ▼
┌──────────────┐   POST /api/generate
│  Pick format │ ─────────────┐
└──────────────┘              ▼
        ┌───────────────────────────────────────────────┐
        │  1. select + download brand assets             │
        │  2. vision model picks the ONE best asset      │  gpt-4.1-mini
        │  3. copywriter writes brand-grounded headlines │  gpt-4.1-mini
        │  4. build a crop-aware prompt per format       │
        │  5. render the ad off the chosen reference     │  gpt-image-1
        └───────────────────────────────────────────────┘
                          │ data-URL images
                          ▼
              Canvas preview · Download · Share on X
```

1. **Resolve the brand** — `/api/brand` calls the [Context.dev](https://context.dev) Brand API for logo/colors/imagery and scrapes the homepage to markdown for copy grounding.
2. **Generate** — `/api/generate` downloads the brand's assets, has a vision model pick the strongest one, writes headlines from the homepage, and renders one ad per selected format with `gpt-image-1`.
3. **Ship** — ads render on a client canvas for preview, download, or a one-tap share to X.

---

## Quick start

**Prerequisites:** Node.js ≥ 20, a free [Context.dev API key](https://context.dev), and an [OpenAI API key](https://platform.openai.com) (image + copy generation).

```bash
# 1. Clone
git clone https://github.com/context-dot-dev/branda.git
cd branda

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# add CONTEXT_DEV_API_KEY and OPENAI_API_KEY to .env

# 4. Run
npm run dev      # http://localhost:3000
```

Open `http://localhost:3000`, paste a URL, pick your formats, and generate. That's it.

> [!NOTE]
> `gpt-image-1` requires a verified OpenAI organization. If generation returns a 403, verify your org in the OpenAI dashboard.

---

## Configuration

All configuration is environment variables (see `.env.example`).

| Variable | Required | Description |
|---|---|---|
| `CONTEXT_DEV_API_KEY` | Yes | [Context.dev](https://context.dev) key — powers brand data and homepage scraping |
| `OPENAI_API_KEY` | Yes | OpenAI key — powers copywriting (`gpt-4.1-mini`), reference selection, and image generation (`gpt-image-1`) |
| `AI_GATEWAY_API_KEY` | No | [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) key, if you prefer routing models through the gateway |

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run typecheck` | TypeScript checks |

---

## Project structure

```
src/
  app/
    api/
      brand/route.ts        # URL → Context.dev brand data + homepage markdown
      generate/route.ts     # orchestrates the generation pipeline
    page.tsx                # landing ↔ studio router
  components/               # landing, studio, brand flex, ad canvas, share sheet…
  hooks/
    use-studio.ts           # all studio state, generation, download & share logic
  lib/
    context.ts              # typed wrapper around the Context.dev SDK
    ad-render.ts            # canvas compositing / export
    generate/
      references.ts         # choose candidate brand assets
      reference-picker.ts   # vision model picks the single best asset
      copywriter.ts         # brand-grounded headline generation
      prompt-builder.ts     # crop-aware image prompts per format
      image-generator.ts    # gpt-image-1 render (+ fallbacks)
      presets.ts            # format specs (sizes, canvas, mode)
public/                     # logo, cover, ad examples
```

---

## Tech stack

- ▲ **Next.js 15** (App Router) + React 19 + TypeScript
- ⚡ **[Context.dev](https://context.dev)** — brand data (logo, colors, imagery, socials) + web scraping
- 🤖 **Vercel AI SDK** + **OpenAI** — `gpt-4.1-mini` for copy & reference selection, `gpt-image-1` for images
- 🎨 **Tailwind CSS** + **Geist** font
- 🖼️ **Canvas API** — client-side ad compositing and export

---

## Built using [Context.dev](https://context.dev)

Every brand asset in Branda — the logos, colors, campaign imagery, and homepage content — comes from a single API. Want to build your own brand-aware tool or agent?

```ts
import ContextDev from "context.dev";

const client = new ContextDev({ apiKey: process.env.CONTEXT_DEV_API_KEY });

const { brand } = await client.brand.retrieve({ domain: "notion.com" });
```

👉 **[Get your free API key →](https://context.dev)**

---

## License

MIT © [Context.dev](https://context.dev)
