---
title: Local memory first and a stateless sync route
status: accepted
date: 2026-11-18
---

# ADR-0003 — Local memory first and a stateless sync route

## Context

The app must open immediately and stay readable offline (travel, abroad, subway). On iPhone, a PWA cannot sync in the background.

## Decision

Events, calendars and preferences live in IndexedDB on the phone. The list is always displayed from that memory, before any request. A server route `GET /api/sync` relays Google and keeps nothing. The sync only starts when the app is open or returns to the foreground.

## Consequences

- Display never depends on the network.
- The past week stays visible: the sync window includes the 7 days before today, and events that end before that are deleted.
- Preferences stay specific to the device.
- If the memory format changes, it is emptied then synced again.

## Alternatives considered

- **List served by the server at each opening**: rejected, nothing is readable offline.
- **Background sync**: rejected, unavailable on iPhone.
