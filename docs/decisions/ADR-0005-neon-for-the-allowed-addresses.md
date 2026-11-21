---
title: A Neon database for the addresses added by the admins
status: accepted
date: 2026-11-20
---

# ADR-0005 — A Neon database for the addresses added by the admins

## Context

`ALLOWED_EMAILS` lists the Google accounts that can sign in, and they are the admins. An admin must be able to allow more accounts from the app, without a redeployment. That list has to live on the server and survive deployments: until now the server held no state.

## Decision

A Neon Postgres database, reached with `@neondatabase/serverless` (HTTP) through `DATABASE_URL`, holds one table, `allowed_emails` (`email` primary key, `added_by`, `added_at`). The table is created on first use (`CREATE TABLE IF NOT EXISTS`), with no migration tool.

- The addresses of `ALLOWED_EMAILS` stay the admins: they can always sign in, with no database access, and cannot be removed from the app.
- The addresses of the table are simple users: they sign in and use the app, without the admin profile.
- The sign-in, the session route and the sync route check the address, so removing one withdraws the access at once. A cookie that holds no address is not a session.
- The refresh token still lives in the encrypted cookie only ([ADR-0002](ADR-0002-refresh-token-in-encrypted-cookie.md)): the database holds no token and no calendar content.

## Consequences

- One more service to provision (Neon) and one more secret (`DATABASE_URL`).
- Signing in as a non-admin needs the database; if it is down, the sign-in and the sync answer 502 and nobody is let in by mistake.
- `DATABASE_URL` is optional. Without it (empty or missing, `null` in `env`), the users feature is off: only the admins can sign in, no database is called, `/api/admin/users` answers 404 `users_disabled` and the settings hide the Administrator section. One place decides it, `isUsersEnabled` (`src/lib/users/enabled.ts`): the feature is on when `DATABASE_URL` is set or `DEV_FAKE_DATA=1`.
- With `DEV_FAKE_DATA=1`, the feature is on and the users are kept in memory.

## Alternatives considered

- **Upstash Redis**: simpler for a set of addresses, but another kind of store for a list that may grow in features (roles, dates).
- **Vercel Blob**: a JSON file rewritten whole at each change, with no lock.
