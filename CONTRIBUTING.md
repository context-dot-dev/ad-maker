# Contributing to Branda

Thanks for your interest in contributing! Branda is an open-source project by the [Context.dev](https://link.context.dev/branda) team, and we welcome contributions of all sizes — bug fixes, new ad formats, better prompts, docs, anything.

## Getting set up

1. **Fork and clone** the repo:

   ```bash
   git clone https://github.com/<your-username>/ad-maker.git
   cd ad-maker
   npm install
   ```

2. **Configure your environment:**

   ```bash
   cp .env.example .env
   ```

   You'll need:
   - A free [Context.dev API key](https://link.context.dev/branda) (`CONTEXT_DEV_API_KEY`)
   - A [Vercel AI Gateway key](https://vercel.com/docs/ai-gateway) (`AI_GATEWAY_API_KEY`)

3. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), paste a URL, and make sure generation works end to end before you start changing things.

## Making changes

- Create a branch from `main`: `git checkout -b feat/my-feature` (or `fix/...`, `docs/...`)
- Keep PRs focused on a single change — small PRs get reviewed and merged fastest
- Match the existing code style: TypeScript, App Router conventions, Tailwind for styling
- Before pushing, make sure both pass:

  ```bash
  npm run typecheck
  npm run build
  ```

## Where things live

| Area | Path |
|---|---|
| The brief (brand + copy + concept picking) | `src/app/api/brief/route.ts`, `src/lib/generate/brief.ts` |
| Ad rendering (one image per request) | `src/app/api/ad/route.ts` |
| The 12 creative directions + prompts | `src/lib/generate/concepts.ts` |
| Context.dev integration | `src/lib/context.ts` |
| UI | `src/components/ad-maker.tsx`, `src/hooks/use-ad-maker.ts` |

### Adding a new creative direction

1. Add a concept to `ALL_AD_CONCEPTS` in `src/lib/generate/concepts.ts` — a key, a label, a `bestFor` descriptor (the concept-picking LLM reads it), and a `buildPrompt` template
2. Reuse the shared `typography(...)` and `HARD_RULES` blocks so text stays clean
3. Never put hex codes in a prompt — use the `colorA`/`colorB` phrases (image models literally print hex strings onto the art)

### Swapping image models

Edit `AD_MODELS_PRIMARY` / `AD_MODELS_SECONDARY` in `src/lib/generate/concepts.ts` — one model per ad, with the primary trio always in the first three slots. If a model accepts image inputs, add it to `IMAGE_INPUT_MODELS` so the brand's real logo gets attached.

## Opening a pull request

- Describe **what** changed and **why**
- Include screenshots or generated ads for anything visual — they make review much faster
- Link any related issues

## Reporting bugs & suggesting features

[Open an issue](https://github.com/context-dot-dev/ad-maker/issues) with:

- What you did (the domain you pasted, if relevant)
- What you expected vs. what happened
- Any errors from the browser console or dev server output

**Never include your API keys in issues, logs, or screenshots.**

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
