# Database & Supabase setup

Status: the hosted dev project is connected and migrated (see `prisma/migrations/`).
This doc now covers what's still outstanding rather than initial setup.

## Already done

- Supabase project created, connected via `.env` (`DATABASE_URL`/`DIRECT_URL`).
- All migrations applied, including RLS (default-deny) and `cast_ballot()`.
- Dev seed data loaded (`dev-test-event`).

## Known follow-up (not blocking, tracked deliberately)

**Connection role.** The dev database currently connects as the `postgres`
superuser via Supabase's pooler, not the scoped `prisma` role Supabase's
own guide recommends. Functionally equivalent for this app (a superuser
bypasses RLS the same way `BYPASSRLS` does — see
`docs/security-boundaries.md`), but narrower privilege is better hygiene
before production. To switch: run the SQL below once in the Supabase SQL
Editor, then swap `DATABASE_URL`/`DIRECT_URL` to use the `prisma` user
instead of `postgres` — no schema or code changes needed.

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

## Still required from you — Google OAuth provider

Voter and admin sign-in are both fully coded (`src/proxy.ts`,
`src/app/auth/callback`, `GoogleSignInButton`), but **Google sign-in
won't actually work until the Google provider is configured in
Supabase**, which needs external setup only you can do:

1. In [Google Cloud Console](https://console.cloud.google.com/), create
   an OAuth 2.0 Client ID (Web application). Add
   `https://<your-project-ref>.supabase.co/auth/v1/callback` as an
   authorized redirect URI.
2. In the Supabase dashboard: **Authentication → Providers → Google**,
   paste the Client ID/Secret from step 1, enable the provider.
3. While the Google Cloud OAuth consent screen is in **Testing** status
   (the default until you submit for verification), only up to 100
   explicitly-added **test users** can sign in — add the UB test account
   (`20226926@s.ubaguio.edu`, used for testing only, never hardcoded
   anywhere in this codebase) as a test user there.
4. This is also the point where we find out whether UB's Google Workspace
   permits signing in to an external/unverified OAuth app at all — it's
   untestable until this step is done.

## Still required from you — the first ADMIN

No bootstrap-by-login-order exists (deliberately). Create exactly one
`AdminUser` row by hand, once, for whichever Google account should be the
first ADMIN — everyone after that is invited through `/admin/team`.

1. Sign in once at `/admin/login` with that Google account (this creates
   the `auth.users` row but no `AdminUser` row yet — you'll see
   "permission" errors until step 2).
2. Find that account's `auth.users.id` — Supabase dashboard →
   **Authentication → Users**, or:
   ```sql
   select id, email from auth.users where email = 'the-admin-email@example.com';
   ```
3. Insert the `AdminUser` row (run in the Supabase SQL Editor):
   ```sql
   insert into admin_users (id, auth_user_id, role, active)
   values (gen_random_uuid(), '<the-id-from-step-2>', 'ADMIN', true);
   ```
4. Reload `/admin` — that account is now a full ADMIN and can invite
   others from `/admin/team`.
