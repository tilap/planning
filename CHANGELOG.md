# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Unified, read-only list of the events of several Google calendars, readable offline: day groups, durations, all-day and multi-day events, the device time zone, search, and a details panel.
- Google sign-in with the read-only calendar scope, an encrypted session cookie, and a list of allowed addresses (`ALLOWED_EMAILS`, the admins) that admins extend from the app when `DATABASE_URL` is set.
- Sync: a stateless route that relays Google Calendar, a configurable window (past and ahead), failures shown without losing the list, and a screen that explains a failed first sync.
- Settings: visible calendars, six interface languages, hour and date formats, color themes, map app, left-handed layout, sounds, sign out.
- Installable PWA with a service worker, so the app opens offline.
- `DEV_FAKE_DATA=1 pnpm dev` serves a fake signed-in session and fake events, with no Google call.
- Documentation under `docs/`, a setup guide, a user guide, and the files of an open source project (MIT license, contributing guide, code of conduct, security policy, issue and pull request templates).
