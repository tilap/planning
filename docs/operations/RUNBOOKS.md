---
title: Runbooks
summary: Deploy on Vercel, sign in again after a revocation, change the encryption key.
status: verified
last_verified: 2026-11-21
covers:
  - src/env.ts
  - .env.example
---

# Runbooks

## Deploy on Vercel

The first deployment, with the Google credentials, is detailed in [SETUP.md](SETUP.md). The short version:

1. Connect the repository to a Vercel project.
2. Enter in Vercel, per environment, the variables of [DEVELOPMENT.md](DEVELOPMENT.md): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `COOKIE_ENCRYPTION_KEY`, `ALLOWED_EMAILS`, `APP_URL`, and `DATABASE_URL` (optional: without it only the admins can sign in). A missing or invalid variable fails the build, so the deployment never goes live.
3. `APP_URL` is the exact origin of the app; it builds the OAuth redirect URI `<APP_URL>/api/auth/callback`.
4. After the first deployment, sign in once with Google and check the list.

## Google access is revoked or the session expired

Symptom: the sync fails with "The access to your Google account has expired or was removed", or "Your session has expired". The list stays readable. Tap "Sign in again" in the message to go through Google again; the local memory is kept.

## Change the cookie encryption key

Changing `COOKIE_ENCRYPTION_KEY` makes every existing cookie unreadable: the next sync asks to sign in again. Redeploy after the change.
