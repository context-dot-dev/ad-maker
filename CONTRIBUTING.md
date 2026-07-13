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
   - A [Vercel AI Gateway key](https://vercel.com/docs/ai-gateway) (`AI_GATEWAY_API_KEY`) **or** an [OpenAI API key](https://platform.openai.com) (`OPENAI_API_KEY`)

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
| Brand resolution (Context.dev) | `src/app/api/brand/route.ts`, `src/lib/context.ts` |
| Generation pipeline | `src/app/api/generate/route.ts`, `src/lib/generate/` |
| Prompts | `src/lib/generate/prompt-builder.ts` |
| Ad formats / sizes | `src/lib/generate/presets.ts`, `src/lib/formats.tsx` |
| UI | `src/components/`, `src/hooks/use-studio.ts` |
| Canvas rendering / export | `src/lib/ad-render.ts` |

### Adding a new ad format

1. Add a spec to `FORMAT_SPEC` in `src/lib/generate/presets.ts` (size, canvas, mode)
2. Register it in `FORMATS` in `src/lib/formats.tsx` so it shows up in the studio
3. If the aspect ratio is extreme, use `art` mode (backdrop only) — diffusion models mangle text in wide crops, which is why only the 1:1 post uses `poster` mode

## Opening a pull request

- Describe **what** changed and **why**
- Include screenshots or generated ads for anything visual — they make review much faster
- Link any related issues

## Reporting bugs & suggesting features

[Open an issue](https://github.com/context-dot-dev/ad-maker/issues) with:

- What you did (the URL you pasted and formats you picked, if relevant)
- What you expected vs. what happened
- Any errors from the browser console or dev server output

**Never include your API keys in issues, logs, or screenshots.**

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
