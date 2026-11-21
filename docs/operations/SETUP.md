---
title: Setup guide
summary: Step by step, what you do by hand: Google Cloud, local run, Vercel, first sign-in, iPhone installation, troubleshooting.
status: verified
last_verified: 2026-11-21
covers:
  - .env.example
  - src/env.ts
  - src/app/api/auth/**
  - public/sw.js
  - public/icons/**
  - src/app/manifest.ts
---

# Setup guide

Everything the code cannot do for you: create the Google credentials, deploy, and sign in. The steps run in this order. The Google Cloud and Vercel screens change over time, so the names below may differ slightly; the intent of each step stays the same.

You need:

- a Google account that owns the calendars: the app only accepts the accounts listed in `ALLOWED_EMAILS` and the ones an admin adds in the app;
- optionally, a Neon Postgres database, for `DATABASE_URL`: without it, only the admins of `ALLOWED_EMAILS` can sign in and the settings have no Administrator section;
- a Vercel account connected to the GitHub repository;
- Node 26 and pnpm for the local run (see [DEVELOPMENT.md](DEVELOPMENT.md)).

## 1. Choose the address of the app

You choose the address; Vercel does not hand it to you. Decide it before anything else, because the Google credentials and the Vercel settings both need it, and it must not change afterwards: the sign-in cookie and the phone's local memory belong to one address, so changing it means signing in again and losing the memory stored on each device.

Recommended: a subdomain of a domain you own, for example `home.example.com`.

- **Production** (`APP_URL`): `https://home.example.com`.
- **Local** (`APP_URL`): `http://localhost:3000`.

The redirect address Google calls after a sign-in is always `<APP_URL>/api/auth/callback`. You will register both:

- `http://localhost:3000/api/auth/callback`
- `https://home.example.com/api/auth/callback`

The order that avoids any chicken-and-egg problem:

1. Choose the address (this step).
2. Create the Google credentials with that address (step 2).
3. Create the Vercel project with the environment variables, then attach the domain to it (step 5).
4. Create the DNS record that Vercel asks for, at your domain registrar (step 5).
5. Wait for Vercel to confirm the domain, then sign in (step 6).

You can also start with the free address Vercel gives the project, `https://<project-name>.vercel.app`, and move to your domain later. If you do, register both redirect URIs in Google, and remember that switching address later means signing in again and installing the iPhone app again.

## 2. Google Cloud

Open the [Google Cloud console](https://console.cloud.google.com/) with your Google account.

### 2.1 Create a project

1. Project picker (top bar) > **New project**.
2. Name it `Planning` and create it. Select it.

### 2.2 Enable the Google Calendar API

1. **APIs & Services** > **Library**.
2. Search **Google Calendar API** > **Enable**.

Without this step every sync fails: the app shows "The Google Calendar API is not enabled for this app".

### 2.3 Configure the consent screen

The console calls this **Google Auth Platform** (older versions: **APIs & Services > OAuth consent screen**).

1. **Get started** (or **Branding**): app name `Planning`, your e-mail as support e-mail.
2. **Audience**: choose **External**.
3. **Data Access** > **Add or remove scopes**: add `https://www.googleapis.com/auth/calendar.readonly`. The `openid` and `email` scopes are added by default. Do not add any scope that can write.
4. Contact e-mail: your address. Save.

### 2.4 Publish the app

On **Audience**, set the publishing status to **In production** (button **Publish app**), and confirm.

Why: while the app stays in **Testing**, Google expires the refresh token after 7 days and you would have to sign in again every week. In production the token does not expire. You do not need to submit the app for verification: it is only for you, and Google shows an "Unverified app" warning at the first sign-in that you accept once (see step 6).

### 2.5 Create the OAuth client

1. **Clients** (older versions: **Credentials > Create credentials > OAuth client ID**) > **Create client**.
2. Application type: **Web application**. Name: `Planning web`.
3. **Authorized redirect URIs**: add both addresses from step 1:
   - `http://localhost:3000/api/auth/callback`
   - `https://home.example.com/api/auth/callback`
4. **Create**. Copy the **Client ID** and the **Client secret**.

The redirect URI must match exactly: same scheme (`https`), same host, no trailing slash. A single character of difference gives a `redirect_uri_mismatch` error.

## 3. Generate the cookie encryption key

The session cookie holds the Google refresh token, encrypted. Generate a key of at least 32 characters:

```bash
openssl rand -base64 32
```

Keep one key for production and use another one locally. Never commit it.

## 4. Run it locally

1. Create the local settings file from the template:

   ```bash
   cp .env.example .env.local
   ```

2. Fill `.env.local`:

   | Variable | Value |
   | --- | --- |
   | `GOOGLE_CLIENT_ID` | the Client ID from step 2.5 |
   | `GOOGLE_CLIENT_SECRET` | the Client secret from step 2.5 |
   | `COOKIE_ENCRYPTION_KEY` | the key from step 3 |
   | `ALLOWED_EMAILS` | the Google addresses of the admins, comma-separated: they can always sign in |
   | `DATABASE_URL` | optional: the Neon connection string (the addresses added in the app are kept there); leave it empty to allow only the admins |
   | `APP_URL` | `http://localhost:3000` |

3. Install and start:

   ```bash
   pnpm install --frozen-lockfile
   pnpm dev
   ```

4. Open http://localhost:3000, tap **Sign in with Google**, accept, and the list fills after the first sync.

The service worker only runs in a production build. To test the offline behaviour on your computer:

```bash
pnpm build && pnpm start
```

Load the page once, then cut the network in the browser's developer tools and reload.

### See the interface without Google

`DEV_FAKE_DATA=1 pnpm dev` answers "signed in" and serves fake calendars and events, with no Google call and no database (see [DEVELOPMENT.md](DEVELOPMENT.md)).

## 5. Deploy on Vercel

1. [vercel.com/new](https://vercel.com/new) > import your fork or copy of the repository.
2. Project name: anything (for example `planning`). Framework preset: **Next.js** (detected). Leave the root directory and the build command as they are.
3. **Node.js version**: the repository declares Node 26 in `package.json`; check **Settings > General > Node.js Version** shows 26.x.
4. **Environment Variables** (Production), the same six variables as locally, with production values:

   | Variable | Value |
   | --- | --- |
   | `GOOGLE_CLIENT_ID` | the Client ID |
   | `GOOGLE_CLIENT_SECRET` | the Client secret |
   | `COOKIE_ENCRYPTION_KEY` | a key generated for production |
   | `ALLOWED_EMAILS` | the Google addresses of the admins, comma-separated |
   | `DATABASE_URL` | optional: the Neon connection string (Neon integration of the Vercel Marketplace, or the string of a Neon project) |
   | `APP_URL` | `https://home.example.com` (the address chosen in step 1: exact origin, no trailing slash) |

   To avoid typing secrets in a shell history, use the dashboard, or the CLI with the value on the standard input: `vercel env add GOOGLE_CLIENT_SECRET production --sensitive`.
5. **Deploy**. The variables are checked as soon as Next.js loads its config, so a missing or invalid one fails the build with `Invalid environment variables` and the deployment never goes live.
6. **Attach the domain**: in the project, **Settings > Domains** > **Add** > `home.example.com`. Vercel then shows the DNS record to create (see below) and waits for it. The first deployment already works on the free `https://<project-name>.vercel.app` address in the meantime, but the Google sign-in only works on the registered address, so wait for your domain.

### Create the DNS record

Vercel's **Domains** screen shows the exact record to create and its value: use what it shows. For a subdomain it is a `CNAME`. Create it where your domain's DNS is managed (your registrar or your DNS provider).

1. Open the DNS records of your domain.
2. Add a record:
   - **Type**: `CNAME`
   - **Name**: `home` (only the subdomain part, not the full address)
   - **Value**: the value shown by Vercel, for example `cname.vercel-dns.com.`. Some providers want the final dot, others reject it: follow what yours accepts.
   - **TTL**: keep the default (a lower value such as 300 seconds speeds up the first propagation).
3. Save.
4. Back in Vercel, **Domains** shows **Valid configuration** within a few minutes (up to an hour). Vercel then issues the HTTPS certificate by itself.

If you want the bare domain (`example.com`) instead of a subdomain, Vercel asks for an `A` record with the name `@` and the IP address it shows (historically `76.76.21.21`). A subdomain is simpler and keeps the rest of your domain free.

Once the domain is valid, open `https://home.example.com`: you should see the "Sign in with Google" screen.

If Vercel shows its own login page instead of the app, check **Settings > Deployment Protection**: the production domain must be public.

Changing a variable needs a new deployment to take effect (**Deployments > Redeploy**).

Only the production domain works for the Google sign-in. Preview deployments have other addresses that are not registered as redirect URIs.

## 6. First sign-in

1. Open the production address and tap **Sign in with Google**.
2. Choose the allowed account.
3. Google shows **Google hasn't verified this app**: tap **Advanced**, then **Go to Planning (unsafe)**. This is expected for an app you published yourself without verification, and happens once.
4. Accept the access to read your calendars.
5. The app opens and syncs. Your calendars appear in the settings, all visible by default.

A different Google account is refused with "This Google account is not allowed", and nothing is kept.

## 7. Install on the iPhone

1. Open the production address in **Safari** (not another browser: only Safari can add a home screen app).
2. Tap **Share** > **Add to Home Screen** > **Add**.
3. Open the app from its icon and sign in once, online, to fill the memory.

If the home screen icon looks outdated after a deploy, remove the shortcut and add it again: Safari keeps the previous icon until you do.

4. Check it works offline: switch to airplane mode and reopen the app; the list is still there.

The app syncs when it is open or when it comes back to the foreground after more than 15 minutes. It does not sync in the background.

## 8. Maintenance

- **Allow another account**: with `DATABASE_URL` set, an admin adds the address in the settings, **Administrator** > **Users**; no redeployment. The account then signs in with Google as the others.
- **Change the admins**: change `ALLOWED_EMAILS`, redeploy, then sign out and sign in again with an allowed account. Several addresses are separated by commas.
- **Cut the access**: use **Sign out** in the settings (it revokes the token at Google). You can also remove the app at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).
- **Rotate the cookie key**: change `COOKIE_ENCRYPTION_KEY` and redeploy; every session becomes unreadable and the next sync asks you to sign in again. The local memory is kept.
- **Change the address of the app**: update `APP_URL`, add the new redirect URI in the Google OAuth client, redeploy.

## 9. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Google error `redirect_uri_mismatch` | the redirect URI is not registered exactly | add `<APP_URL>/api/auth/callback` to the OAuth client, same scheme, host and no trailing slash |
| Google error `access_denied` or "app not verified, test users only" | the app is still in **Testing** and the account is not a test user | publish the app **In production** (step 2.4) |
| "This Google account is not allowed" | the account is neither in `ALLOWED_EMAILS` nor added by an admin | sign in with an allowed account, or, when `DATABASE_URL` is set, have an admin add the address in the settings (**Administrator** > **Users**); without it, add the address to `ALLOWED_EMAILS` |
| "The Google Calendar API is not enabled for this app" | the Google Calendar API is not enabled in the project | enable it (step 2.2), then tap **Retry** |
| "Access to your calendars was not granted" | the calendar permission was unticked on the Google consent screen | tap **Sign in again** and leave the permission to read your calendars ticked |
| "Google is not answering correctly right now" | Google refused for another reason | tap **Retry**; the exact reason Google gave is in the Vercel logs (**Logs**, search `Google` and `error: status`) |
| "Google is temporarily limiting requests" | too many requests to the Google API | wait and sync again |
| "The access to your Google account has expired or was removed" or "Your session has expired" | the token was revoked, the app was left in **Testing** for more than 7 days, or the cookie key changed | tap **Sign in again**; the memory is kept |
| Build or server error, `Invalid environment variables` | a variable is missing, empty, or `COOKIE_ENCRYPTION_KEY` is shorter than 32 characters | fix the variable and redeploy |
| The list does not open offline | the app was never loaded online with the service worker active, or you run `pnpm dev` | load it once online from a production build, then retry |
| The offline icon or the install option is missing on iPhone | not opened in Safari, or opened over HTTP | use Safari and the https address |
