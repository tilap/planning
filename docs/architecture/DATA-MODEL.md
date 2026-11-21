---
title: Data model
summary: What the phone keeps in its local memory, its shapes and its version.
status: verified
last_verified: 2026-11-21
covers:
  - src/lib/cache/**
  - src/lib/events/types.ts
  - src/lib/sync/merge.ts
---

# Data model

The calendar data lives in IndexedDB, on the device. The server keeps only the addresses added by the admins (see the end of this document).

## Version

Constant `CACHE_VERSION`. If the stored version differs, the memory is emptied then synced again: it is a copy of Google, with no migration.

## Stores

**`events`**: one record per occurrence.

| Field | Type | Note |
| --- | --- | --- |
| `id` | text | occurrence identifier, `<calendarId>:<Google event id>`, so an event shared by two calendars does not collide |
| `calendarId` | text | originating calendar |
| `title` | text | |
| `allDay` | boolean | `true` for an all-day event |
| `start`, `end` | text | ISO instants if the event has a time; `YYYY-MM-DD` dates if `allDay`, end exclusive |
| `location`, `description`, `meetingUrl`, `meetingPhone`, `organizer`, `attendees`, `htmlLink` | optional | no `htmlLink` = no "Open in Google Calendar" link |
| `meetingPhone` | `{ number, pin? }` | dial-in number of the Google Meet, from the `phone` entry point |
| `organizer` | `{ name, email?, self? }` | who created the event (Google organizer, else creator) |
| `attendees` | `{ name, email?, status, organizer?, self? }[]` | `status` is `accepted`, `declined`, `tentative` or `pending` (Google `needsAction` or no answer) |

**`calendars`**: `{ id, name, color }`.

**`meta`**: date of the last successful sync.

**Preferences**: stored in the `meta` store under the key `preferences`: `hiddenCalendarIds`, `language`, `hourFormat`, `dateFormat` (`numeric`, `short` or `long`), `mapApp` (`auto`, `apple` or `google`), `palette` (`paper`, `violet`, `rose` or `gold`), `colorScheme` (`light`, `dark` or `system`), `leftHanded` (boolean), `sound` (boolean), `syncPast` (`1w`, `2w` or `1m`), `syncAhead` (`1m`, `2m` or `3m`). A calendar absent from `hiddenCalendarIds` is visible. With no stored value, the language, the hour format and the appearance come from the device, the date format is `short` the map app is `auto` and the palette is `paper`, left-handed is off, the sounds are off, and the sync range is one week back and three months ahead (an unknown stored range value counts as the default). Preferences never leave the device.

## Lifecycle

- Successful sync: events of the window replaced; events that end before the cutoff (the start of the past range: today − 7 days, 14 days or 1 month) deleted, and, when the future range shrank, the events beyond its end (the response no longer holds them); calendars absent from the response deleted with all their events; hidden calendars synced anyway.
- Sign-out: events, calendars and sync date emptied; preferences kept.

## Server side

The `session` cookie holds the encrypted Google refresh token, on the device (see [THREAT-MODEL.md](THREAT-MODEL.md)). The only data the server keeps is the allowed addresses, only when `DATABASE_URL` is set (Neon, [ADR-0005](../decisions/ADR-0005-neon-for-the-allowed-addresses.md)): the table `allowed_emails`, created on first use.

| Column | Type | Note |
| --- | --- | --- |
| `email` | text, primary key | lower-cased |
| `added_by` | text | the admin who added it |
| `added_at` | timestamptz | |

Without `DATABASE_URL` there is no table and no server data. The admins (`ALLOWED_EMAILS`) are not in the table. No token and no calendar content is kept.
