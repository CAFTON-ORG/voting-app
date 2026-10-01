# Fresh environment setup (new Supabase project + new Google Cloud project)

Use this when standing up a genuinely new, separate environment — e.g. the
real production Supabase/Vercel project mentioned as a future step, kept
apart from whatever shared dev/staging project this repo has been using.
It assumes nothing exists yet. If you're just adding the Google Identity
Services flow to an *already-configured* project, see the shorter
walkthrough already given in chat instead — only Part C step 3 (Authorized
JavaScript origins) applies there.

Follow the parts in order — each one depends on values produced by the
one before it.

## Part A — New Supabase project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New
   project**. Pick an org, name, a strong database password (save it
   somewhere — you'll need it for `DATABASE_URL`/`DIRECT_URL` below), and
   a region (pick one close to where most voters actually are).
2. Wait for provisioning to finish (a couple of minutes).
3. **Settings → API** — copy these two values, you'll need them in Part D:
   - **Project URL** (`https://<ref>.supabase.co`)
   - **anon / publishable key**
4. **Settings → Database → Connection string** — switch to **Connection
   pooling** and copy both:
   - **Transaction mode** (port 6543) → this becomes `DATABASE_URL`
   - **Session mode** (port 5432) → this becomes `DIRECT_URL`

   Both include a password placeholder — substitute the real database
   password from step 1.
5. **Settings → API → Service role key** — copy it (server-only, never
   expose to the browser). This becomes `SUPABASE_SERVICE_ROLE_KEY`.

### Create the dedicated `prisma` role now, not later

The shared dev project connects as the `postgres` superuser and only
flagged switching to a scoped role as a "do before production" follow-up
(see `docs/database-setup.md`). For a fresh project, just do it from the
start — no reason to carry the same follow-up forward. In the Supabase
**SQL Editor**, run:

```sql
create user "prisma" with password 'choose-a-strong-password-here' bypassrls createdb;
grant "prisma" to "postgres";
grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

Then use `prisma`/that password (not `postgres`) in `DATABASE_URL` and
`DIRECT_URL` — e.g. `postgresql://prisma.<ref>:<password>@<pooler-host>:6543/postgres?pgbouncer=true`.

### Apply the schema

With `DATABASE_URL`/`DIRECT_URL` set in `.env` (see Part D), from the
project root:

```bash
npx prisma migrate deploy
```

This is a genuinely empty database, so (unlike the shared dev project,
which ended up with its `_prisma_migrations` tracking table out of sync
with reality after some history of direct SQL edits) this should apply
all migrations cleanly in order, including RLS policies, `cast_ballot()`,
and the `candidate-media` Storage bucket.

If anything about a Storage/`auth.*`-touching migration fails under
`migrate dev` specifically, that's expected (see `docs/database-setup.md`'s
"Migration workflow note") — `migrate deploy` (used above) doesn't hit
that shadow-database limitation.

**Optional, dev/test only — never against a real production database:**

```bash
npx tsx prisma/seed.ts
```

Loads a throwaway `dev-test-event` for local poking-around. Skip this
entirely for a real production environment.

## Part B — Google Cloud project

1. [console.cloud.google.com](https://console.cloud.google.com/) → create
   a new project (or pick an existing one you control) specifically for
   this app's OAuth.
2. **APIs & Services → OAuth consent screen**:
   - User type: **External** (unless every voter is inside one Workspace
     org you fully control, in which case **Internal** skips the
     verification/test-user limits below entirely).
   - Fill in app name (e.g. "Cafton Voting"), support email, and — if you
     want Google's account-chooser and consent screens to show your own
     branding consistently — the app logo and authorized domain.
   - Add the non-sensitive scopes you need (email, profile, openid) —
     Google Identity Services' default sign-in doesn't need anything
     beyond these.
3. **APIs & Services → Credentials → Create Credentials → OAuth client
   ID** → Application type **Web application**.
   - **Authorized JavaScript origins** (for the Google Identity Services /
     `signInWithIdToken` flow this app actually uses now):
     - `http://localhost:3000`
     - every real deployed domain (Vercel's stable branch-alias URL,
       your real custom domain once attached, etc.)
   - **Authorized redirect URIs** (only needed if you also want the
     older `signInWithOAuth` redirect flow to keep working as a fallback
     — `src/app/auth/callback/route.ts` still exists for this; skip this
     entirely if you're fully committed to the Identity Services flow):
     - `https://<your-new-project-ref>.supabase.co/auth/v1/callback`
   - Save. Copy the **Client ID** (and **Client secret**, only needed if
     you're also configuring the redirect-based fallback in Supabase).
4. While the consent screen is in **Testing** status (the default, until
   you submit for verification), only up to 100 explicitly-added **test
   users** can sign in at all — **OAuth consent screen → Test users →
   Add users**, add every account you'll test with (including your own).
   This is also where you'll discover whether a Workspace-restricted
   domain (e.g. a university's) permits signing in to an unverified
   external app at all — it's untestable before this step.

## Part C — Wire Google into the app

**If you're using the redirect-based fallback too** (optional, see Part B
step 3): Supabase dashboard → **Authentication → Providers → Google** →
paste the Client ID + Client secret from Part B, enable the provider.

**For the Identity Services flow (what the app actually signs people in
with now):** no Supabase-side configuration at all — it's entirely this
app's own env var:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<the Client ID from Part B>
```

## Part D — Full environment variable reference

Copy `.env` from this project as your starting point, or build a fresh
one with these keys. **Every value below is a placeholder — none of
these are real secrets, don't reuse anything from the shared dev
project's own `.env`.**

```bash
# --- Supabase (Part A) ---
NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service role key — server-only, never NEXT_PUBLIC_>

# --- Google (Part B/C) ---
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Client ID>

# --- Voter eligibility ---
# Comma-separated, no leading "@". The actual authorization boundary
# (see src/lib/auth/eligibility.ts) - never trust a client-submitted value.
ALLOWED_VOTER_DOMAINS=s.ubaguio.edu,e.ubaguio.edu

# --- Database (Part A, via the dedicated "prisma" role) ---
DATABASE_URL="postgresql://prisma.<ref>:<password>@<pooler-host>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://prisma.<ref>:<password>@<pooler-host>:5432/postgres"

# --- Your deployed domain ---
NEXT_PUBLIC_APP_URL=https://<your-real-domain>

# --- Optional: admin invitation emails (Resend) ---
# Without this, invites still work - admins share the link manually
# instead of it being emailed. https://resend.com/api-keys
RESEND_API_KEY=
RESEND_FROM_EMAIL="Cafton Voting <invites@your-domain>"

# --- Optional: rate limiting (Upstash Redis) ---
# Without these, the app runs with no rate limiting rather than failing
# to start - an abuse-resistance layer, not something vote integrity
# depends on (that's Postgres's own unique constraint). Free tier at
# upstash.com, REST API, no server to run.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# --- Load-test harness - leave entirely UNSET on real production ---
# See docs/load-testing.md. Only ever set these on a dedicated
# staging/test project.
# ALLOW_TEST_AUTH=true
# TEST_AUTH_SECRET=
# TEST_VOTER_PASSWORD=
```

## Part E — First admin

No bootstrap-by-login-order exists (deliberately) — see
`docs/database-setup.md`'s own copy of these same steps:

1. Sign in once at `/admin/login` with the Google account that should be
   the first ADMIN (creates the `auth.users` row; you'll see permission
   errors until step 3).
2. Supabase dashboard → **Authentication → Users**, find that account,
   copy its `id`.
3. Supabase **SQL Editor**:
   ```sql
   insert into admin_users (id, auth_user_id, role, active)
   values (gen_random_uuid(), '<the-id-from-step-2>', 'ADMIN', true);
   ```
4. Reload `/admin` — now a full ADMIN, can invite others from
   `/admin/team`.

## Part F — Deploy to Vercel

1. [vercel.com/new](https://vercel.com/new) → import this repo as a new
   project (separate from whatever project the shared dev/staging
   environment uses).
2. **Project Settings → Environment Variables** — add every variable
   from Part D, for both **Production** and **Preview** environments (use
   the same new Supabase/Google project for both unless you want fully
   separate staging infrastructure too).
3. Deploy. Once you have the real assigned domain (or your own custom
   domain attached), go back to **Part B step 3** and add it to
   **Authorized JavaScript origins** — Google sign-in won't work on a
   domain it doesn't know about yet.
4. Repeat Part E against this deployment to create the first admin here
   too — admin bootstrap is per-database, not something that carries over
   from the dev project.
