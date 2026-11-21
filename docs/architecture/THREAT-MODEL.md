---
title: Threat model
summary: What to protect (Google token, calendar data), against whom, and what is accepted.
status: verified
last_verified: 2026-11-21
covers:
  - src/lib/auth/**
  - src/app/api/auth/**
  - src/app/api/sync/**
---

# Threat model

## Assets

- The **Google refresh token**: it grants read access to all the calendars of the account.
- The **calendar content**, in transit and on the phone.

## Mitigations

| Threat | Mitigation |
| --- | --- |
| An unlisted Google account uses the app | allow-list: `ALLOWED_EMAILS` (the admins) and, when `DATABASE_URL` is set, the addresses added by the admins in the database (without it, the admins only); any other account is refused with no cookie and no token kept; the address is checked again at each sync, so removing it cuts the access |
| A user acts as an admin | the admin routes check `isAdmin` on the server from the session cookie at each request; the interface flag is only cosmetic; the admin list comes from the environment, not from the database |
| Token theft or read by page JavaScript | the token is never returned to the browser; it lives in an `httpOnly` cookie, `secure` over https, `sameSite=lax`, encrypted (AES-GCM, key derived from `COOKIE_ENCRYPTION_KEY`) |
| Abusing the sync route to burn the Google quota or to fetch a huge range | the route accepts only the closed values of `src/config/sync.ts` (`past`: `1w`, `2w`, `1m`; `ahead`: `1m`, `2m`, `3m`) and an IANA time zone of at most 64 characters, and computes the window itself; a free date or length gets a 400, so the range cannot exceed one month back and three months ahead |
| Forged cookie | an unreadable or altered cookie means "not signed in" |
| Forced sign-in by a third party (CSRF on the OAuth return) | random `state` parameter kept in a short-lived cookie; an invalid `state` is a 400 with no cookie |
| Excessive rights | read-only calendar scope; the app cannot change anything at Google |
| Token in a sync route response | the response never contains a token; tested |
| Access kept after use | "Sign out" revokes the access at Google, deletes the cookie and empties the local memory |

## Accepted risks

- **Unlocked phone**: the app has no lock; the list is readable by anyone holding the unlocked phone.
- **Unencrypted local memory**: events are in clear text in IndexedDB.
- **Unverified Google app**: the app is published "in production" without verification, with the "Unverified app" screen at first sign-in ([ADR-0001](../decisions/ADR-0001-google-oauth-instead-of-ical.md)).
- **Unverified `id_token`**: the e-mail address is read from the `id_token` the server receives directly from Google, without checking the signature.
