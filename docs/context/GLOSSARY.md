---
title: Glossary
summary: The project vocabulary: the words to use in code, issues and the interface.
status: verified
last_verified: 2026-11-21
covers:
  - src/lib/**
---

# Glossary

| Term | Meaning |
| --- | --- |
| **Calendar** | A Google calendar of the allowed account (personal, shared, subscribed). |
| **Event** | A line of the list. Each occurrence of a recurring event is a distinct event. |
| **All day** | An event without a time (`allDay`): it carries a date, not an instant. Shown as "Journée" in French. |
| **Multi-day** | An event that covers several days; repeated on each day with "day 2/3". |
| **Local memory** | The data kept on the phone (events, calendars, preferences, last sync date). Also called the cache. |
| **Sync** | Fetching the calendars and events of the window from Google, then updating the local memory. |
| **Sync window** | From the start of the day the past range reaches back to (1 week, 2 weeks or 1 month; 1 week by default) to the start of the day the future range reaches (1, 2 or 3 months; 3 by default), in the device time zone. The server computes it from those closed values. |
| **Purge cutoff** | The start of the day the past range reaches back to (the start of the sync window); events that end before it are deleted. |
| **Panel** | The side panel: event details (always on the right), or settings (on the left, or on the right in left-handed mode). |
| **Session** | The `session` cookie that holds the encrypted Google refresh token. |
| **Preferences** | Hidden calendars, language, hour format, date format, appearance, left-handed UI, sounds, sync range; stored on the device. |
