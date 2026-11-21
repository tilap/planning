---
title: Google OAuth instead of secret iCal addresses
status: accepted
date: 2026-11-18
---

# ADR-0001 — Google OAuth instead of secret iCal addresses

## Context

The app must read several Google calendars of one account, including those shared by other people.

## Decision

The app signs in to Google with OAuth, with the read-only calendar scope only (`calendar.readonly`). It is published "in production" without Google verification: the "Unverified app" screen appears once at first sign-in, and the refresh token does not expire after 7 days as it would in test mode.

## Consequences

- The calendar list fills itself, with names, colors and the "Open in Google Calendar" link.
- Calendars shared by other people are read.
- A one-time setup on the Google Cloud side is needed (project, consent screen, OAuth client).
- Only the Google accounts of an address allow-list (`ALLOWED_EMAILS`) are allowed.

## Alternatives considered

- **Secret iCal addresses**: no Google sign-in and no Google Cloud app, no token that expires. Rejected: each calendar is added by hand, Google refreshes these feeds late, there is no calendar color, no link to Google Calendar, and the secret address is not visible for calendars one does not manage.
- **App in test mode**: rejected, the refresh token expires after 7 days.
