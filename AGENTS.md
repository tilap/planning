# AGENTS.md

Instructions for any agent working in this repository.

## Language

Everything in the repository is written in English only: documentation, code, comments, identifiers, test names, commit messages, pull requests and issues.

The interface is multilingual (French, English, Spanish, Italian, German and Vietnamese). The only non-English text allowed is the translation content of the interface: the locale dictionary entries, and the expected UI strings in tests that run in that locale.

## Project

Planning: a read-only mobile PWA, a unified list of the events of several Google calendars, readable offline. See [docs/context/PRODUCT.md](docs/context/PRODUCT.md).

## Stack and commands

Next.js (App Router, TypeScript), Tailwind v4, pnpm, Biome, Vitest, Playwright.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

Details: [docs/operations/DEVELOPMENT.md](docs/operations/DEVELOPMENT.md).

## Conventions

- Exact dependency versions, lockfile committed.
- `process.env` is read in one place only: the `src/env.ts` module (t3-env + zod).
- No hard-coded design values: tokens live in `src/app/globals.css`, enforced by a Biome plugin.
- Mobile first: 44px touch targets, 16px input fields, safe areas.
- Folders: routes in `src/app` (local UI in `_components`, local non-UI code in `_includes`), shared UI in `src/components`, business glue in `src/lib`, generic helpers in `src/utils`.
- Every interface text goes through the dictionaries in `src/lib/i18n/locales`.
- Times are shown in the device time zone; all-day events keep their date.

## Work to do

Needs and tickets live in the GitHub issues of this repository.

## Git

Work reaches `main` through a pull request. No direct commit on `main`.

## Documentation

When code changes, update in the same change the documents under `docs/` whose `covers` field touches that code, then regenerate the index. See [docs/INDEX.md](docs/INDEX.md).

<!-- agent-deck:skills:start -->
## Skills

- **Code change.** If the `project-docs` skill is available, follow it in the same task and update the docs that cover what changed. Do not wait for a separate request to update the documentation.

<!-- agent-deck:skills:end -->
