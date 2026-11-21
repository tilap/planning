---
title: Testing
summary: The three test seams, the tools, what is proved automatically and what stays manual.
status: verified
last_verified: 2026-11-21
covers:
  - e2e/**
  - playwright.config.ts
  - vitest.config.ts
  - src/**/*.test.ts
  - src/**/*.test.tsx
---

# Testing

## Seams

1. **The app in a browser** (Playwright on the production build): local memory pre-filled with `seedCache`, network cut, clock frozen, time zone and locale set per case. Observes the list, the panel, the settings (including the administrator sheet, shown or hidden by the `usersEnabled` flag of the session), search, keyboard shortcuts, sync failures and the first-sync error screen, offline use.
2. **The HTTP routes** (Vitest, Google simulated by replacing `fetch` for `accounts.google.com`, `oauth2.googleapis.com` and `www.googleapis.com`, the Neon store replaced by a mock): the sync route (refusal of a non-allowed account, window computed from the range and passed to Google, a 400 for any range value outside the closed set, errors, no token in the response), the auth routes (sign-in, callback, session, logout) and the admin users route (admins only, and 404 `users_disabled` when the users feature is off). The feature switch is replaced by a mock in these tests, so they do not depend on the placeholder `DATABASE_URL`.
3. **The pure logic** (Vitest): human duration, grouping by day, multi-day, all day, time zone, 12 h / 24 h, sync window and purge cutoff for every allowed range, the closed range values, merge of a shrunk or grown window, search filter, address allow-list and admin check, user store queries, interface messages, description text, links and map URLs, sound synthesis, service worker rules, the design-value lint plugin and the environment validation.

The reusable `SidePanel`, the `Sheet` and the sound effects also have component tests (Vitest with jsdom).

Test external behaviour at these seams, not implementation details.

## Reference data

Fixed day of the tests: Wednesday 18 November 2026, 09:00 in Paris. Test times are given in Paris (UTC+1).

## What stays manual

After each deployment:

- the real Google sign-in (consent screen, real token);
- installation on the iPhone home screen.

## Scenarios

The behaviour described in [PRODUCT.md](../context/PRODUCT.md) is proved by the end-to-end specs in `e2e/`, one file per area (list, details panel, search, settings, sync, sync failures, login, logout, shortcuts, PWA).
