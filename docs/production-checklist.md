# Going to production on a real domain (e.g. mmsit.cafton.com)

Checked against the current codebase and `docs/database-setup.md`. Nothing
in the app code needs to change for a domain switch — the OAuth redirect
URL is built from `window.location.origin` at sign-in time
(`google-sign-in-button.tsx`) and the callback route reads its own origin
from the incoming request (`src/app/auth/callback/route.ts`), so both
already work on whatever domain the app is actually served from. What
needs attention is entirely external configuration.

## 1. The one real open risk — read this first

Per `docs/database-setup.md`'s own "Still required from you" note: while
the Google Cloud OAuth consent screen is in **Testing** status, only up to
100 explicitly-added test users can sign in at all — everyone else gets
blocked by Google before they ever reach this app. That's almost
certainly the actual answer to "what if I test Continue with Google in
production": with a real student's account that isn't on the test-user
list, it will fail right now, not because of anything about the domain.

There's a second, separate risk the same doc flags as **untested**:
University of Baguio's Google Workspace may have a security policy that
blocks its accounts from signing in to *any* unverified third-party OAuth
app, independent of Google's own Testing/Production status. This can only
be confirmed by actually trying it with a real (non-test-user) UB account
once the consent screen is published — there's no way to check it from
the code or from Google Cloud Console settings alone. If you haven't
already confirmed this works for a real student account, it's worth doing
before treating anything else here as the blocker.

**Action:** In Google Cloud Console → OAuth consent screen, publish the
app (move it out of Testing). For an app that only requests basic
`email`/`profile`/`openid` scopes (which is all this app uses), Google
does not require its full verification review to do this — it's a
"Publish App" button, not a multi-week process. Then test sign-in with a
real UB student account that was never added as a test user.

## 2. Domain and hosting

1. **Vercel** → Project → Settings → Domains → add `mmsit.cafton.com`.
2. Vercel will show a DNS record to add (typically a `CNAME` for a
   subdomain like this, pointing at `cname.vercel-dns.com`). Add that
   record wherever `cafton.com`'s DNS is managed — that's a separate
   system from this project, so whoever controls Cafton's domain
   registrar/DNS needs to do this step.
3. Vercel auto-provisions the TLS certificate once the DNS record
   resolves; no separate certificate setup needed.

## 3. Supabase Auth URL configuration

Supabase Auth only redirects back to URLs on an explicit allow-list —
without this step, `signInWithOAuth` will succeed at Google but then fail
to redirect back to the app.

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://mmsit.cafton.com`
- **Redirect URLs**: add `https://mmsit.cafton.com/auth/callback` (keep
  the existing `localhost:3000` one too if you still want to develop
  locally against the same Supabase project)

## 4. Google Cloud OAuth client

The redirect URI Google needs is Supabase's own callback
(`https://<project-ref>.supabase.co/auth/v1/callback`), not the app's
domain — per `docs/database-setup.md`, this should already be set from
initial setup and does **not** need to change when the app's domain
changes. Only the consent screen's publishing status (§1) and, optionally,
adding `mmsit.cafton.com` under **Authorized domains** if you later want
to reference it from Google-facing UI (app homepage link, support email
domain, etc.) are domain-related items here.

## 5. Environment variables (Vercel → Settings → Environment Variables)

Set for the **Production** environment specifically (not just Preview/
Development, which can safely point at different values):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — from whichever Supabase project is the
  production one (see §6 below on whether that's the same project
  already used for testing).
- `DATABASE_URL` (port 6543, pgbouncer) and `DIRECT_URL` (port 5432) —
  same project's Postgres connection strings.
- `ALLOWED_VOTER_DOMAINS` — confirm this holds the real values you want
  as the fallback default (individual events also carry their own
  `allowedDomains`, which is the actual source of truth per event; this
  env var is only the fallback for contexts without an event yet).

## 6. Decide: same Supabase project, or a fresh one for production?

The Supabase project used throughout this session's testing already has
a real "Mr and Miss SIT 2026" event that reached `OPEN` and has at least
one genuinely cast ballot in it from earlier testing, plus a test admin
account and a test voter account/test users list. Two options:

- **Reuse this project for real production data** — clean up the test
  event/ballots/test admin/test voter test-user entry first, so real
  voters aren't sharing a database with leftover test artifacts.
- **Provision a fresh Supabase project for production**, keep this one
  for dev/staging — cleaner separation, but means redoing the one-time
  setup in `docs/database-setup.md` (the `prisma` role, the storage
  bucket, the Google provider connection, the first `AdminUser` row) 
  against the new project.

This is a real decision with no code-level default — worth deciding
explicitly rather than defaulting into whichever project happens to be in
`.env` when you first deploy.

## 7. Already handled, no action needed

- **Prisma Client generation on deploy** — `postinstall: prisma generate`
  was just added; Vercel's build will regenerate the client on every
  fresh install.
- **OAuth redirect domain** — computed dynamically from the request's own
  origin, not hardcoded anywhere.
- **Candidate photo image domain** (`next.config.ts`) — already scoped to
  `*.supabase.co`, independent of the app's own domain.
- **First ADMIN bootstrap** — already documented in
  `docs/database-setup.md`; only relevant again if you provision a fresh
  Supabase project per §6.
