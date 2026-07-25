# Sparks AI — Wedding Planner Assistant (v0.1, single-tenant)

This is the first slice of the planner tool: sign in with Google, and see a
live list of your Gmail inbox on the page. No database yet, no multi-planner
support yet — that's deliberate. The goal of this version is just to prove
the Gmail OAuth connection works end to end before adding anything else.

**Important — read this first:** this code was written without the ability
to run `npm install` or start a dev server (no internet access in the
environment it was written in), so it has not actually been executed yet.
It follows standard Next.js / NextAuth / Gmail API patterns, but there is a
real chance something needs a small fix on first run — a package version
mismatch, a typo, etc. **The very first thing to do is open this folder in
Claude Code and ask it to run `npm install && npm run dev` and fix whatever
errors come up.** That's expected, not a sign something went wrong.

## What's in here

```
app/
  page.tsx                     — sign-in screen + inbox view (one page, does both)
  layout.tsx                   — root layout, wraps app in the auth session provider
  providers.tsx                — client-side session provider
  globals.css                  — Tailwind + font import
  api/auth/[...nextauth]/route.ts  — NextAuth handler
  api/emails/route.ts          — server route that calls the Gmail API
lib/
  auth.ts                      — NextAuth config (Google provider, Gmail scope)
  gmail.ts                     — helper functions that call the Gmail API
types/
  next-auth.d.ts               — adds the accessToken field to the session type
```

## 1. Install dependencies

You'll need [Node.js](https://nodejs.org) 18+ installed. Then:

```bash
npm install
```

## 2. Set up Google OAuth credentials

This is the fiddly part — take it slowly.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (top left project dropdown → New Project). Name it
   something like "Sparks AI".
3. Go to **APIs & Services → Library**, search for **Gmail API**, and click
   **Enable**.
4. Go to **APIs & Services → OAuth consent screen**.
   - User type: **External** (unless you have a Google Workspace org, in
     which case Internal is fine too).
   - Fill in the required fields (app name, your email).
   - Under **Scopes**, add `.../auth/gmail.readonly`.
   - Under **Test users**, add the Gmail address you'll sign in with — while
     the app is in "Testing" mode, only test users can log in.
5. Go to **APIs & Services → Credentials → Create Credentials → OAuth
   client ID**.
   - Application type: **Web application**.
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Click **Create**. Copy the **Client ID** and **Client Secret** — you'll
     need them next.

## 3. Set environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from step 2.
- `NEXTAUTH_SECRET` — generate one with `openssl rand -base64 32`.
- `NEXTAUTH_URL` — leave as `http://localhost:3000` for local dev.

## 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, click **Connect Google account**, sign in
with the test user you added in step 2, and you should land on a page
listing your recent inbox messages.

## What's deliberately NOT in this version

- **No database.** The Gmail access token lives only in the encrypted
  session cookie. Nothing about your inbox is stored anywhere.
- **No multi-planner support.** Only whoever signs in can use it, and there's
  no concept of separate accounts/tenants yet.
- **No AI yet.** This version proves the plumbing (Google login → Gmail API
  → page) works. Wiring in the Anthropic API to summarize/search/flag risks
  the way we did in chat is the next slice, once this one is solid.

## Suggested next steps, in order

1. Get this running locally and confirm you can see your real inbox.
2. Add an Anthropic API call that takes the fetched messages and does one
   useful thing with them (e.g. a risk-flag summary) — proves the AI layer
   works before building more UI around it.
3. Only then: add Supabase for accounts + data storage, and turn on real
   multi-planner sign-in (each planner sees only their own data).
4. Bride-facing portal — treat as a separate project, later.
