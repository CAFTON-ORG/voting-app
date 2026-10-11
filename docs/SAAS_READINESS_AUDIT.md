# SaaS readiness audit

Phase 1 deliverable only — an honest inventory of what exists today and what
a multi-tenant commercial transformation would actually require. No code
changes are included in this pass. Every claim below was verified by reading
the actual current code/migrations/docs/git history, not assumed.

## 1. Current architecture summary

- **Stack:** Next.js 16.3.6 (App Router, Turbopack), React 19.2.8, TypeScript,
  Prisma 7.10.0 via `@prisma/adapter-pg` (raw `pg`, not Prisma's Accelerate),
  Supabase (Postgres + Auth + Storage), Tailwind v4, shadcn/ui, Zod v4,
  react-hook-form, Upstash Redis (rate limiting + a read cache), Resend
  (admin-invite email only), deployed on Vercel.
- **Auth:** Google Identity Services + `supabase.auth.signInWithIdToken()`
  (migrated off a redirect-based `signInWithOAuth` flow this past week —
  `feat/google-id-token-auth`, merged). Voters have no account/signup at
  all — eligibility is pure domain-matching (`Event.allowedDomains`) against
  the Google account that signed in. Admins are a separate `AdminUser` row
  (`ADMIN`/`MODERATOR`/`AUDITOR`), invited by email, with a strict role
  hierarchy (`src/lib/auth/permissions.ts`): an actor can only manage a role
  strictly below their own — **two `ADMIN`s can never manage each other
  through the app**, by design, same friction as first-admin bootstrap.
- **Voting engine:** a single Postgres function, `cast_ballot()`
  (`SECURITY DEFINER`, called via `prisma.$queryRaw`), is the only code path
  allowed to write a vote. Called with an explicitly-passed, server-verified
  identity (never `auth.uid()` — Prisma's connection carries no Supabase JWT,
  documented precisely in `docs/security-boundaries.md`).
- **Authorization model:** RLS is enabled default-deny on every table, but
  is **not** this app's real authorization layer — Prisma connects with a
  role that bypasses RLS entirely (currently the `postgres` superuser, not
  yet the scoped `prisma` role Supabase's own guide recommends — a staged,
  not-yet-urgent hardening step). The actual boundary is application code:
  `requireUser()`/`requireRole()`/`requirePermission()` before every Prisma
  call. RLS's only real job is blocking direct PostgREST access with the
  public key.
- **Tenancy:** **none.** Every table (`Event`, `AdminUser`, `AuditLog`, etc.)
  is global. One Supabase project, one Google Cloud OAuth client, one Vercel
  deployment, one domain (`mmsit.cafton.com`), implicitly scoped to one
  customer (University of Baguio SIT) by convention, not by any enforced
  boundary in the schema or code.
- **Public site:** home page + per-event pages + vote page + a privacy
  policy page, all specific to this one running election. No pricing,
  features, demo, how-it-works, or contact pages exist. Separately, Cafton's
  actual marketing site (`cafton-landing`) is a **different repository**
  entirely, sitting as a sibling folder — worth a real decision (§9) on
  whether "Cafton Voting" marketing pages belong in this repo or there.

## 2. Existing functionality inventory

| Area | What exists |
|---|---|
| Event lifecycle | `DRAFT → SCHEDULED → OPEN → PAUSED → CLOSED → FINALIZED`, admin-driven, data-driven (not hardcoded to one event's shape) |
| Candidates/categories | Full CRUD, photo upload (Supabase Storage), activate/deactivate (not delete, once voting could have started), structural-change lockout once live |
| Voting | Domain eligibility, one-ballot-per-account (Postgres unique constraint, not app logic), anonymous ballot storage separated from voter identity, Mode B (access-code) schema exists but dormant/unused |
| Admin team | Invite by email+role, role change, deactivate, reactivate (just added), audit-logged |
| Results | Live (while OPEN/PAUSED) and final (after CLOSED/FINALIZED) tallies, per-candidate aggregation, export permission exists in the permission matrix |
| Audit log | Append-only, survives deletion of the event/admin it refers to (`SetNull`, not `Restrict`) |
| Rate limiting | Upstash sliding-window on ballot submission, fail-open (never blocks a legit vote if Redis is down), keyed by trusted identity |
| Load testing | A real k6 harness (`load-test/`) with its own safety guard — `/api/test-auth` etc. 404 unconditionally unless `ALLOW_TEST_AUTH`+`TEST_AUTH_SECRET` are both set, and explicitly refuses to run on `VERCEL_ENV=production` regardless |
| Tests | **None.** `vitest` is configured in `package.json`, but zero `*.test.ts` files exist anywhere under `src/` or `prisma/`. CI (`ci.yml`) runs typecheck/lint/build only — no test step, because there's nothing to run yet |

## 3. Reusable features

Most of the above is genuinely reusable as-is for a multi-tenant product,
*once scoped to an organization*:

- The event state machine, candidate lifecycle, and ballot model need no
  redesign — they just need an `organizationId` and tenant-aware queries.
- The permission-matrix pattern (`PERMISSIONS` as data, `ROLE_PERMISSIONS`
  lookup, `canManageRole`/`canInviteRole` hierarchy) generalizes cleanly to
  an org-scoped role system — it's already structured as data, not scattered
  `role === "ADMIN"` checks.
- `cast_ballot()`'s identity-passed-explicitly pattern, the RLS-is-a-backstop
  model, and the audit-log shape all carry over unchanged.
- The Google Identity Services sign-in flow is tenant-agnostic by nature —
  voters authenticate with their own Google account regardless of which
  org's event they're voting in; tenant resolution happens *after* the
  token exchange, via which event/org URL they arrived through, not via a
  separate OAuth client per tenant.

## 4. Technical debt

- **`docs/production-checklist.md` is stale** — written for the old
  `signInWithOAuth` flow; its "Supabase Auth URL Configuration / Redirect
  URLs" step no longer applies to `signInWithIdToken`. Needs reconciling
  before anyone follows it for a real deployment.
- **No automated tests at all.** The master prompt's success criteria
  ("meaningful automated tests," "tenant isolation is verified," "voting
  integrity is preserved under concurrent load") currently require building
  a test suite from zero, not extending one.
- **Prisma connects as the `postgres` superuser**, not the scoped
  `bypassrls` `prisma` role Supabase's guide recommends. Documented,
  low-risk today (a superuser and a `bypassrls` role have the identical
  RLS-bypass effect), but a real pre-production hardening item — purely a
  credential swap, no schema/code change.
- **Status-badge overload:** a deactivated `AdminUser` and an actually-
  expired invitation both render as `"EXPIRED"` in `/admin/team` — works,
  but is a confusing shared label for two different states.
- **R2 storage migration is a written proposal only** (`docs/r2-storage-
  migration.md`), not implemented — currently fine at this scale, becomes
  relevant if a SaaS product's candidate-photo egress grows across many
  tenants.

## 5. Security concerns

- No findings that contradict `docs/security-boundaries.md`'s own model —
  it's accurate and the code matches it. The one open item is the
  superuser-vs-scoped-role gap above.
- **Tenant isolation does not exist yet, because tenancy doesn't exist
  yet.** This is the master prompt's single largest security requirement
  (§4: "ensure tenant IDs cannot simply be changed... implement defense in
  depth... add tests that attempt cross-tenant access") and it's a ground-up
  build, not a hardening pass.
- Google OAuth consent-screen verification is mid-process right now (hit a
  real rejection this session over privacy-policy content sufficiency,
  since fixed) — multi-tenant SaaS doesn't change this mechanically (one
  shared OAuth client still works across tenants, per §3), but the app's
  "brand identity" shown on Google's consent screen would need to represent
  Cafton Voting as a product, not one university's election.

## 6. Database and concurrency concerns

This is the one area with real, already-measured evidence, not speculation:

- **`cast_ballot()` originally held an exclusive row lock on the `Event`
  row for its entire execution** — every write (participation, ballot,
  selections, audit log), not just the final check. Under a 500-concurrent-
  voter k6 run (`load-test/results/500vu.json`, 2026-09-27), this produced
  **p95 latency of ~57 seconds and a near-total failure rate** — full
  serialization of every vote for one event into a single-file queue.
- **This was already root-caused and partially fixed**
  (`prisma/migrations/20260929080534_cast_ballot_minimize_lock_scope`): all
  validation that can't change after an event leaves `DRAFT`/`SCHEDULED`
  now runs unlocked first; the lock is acquired only for the minimal
  re-verify-and-write path. The fix is real and in production.
- **The fix has never been re-validated at the scale that broke it.**
  Every load-test result file after that migration (`bothfixes-100vu.json`,
  `rediscache-100vu.json`, etc.) only goes up to 100 VUs. **There is
  currently no evidence this holds at 500, let alone the master prompt's
  implicit "thousands of simultaneous voters" bar** — that claim should not
  be made to a customer without re-running the existing k6 harness at scale
  first.
- **Prisma's connection pool was previously undersized for how Vercel
  actually runs** (`max: 3`, assuming one request per warm instance; fixed
  to `max: 10` once Fluid Compute's actual concurrency model was accounted
  for — comfortably under Supavisor's 200-client pooler cap). This fix is
  also real and already in place.
- **The current production Supabase project is on the Free/Nano compute
  tier: 60 max direct Postgres connections, 200 max pooler connections.**
  This is an infrastructure ceiling independent of any app-code fix, and
  the project's own `docs/load-testing.md` already names it as "the single
  most likely thing to actually break under real concurrent load." A real
  SaaS product serving multiple simultaneous tenant elections would need
  this evaluated, not assumed away.

## 7. SaaS migration requirements

In order of how foundational each one is:

1. **An `Organization` model**, with every existing table gaining an
   `organizationId` (or reaching it transitively through `Event`) and every
   query becoming tenant-scoped.
2. **Organization-scoped membership/roles**, layered on top of (not
   replacing) the existing permission-matrix pattern.
3. **Tenant-aware routing** for the public voting pages — a decision point,
   not yet made (subdomain per org? path-based? custom domain per org? —
   see §9).
4. **Re-validated voting-engine performance** at the scale any commercial
   claim would actually promise, using the load-test harness that already
   exists.
5. **A real test suite** — starting with the highest-risk paths: concurrent
   ballot submission, duplicate-vote prevention, cross-tenant access
   attempts, eligibility edge cases.
6. **Billing/entitlements**, which has zero existing scaffolding to build
   on — this is net-new, not a migration of something partial.

## 8. Proposed target architecture

A **multi-tenant modular monolith**, matching the master prompt's own
default and this codebase's existing shape (it's already organized by
domain area under `src/actions/`, `src/lib/`, not by technical layer) —
there is no demonstrated need for microservices here, and introducing one
would contradict the project's own standing rule against adding
infrastructure without confirming the need first.

Candidate module boundaries, mapped to what already exists vs. what's net
new:

| Module | Status |
|---|---|
| Identity & Authentication | Exists, tenant-agnostic by nature |
| Organizations & Tenancy | **Net new** |
| Membership & Authorization | Partial — permission-matrix pattern exists, needs an org scope added |
| Events | Exists, needs `organizationId` |
| Candidates & Categories | Exists, needs `organizationId` (via Event) |
| Voting & Ballots | Exists, needs re-validated performance at scale |
| Eligibility & Voting Policies | Exists (domain mode); access-code mode exists in schema but unused |
| Results & Reporting | Exists |
| Plans & Entitlements | **Net new** |
| Billing & Payments | **Net new** |
| Notifications | Partial — Resend wired for admin invites only |
| Audit Logs | Exists, needs an org scope added |
| Platform Administration | **Net new** (a Cafton-side super-admin view across all tenants) |

## 9. Risks and dependencies — decisions needed before Phase 2

These require a business/product call, not an engineering default:

- **Where does the Cafton Voting marketing site actually live** — inside
  this repo, or as part of the separate `cafton-landing` project? They're
  currently two different codebases.
- **Tenant routing scheme** — subdomain (`org.caftonvoting.com`), path-based
  (`caftonvoting.com/org`), or bring-your-own-domain per customer? This
  affects the Google OAuth "Authorized JavaScript origins" list, Vercel
  domain configuration, and the Supabase project's Auth Site URL — all
  places this session already touched once for a single domain.
- **One shared Supabase project for all tenants, or one per tenant?** The
  existing `docs/production-checklist.md` already flagged this exact
  question for just two environments (dev vs. prod); a real multi-tenant
  product multiplies it.
- **What "thousands of simultaneous voters" actually needs to mean**,
  commercially — a specific, customer-facing capacity number should come
  from a re-run load test, not be asserted.
- **Payment provider and legal review** — out of scope for any engineering
  work until explicitly approved, per the master prompt's own rule.

## 10. Prioritized implementation roadmap (proposed, pending approval)

1. Re-run the existing k6 harness at 500/1,000+ VUs against a disposable
   staging project, to get a real, current capacity number before any
   commercial claim is made — cheap, fast, and resolves the single biggest
   unverified assumption in this audit.
2. Reconcile `docs/production-checklist.md` with the current auth flow.
3. Stand up `Organization` as a model, with every existing table gaining
   tenant scope — the one genuinely foundational, hard-to-retrofit change
   everything else depends on.
4. Build the first real test suite around the highest-risk paths (ballot
   concurrency, cross-tenant access, eligibility).
5. Only then: marketing site, dashboard redesign, billing — all of which
   are safe to defer without blocking anything else, and all of which the
   master prompt itself says to pause for approval on before going further.
