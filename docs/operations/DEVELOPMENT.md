---
title: Development
summary: Prerequisites, commands, environment variables and code conventions.
status: verified
last_verified: 2026-11-21
covers:
  - package.json
  - scripts/**
  - public/icons/**
  - biome.json
  - .github/**
  - src/env.ts
  - src/lib/dev/**
  - src/lib/build-info.ts
  - src/config/**
  - .env.example
  - playwright.config.ts
  - ai-plugin.json
  - ai-plugin.lock.json
---

# Development

## Prerequisites

Node (version in `.nvmrc`) and pnpm (version in `packageManager`).

## Commands

```bash
pnpm install --frozen-lockfile
pnpm exec agent-deck install --frozen
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
pnpm icons
```

`pnpm icons` rebuilds the PNGs in `public/icons/` from the SVG source (`scripts/generate-app-icons.mjs`, uses `sharp`). Run it after changing the artwork.

`pnpm e2e` runs Playwright against the production build.

`@toolmesh/agent-deck` is a devDependency. After `pnpm install`, `pnpm exec agent-deck install --frozen` restores the agent plugins and skills pinned in `ai-plugin.json` / `ai-plugin.lock.json` (into `.ai/installed/` and the host copies). Change the set with `pnpm exec agent-deck add` / `remove`, then commit both plugin files.

## Continuous integration

The [CI workflow](../../.github/workflows/ci.yml) runs on every push to `main` and on every pull request. GitHub reports five separate checks: **lint**, **typecheck**, **test**, **build**, and **e2e** (`e2e` waits for `build` and reuses its `.next` output). Outdated runs on the same pull request are cancelled when a new commit is pushed. When `e2e` fails, the `test-results` folder (Playwright traces of the failed tests) is kept for 3 days as the `playwright-results` artifact of the run. Workflow actions target Node 24 on GitHub-hosted runners; builds set `NEXT_TELEMETRY_DISABLED=1` so Next.js does not print telemetry notices in the logs.

To block a merge when a check fails, open the repository **Settings → Rules → Rulesets** (or **Branches → Branch protection**), add a rule on `main`, and require those five status checks. On a private repository this screen needs GitHub Team or Pro; the checks still run on pull requests without a rule, they are just not enforced.

## Environment variables

Read only by `src/env.ts`. Template in `.env.example`. They are validated as soon as Next.js loads its config (`next.config.ts` imports `src/env.ts`): a build or a server start with a missing or invalid variable fails at once, so a Vercel deployment missing one never goes live. `DATABASE_URL` is optional: empty or missing gives `null`, and only the `ALLOWED_EMAILS` admins can then sign in (the users management is off, in the API and in the settings); with `DEV_FAKE_DATA=1` the users management stays on, in memory. The CI build job and the Playwright config pass placeholder values.

| Variable                | Role                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GOOGLE_CLIENT_ID`      | Google OAuth client identifier                                                                               |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth client secret                                                                                   |
| `COOKIE_ENCRYPTION_KEY` | encryption key of the session cookie, at least 32 characters                                                 |
| `ALLOWED_EMAILS`        | the admin Google addresses, comma-separated                                                                  |
| `DATABASE_URL`          | Neon connection string, optional: the addresses added by the admins; without it, only the admins can sign in |
| `APP_URL`               | public origin of the app (OAuth redirect URI)                                                                |
| `DEV_FAKE_DATA`         | development only: `1` skips Google (see below)                                                               |

Vercel also sets `VERCEL_GIT_COMMIT_SHA` on every deployment. `src/env.ts` maps it to `GIT_COMMIT_SHA` (falls back to `dev` locally). Settings show the first 7 characters so you can check which build is running.

### Browsing without Google

`DEV_FAKE_DATA=1 pnpm dev` makes the session route answer "signed in" and the sync route return fake calendars and events around today (`src/lib/dev/fake-data.ts`), so the app can be used and checked without signing in. The server throws when this variable is set with `NODE_ENV=production`, including `pnpm build && pnpm start`.

## Conventions

- **Language**: everything in the repository is English only (documentation, code, comments, identifiers, test names, commits, pull requests, issues). The one exception is the translation content of the multilingual interface (the dictionary entries of each language, and the expected UI strings in tests that run in a given locale).
- **Environment**: `process.env` is read only in `src/env.ts`; the Biome rule `style/noProcessEnv` fails `pnpm lint` anywhere else (member access, bracket access and destructuring), `NODE_ENV` included. Code needing a value imports `env`; a client component receives it as a prop from a server component.
- **Dependencies**: exact versions, lockfile committed, Renovate for updates.
- **Lint and format**: Biome only. A plugin rejects hexadecimal colors and arbitrary-value classes (`text-[13px]`, `bg-[#abc]`) in strings; only tokens are allowed.
- **Design**: tokens by role (`canvas`, `surface`, `fg`, `fg-muted`, `accent`, `accent-fg`, `accent-soft`, `line`, `track`, `danger`, `danger-fg`) in the `@theme` block of `src/app/globals.css`, plus the type, radius and shadow tokens. The same tokens take warm dark values on `html[data-theme="dark"]` and, unless the stored choice is light, when the system prefers dark. 44px touch targets (`--spacing-touch`), 16px input fields (`--text-field`), safe areas with `env(safe-area-inset-*)` and `viewportFit: "cover"`. Write mobile without a prefix and widen with `md:`. Fonts are loaded with `next/font` in the root layout and referenced from those tokens. The lint plugin only sees double-quoted strings, so a hex or an arbitrary class in a template literal, and any value written outside `@theme`, slips through. A calendar color is event data, set inline, not a token.
- **Folders**: `src/app` (routes; local UI in `_components`, local non-UI code in `_includes`), `src/components`, `src/lib`, `src/utils`, `src/config`. Move a module up into `components` only when two independent routes use it.
- **Texts**: one dictionary per language in `src/lib/i18n/locales` (typed by `Messages`, so a missing key fails the build), no hard-coded interface text.
- **Sync config**: `src/config/sync.ts` holds the closed lists of past and future ranges, their units and defaults, and the foreground resync delay; the route, the client and the settings all take their values from it, so do not copy them elsewhere. A range is an identifier (`1w`, `3m`), never a number of days.

## Deployment

Vercel, connected to the repository. Environment variables are entered in Vercel. See [RUNBOOKS.md](RUNBOOKS.md).
