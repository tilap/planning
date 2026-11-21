---
title: Refresh token in an encrypted cookie, never in a database
status: accepted
date: 2026-11-18
---

# ADR-0002 — Refresh token in an encrypted cookie, never in a database

## Context

The sync calls Google with an access token obtained from the refresh token. The browser must never handle that token. There is a single user.

## Decision

The refresh token is encrypted (AES-GCM, key derived from `COOKIE_ENCRYPTION_KEY`) and kept in a long-lived `httpOnly`, `sameSite=lax` cookie, `secure` over https. The token is never stored on the server. [ADR-0005](ADR-0005-neon-for-the-allowed-addresses.md) later added a database, which holds no token.

## Consequences

- No data infrastructure to run.
- If the cookie is lost, or if the key changes, signing in to Google again is enough.
- A token stolen together with the encrypted cookie is only usable with the server's key.

## Alternatives considered

- **Database (Neon)**: rejected, it would only keep one token for one user.
- **Token in browser storage**: rejected, it would be readable by page JavaScript.
