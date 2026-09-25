# Database setup — hosted Supabase development project

Per your instruction, this uses your hosted Supabase project for
development/migrations/RLS testing — no local or containerized database.
This is the one-time setup needed before Phase 1's migrations can be run.

## 1. Create (or reuse) a Supabase project

Free tier is sufficient at this stage. Note the project's region — you'll
need it for the connection strings below.

## 2. Create the dedicated `prisma` Postgres role

Run this once in the Supabase dashboard's **SQL Editor** (not something I
should run for you — it sets a password you choose, and it's a privileged
role-creation statement worth running deliberately yourself). This is
copied verbatim from Supabase's own current Prisma integration guide:

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

The `bypassrls` here is intentional and expected — see
`docs/security-boundaries.md` for exactly what that means for this app's
security model. It is not a mistake to fix.

## 3. Get the connection strings

From Supabase's dashboard: **Project Settings → Database → Connection
string**, using the `prisma` role's credentials instead of `postgres`:

- **DATABASE_URL** (runtime, serverless-safe): the **Transaction pooler**
  string, port `6543`, with `?pgbouncer=true` appended.
- **DIRECT_URL** (Prisma CLI/migrations only): the **Session pooler** or
  **Direct connection** string, port `5432`.

## 4. What I need from you to continue Phase 1

Place these in a local `.env.local` (already gitignored — never commit it,
never paste real secrets into chat):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
```

The first three come from **Project Settings → API** and aren't needed
until Phase 2 (auth), but grabbing them now saves a second trip. Once
`.env.local` has `DATABASE_URL`/`DIRECT_URL`, tell me and I'll run the
initial migration, add the RLS policies and `cast_ballot()` function as a
follow-up migration, and run the constraint/duplicate-vote tests against
the real project.
