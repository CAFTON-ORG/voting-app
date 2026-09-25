# Security boundaries: what actually protects each access path

This document exists because introducing Prisma changes what RLS does and
does not protect, and that must be documented precisely rather than assumed.
Every claim below is based on Supabase's own current Prisma integration
guide (https://supabase.com/docs/guides/database/prisma), not assumption.

## The one fact everything else follows from

Supabase's documented setup creates a **dedicated `prisma` Postgres role
with `BYPASSRLS`**:

```sql
create user "prisma" with password '...' bypassrls createdb;
```

**Actual status in this project:** the development database currently
connects as the `postgres` superuser (via Supabase's pooler), not yet the
scoped `prisma` role above — the SQL to create that narrower role is
staged in `docs/database-setup.md` but hasn't been run. This doesn't
change any conclusion in this document: a superuser bypasses RLS
unconditionally, same end result as `BYPASSRLS`, just with more privilege
than the app needs. Switching to the dedicated role before production is
a plain credential swap (update `DATABASE_URL`/`DIRECT_URL`), no schema or
code changes required — tracked as a pre-production hardening step, not a
blocker for development.

This means: **any query that goes through Prisma completely ignores Row
Level Security**, regardless of which policies exist on a table. That's
not a misconfiguration to fix — it's how Supabase's own guide says to set
up Prisma, because Prisma's connection has no Supabase-issued JWT for RLS
policies to evaluate against in the first place, whether it connects as
`postgres` or as the scoped `prisma` role.

## What this means for each access path

| Path | Goes through | RLS applies? | What actually protects it |
|---|---|---|---|
| Server Action / Server Component → Prisma → Postgres | `prisma` role (bypassrls) | **No** | `requireUser()`/`requireRole()` check + Zod input validation + business-rule checks in application code, run *before* every Prisma call — never optional, never "RLS will catch it" |
| Anyone with the public/publishable key calling Supabase's auto-generated PostgREST API directly (bypassing our Next.js app entirely) | `anon`/`authenticated` role | **Yes** | RLS policies, enabled with deny-by-default on every table. This is the actual reason RLS stays on: the publishable key is meant to be public (it's embedded in the browser bundle), so anyone can call `https://<project>.supabase.co/rest/v1/ballots` directly. Without RLS, that request would succeed. |
| Browser → Supabase Auth (Google OAuth) | Supabase Auth service | N/A (not a data path) | Google's own account security + Supabase Auth's session/token handling. This path only ever produces an authenticated identity, never touches application tables. |
| Candidate/event photo upload & read → Supabase Storage | Storage's own policy system (`storage.objects` RLS, separate from table RLS) | **Yes** | Storage bucket policies (public read, authenticated-admin-only write) — untouched by the Prisma/RLS-bypass issue above, since Prisma never touches Storage. |

**In short:** RLS is not this app's authorization layer for its own normal
operation — application code is. RLS remains fully enabled as a backstop
against someone going around the app entirely. Never write a comment or
doc claiming "RLS protects this" for anything reached through Prisma.

## The one place this matters most: `cast_ballot()`

The original design assumed the ballot-submission Postgres function would
call `auth.uid()` internally to establish the trusted voter identity — that
works when a function is invoked via `supabase.rpc()`, because Supabase's
client library attaches the caller's JWT to that session, and `auth.uid()`
reads it from there.

**That assumption breaks now.** `cast_ballot()` is invoked from a Server
Action via Prisma's raw-query capability (`prisma.$queryRaw`), not via
`supabase.rpc()`. Prisma's connection is a plain `prisma`-role Postgres
session with no JWT attached — `auth.uid()` inside the function would
simply return `NULL`.

**The fix, and the only correct place to make it:** the Server Action
calling `cast_ballot()` must itself call `supabase.auth.getUser()` (the
trusted, server-verified identity — never a client-submitted value) *before*
invoking Prisma, and pass the resulting user id and email as explicit
parameters into the SQL function call. The function trusts those
parameters because the only code path allowed to call it (the Server
Action) has already verified them server-side — it never re-derives
identity from Postgres session state, because there isn't any to derive it
from.

```
Browser
  ↓
Server Action ("use server")
  ↓
supabase.auth.getUser()          ← trusted identity established HERE
  ↓
prisma.$queryRaw`select cast_ballot(${voterAuthUserId}, ${voterEmail}, ...)`
  ↓
cast_ballot() runs as one Postgres transaction, using the passed-in
identity for every check — never auth.uid()
```

This is implemented in Phase 2 (ballot submission), once the function
itself is written — flagged here now because it's a direct consequence of
the Prisma decision and needs to be right from the start, not discovered
as a bug later.

## Practical rule for every future Server Action

```
Untrusted input
    ↓
Zod validation
    ↓
Supabase Auth — trusted identity (auth.getUser())
    ↓
Application-layer authorization (requireUser / requireRole / requireAnyRole)
    ↓
Business-rule checks
    ↓
Prisma (normal CRUD) — or —
Prisma.$queryRaw calling a Postgres function (atomic/critical operations)
```

Never skip a step because "the database will catch it" — for anything
reached through Prisma, the database will not catch it; RLS does not apply
here.
