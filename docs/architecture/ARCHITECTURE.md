---
title: Architecture
summary: How Planning is built: browser, sync route, Google sign-in, PWA.
status: verified
last_verified: 2026-11-21
covers:
  - src/**
  - public/**
---

# Architecture

A single Next.js project, with no monorepo ([ADR-0004](../decisions/ADR-0004-single-nextjs-project.md)). The server relays Google and holds one small piece of state, the addresses added by the admins, in an optional Neon database ([ADR-0005](../decisions/ADR-0005-neon-for-the-allowed-addresses.md)). All the calendar data lives on the phone.

## Overview

```
Phone (PWA)                                  Server (Vercel)                  Google
┌───────────────────────────┐                ┌───────────────────┐
│ List, panels, settings    │                │ /api/auth/*       │──OAuth──▶ accounts.google.com
│ Display logic             │──GET /api/sync▶│ /api/sync         │──API────▶ www.googleapis.com
│ Local memory (IndexedDB)  │◀───JSON────────│ (session cookie)  │
│ Service worker            │                └───────────────────┘
└───────────────────────────┘
```

## Parts

- **Local memory** (`src/lib/cache/`): IndexedDB, versioned. See [DATA-MODEL.md](DATA-MODEL.md).
- **Display logic** (`src/lib/events/`): pure functions: human duration, grouping by day in a time zone, multi-day, all day, hour format.
- **Sync** (`src/lib/sync/`, `src/app/api/sync/`): computation of the window and of the purge cutoff from a closed range (`src/lib/sync/window.ts`, `range.ts`), server route, writing into the local memory.
- **Google sign-in** (`src/lib/auth/`, `src/app/api/auth/`): OAuth, allow-list, encrypted cookie. See [ADR-0001](../decisions/ADR-0001-google-oauth-instead-of-ical.md) and [ADR-0002](../decisions/ADR-0002-refresh-token-in-encrypted-cookie.md).
- **Interface** (`src/app/(app)/`, `src/components/`): list, reusable side panel, bottom bar, settings (including the short build SHA).
- **PWA**: manifest (`src/app/manifest.ts`) and a service worker (`public/sw.js`) that caches the app shell: the page hands it the URLs it loaded plus the static illustrations, navigations go network first, with a cache fallback when the network fails or has not answered after 2 seconds, hashed assets are cache first. A new version waits and activates at the next launch.
- **Interface sounds**: `src/lib/sound/sound.ts` synthesizes each sound with the Web Audio API (no audio file, so nothing to cache); `SoundEffects` listens once on the document for clicks and select changes, and the panels and sheets play their own open and close sounds. The `sound` preference turns them all off, and no audio context is created while they are off.
- **Config**: `src/config/sync.ts` (the allowed past ranges `1w`, `2w`, `1m` and future ranges `1m`, `2m`, `3m`, their defaults, foreground resync delay); `src/env.ts` (the only reader of `process.env`); `src/lib/build-info.ts` (shortens the git SHA for display).

## Main flows

**Launch**
1. The list is displayed from the local memory, with no network call.
2. The sync starts, with a non-blocking overlay.
3. The client reads its range from the preferences (`syncPast`, `syncAhead`; a missing or unknown value is the default, 1 week and 3 months) and calls `GET /api/sync?past&ahead&tz`: `past` is `1w`, `2w` or `1m`, `ahead` is `1m`, `2m` or `3m`, `tz` is the device IANA time zone. Nothing else is accepted: the client sends no date and no length.
4. The route reads the `session` cookie, checks the three parameters, computes the window itself with the server clock (start of the day the past range reaches back to → start of the day the future range reaches, in `tz`), gets an access token, lists the calendars and their events (occurrences expanded) and returns `{ calendars, events, syncedAt }`.
5. The client replaces the events of the window, deletes those that end before the cutoff (the start of the past range, which is also the start of the window; events beyond the end of a shorter future range are not in the response, so they go too), removes disappeared calendars, updates the sync date.

**Route errors**: 400 `bad_request` (a missing or other `past`, `ahead` or `tz`, including any free `timeMin`/`timeMax` sent instead), 401 `not_signed_in`, 401 `access_revoked`, 429 `quota`, 502 `upstream`, 502 `calendar_api_disabled` (Google answered `accessNotConfigured`), 403 `calendar_permission_missing` (Google answered `insufficientPermissions`). The route logs the status and reason Google answered, never a token. Offline, it is the client `fetch` that fails.

**Sign-in**: `GET /api/auth/google` redirects to Google (read-only calendar access + e-mail); `GET /api/auth/callback` checks the state, checks the address with `isAllowed` (`src/lib/auth/access.ts`: an address of `ALLOWED_EMAILS`, which are the admins (`isAdmin`, `src/lib/auth/admin.ts`), or, when the users feature is on, one of the table `allowed_emails`, `src/lib/users/store.ts`; `isUsersEnabled`, `src/lib/users/enabled.ts`, is the single place that decides it: `DATABASE_URL` is set, or `DEV_FAKE_DATA=1`), sets the `session` cookie, which holds the refresh token and the address (a cookie made of the bare token, from before, still works and has no admin rights); `GET /api/auth/session` tells whether the session is valid (its address must still be allowed) and whether it has the admin profile (`{ signedIn, admin, usersEnabled }`, for the interface only: `usersEnabled` is the users feature flag, and the settings show the Administrator section only to an admin when it is true; any admin route checks `isAdmin(readSession(request)?.email)` itself); `POST /api/auth/logout` revokes the access and deletes the cookie.

**Allowed addresses**: `GET`, `POST` and `DELETE /api/admin/users` (admins only, checked on the server) list, add and remove the addresses of the table; 404 `users_disabled` for an admin when the users feature is off (403 `forbidden` for anyone else, as always); 401 `not_signed_in` on `/api/sync` when the address is no longer allowed; 502 when the database cannot be reached.

**Return to foreground**: if the last successful sync is older than 15 minutes, a sync starts again.

## Structuring choices

- Local memory first: display never depends on the network ([ADR-0003](../decisions/ADR-0003-local-cache-and-stateless-sync.md)).
- Times are formatted at display time in the device time zone, never stored formatted; re-read when the app returns to the foreground.
- No list virtualization: the order of magnitude is a few thousand events.
- A new app version activates at the next launch, silently.

## Environment variables

Declared in `src/env.ts`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `COOKIE_ENCRYPTION_KEY` (at least 32 characters), `ALLOWED_EMAILS`, `DATABASE_URL` (Neon; optional, empty or missing gives `null` in `env`: the users feature is then off, so only the `ALLOWED_EMAILS` admins can sign in, no database is called, `/api/admin/users` answers 404 `users_disabled` and the settings hide the Administrator section; with `DEV_FAKE_DATA=1` the feature stays on, the users kept in memory), `APP_URL`, `GIT_COMMIT_SHA` (from Vercel's `VERCEL_GIT_COMMIT_SHA`, or `dev` locally).
