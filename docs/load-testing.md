# Load testing this app before a real election

## Safety rules — read this before running anything

1. **Never run these tests against the real production Supabase project or
   Vercel deployment.** Use a dedicated staging Supabase project and a
   staging Vercel deployment, provisioned the same way as production (see
   `docs/database-setup.md`), with disposable test data.
2. **Never enable `ALLOW_TEST_AUTH`/`TEST_AUTH_SECRET`/`TEST_VOTER_PASSWORD`
   on the real production project's environment variables.** These three
   env vars are what turn on `/api/test-auth`, `/api/load-test/cast-ballot`,
   and `/api/load-test/event-info` (see those files under `src/app/api/`).
   Without them, all three routes 404 unconditionally — that's the actual
   safety boundary, not `NODE_ENV` (Next.js sets `NODE_ENV=production` for
   every `next build`, including staging/preview deployments, so it can't
   be used to distinguish staging from real production).
3. **Never point k6 at Google's OAuth endpoints.** The whole point of the
   `/api/test-auth` shim is to exercise the exact same downstream identity/
   authorization/rate-limit/database path a real Google sign-in produces,
   without ever touching Google's servers.

## One-time staging setup

1. Provision a staging Supabase project (same one-time setup as
   `docs/database-setup.md`: the `prisma` role, migrations, storage
   bucket, Google provider connection, first `AdminUser` row).
2. Deploy this app to a staging Vercel project pointed at that Supabase
   project, with these additional env vars set **only on that staging
   project**:
   - `ALLOW_TEST_AUTH=true`
   - `TEST_AUTH_SECRET=<a long random string>`
   - `TEST_VOTER_PASSWORD=<a long random string>` — never sent to k6, only
     read server-side by `/api/test-auth`.
3. In the staging admin UI, create one real event dedicated to load
   testing — e.g. "Load Test Election" — with `allowedDomains` set to
   `loadtest.internal` (or whatever domain you pass as `VOTER_DOMAIN`
   below), at least 2 categories, and at least 1 active candidate per
   category. Move it to `OPEN`.
4. Provision test voters (staging env only):
   ```bash
   npx tsx --env-file=.env.staging load-test/provision-test-voters.mts 5000 loadtest.internal
   ```
   Creates `loadtest-voter-1@loadtest.internal` .. `loadtest-voter-5000@...`,
   confirmed and ready to sign in immediately. Idempotent — safe to rerun.
5. Look up the event's ids:
   ```bash
   curl -s "https://<staging-url>/api/load-test/event-info?slug=<slug>" \
     -H "x-test-auth-secret: <TEST_AUTH_SECRET>" | jq
   ```
   (Just to sanity-check the route works — the k6 scripts fetch this
   themselves in `setup()`.)

## Running the progressive levels (100 → 500 → 1,000 → 2,500 → 5,000+)

Run the **same** script once per level so each level's results are its own
clearly-separated k6 summary. `mkdir -p load-test/results` once first —
`--summary-export` writes a file but won't create a missing directory.

```bash
k6 run load-test/k6/voting-load-test.js \
  -e BASE_URL=https://<staging-url> \
  -e TEST_AUTH_SECRET=<same as staging env> \
  -e EVENT_SLUG=<slug> \
  -e VOTER_DOMAIN=loadtest.internal \
  -e VOTER_POOL_SIZE=5000 \
  -e VUS=100 -e DURATION=3m \
  --summary-export=load-test/results/summary-100.json
```

Then repeat with `VUS=500`, `1000`, `2500`, `5000`, and beyond, watching the
dashboards (next section) at every level. Between levels, reset the ballot
data so voters can submit fresh again instead of only exercising the
"already voted" path:

```bash
npx tsx --env-file=.env.staging load-test/reset-test-event-ballots.mts <eventId>
```

`VUS` splits 80/20 between people just browsing (`public_reads` scenario)
and people actually mid-vote (`voting_flow` scenario) by default — pass
`-e PUBLIC_SHARE=0.5` etc. to change that ratio.

## Running the spike scenario (voting just opened)

```bash
k6 run load-test/k6/spike-test.js \
  -e BASE_URL=https://<staging-url> \
  -e TEST_AUTH_SECRET=<same as staging env> \
  -e EVENT_SLUG=<slug> \
  -e VOTER_DOMAIN=loadtest.internal \
  -e VOTER_POOL_SIZE=5000 \
  -e PEAK_VUS=5000 \
  --summary-export=load-test/results/spike-summary.json
```

This ramps from 0 to `PEAK_VUS` in 20 seconds (not gradually over minutes)
— the shape that actually matches "voting opens and everyone who's been
waiting hits refresh at once," which is a materially harder case than a
steady climb.

## Generating a report

Once you have one `--summary-export` JSON file per level (plus the spike
run), turn them into a single readable report:

```bash
node load-test/generate-report.mjs \
  --title "Election Load Test — <date>" \
  --run 100=load-test/results/summary-100.json \
  --run 500=load-test/results/summary-500.json \
  --run 1000=load-test/results/summary-1000.json \
  --run 2500=load-test/results/summary-2500.json \
  --run 5000=load-test/results/summary-5000.json \
  --run spike=load-test/results/spike-summary.json \
  --out load-test/results/report.html
```

This always writes a print-ready `report.html` — open it in any browser
and use **Print → Save as PDF** for a shareable PDF, no extra tooling
needed. If you'd rather get the PDF directly from the script:

```bash
npm install --no-save playwright && npx playwright install chromium
node load-test/generate-report.mjs ... # same command as above
```

`--no-save` keeps Playwright out of `package.json` — it's a one-off report-
generation tool, not something the app itself depends on. Safe to
`npm uninstall playwright` afterward; rerunning the install line above
brings it back on demand next time.

The report shows, per level: p95 for public reads/vote page/ballot submit,
p99 for ballot submit specifically, and a breakdown of every ballot-submit
attempt into votes cast / already-voted / rate-limited / other-rejection /
hard-errors — plus a quick HEALTHY/DEGRADED/ATTENTION read per row (see
the report's own legend for exactly what each means).

## What to watch during every run

### Supabase dashboard (Project → Reports / Database)

| Panel | What a problem looks like | Why it matters here |
|---|---|---|
| **Database → Connections** (active/pooled) | Climbing toward the compute tier's max and flattening at the ceiling | This project is currently on **Free (Nano compute)**: 60 max direct Postgres connections, 200 max Supavisor pooler client connections, with the pooler's own `pool_size` to Postgres itself set well below that (check your project's exact value in Database Settings → Connection Pooling — it's configurable but capped by compute size). This is the single most likely thing to actually break under real concurrent load, per the audit — not application code. |
| **Database → CPU/RAM usage** | Sustained near 100% | Nano is shared/burstable compute (0.5GB RAM) — this is a small instance, and heavy concurrent query load will show up here before anything else. |
| **Auth → Active users / sign-in rate** | Errors or elevated latency on password grants | `/api/test-auth` uses real `signInWithPassword` calls — Supabase Auth itself has its own rate limits per project, separate from Postgres. |
| **Logs → Postgres logs** | `too many connections`, `remaining connection slots are reserved`, deadlocks | Direct evidence of pool exhaustion, not just an inference from latency. |

### Vercel dashboard (Project → Observability / Logs)

| Panel | What a problem looks like | Why it matters here |
|---|---|---|
| **Function invocations & concurrency** | Concurrency flattening at your plan's ceiling | Every concurrent function instance opens its own Prisma pool (currently `max: 3`, see `src/lib/prisma/client.ts`) — total Postgres-facing connections ≈ `concurrent instances × 3`, which is what actually threatens the Supabase limits above. |
| **Function duration (p50/p95/p99)** | Rising toward your function timeout (Vercel's default is plan-dependent — check `vercel.json`/project settings; this app has no `maxDuration` override) | A function killed mid-request due to a timeout looks like a hard error to a voter, not a slow page. |
| **Function errors** | Any 5xx spike | Cross-reference the timestamp against the Supabase connection graph — a 5xx spike lining up with a connection-count plateau is the pool-exhaustion signature. |
| **Edge/Image Optimization requests** | Elevated duration or errors on `/_next/image` | Image transformation is CPU-bound per request — a real, separate bottleneck from the database under heavy concurrent page loads with many candidate photos. |

## Reading the k6 output

Custom metrics (defined in `load-test/k6/metrics.js`), reported per run:

- `public_read_duration` (p50/p95/p99) — home + event page load times.
- `auth_login_duration` — the `/api/test-auth` sign-in call.
- `vote_page_duration` — the authenticated ballot page render (this is the
  one that exercises `getVotableEvent`/`hasVoterParticipated` on every
  single request, deliberately never cached — see `next.config.ts`'s
  `staleTimes: { dynamic: 0 }` and `src/lib/events/public-queries.ts`'s own
  comment on why voting eligibility is never cached).
- `ballot_submit_duration` — the actual `castBallotAction` call.
- `ballot_success_total` / `ballot_already_voted_total` /
  `ballot_rate_limited_total` / `ballot_other_rejection_total` — every
  submit attempt lands in exactly one bucket. Rising `rate_limited` under
  heavy repeated-attempt load is the rate limiter **working correctly**,
  not a problem — see `src/lib/rate-limit/client.ts`.
- `hard_errors_total` — tagged by `type` (`auth_login`, `vote_page`,
  `ballot_submit`, `home`, `event_page`). This is the one that means a
  real infrastructure failure (5xx, unparseable response, network error) —
  not an expected business rejection.

k6's own built-in `http_req_duration` and `http_req_failed` give the
overall picture; the custom metrics above break it down by exactly what
the request was doing, which a single blended number can't show.

## Cleanup

- Between repeat runs against the same event: `reset-test-event-ballots.mts`
  (above) — keeps the same voter pool, wipes only ballots/participation.
- Once done with a voter pool entirely:
  ```bash
  npx tsx --env-file=.env.staging load-test/cleanup-test-voters.mts loadtest.internal
  ```
  Deletes every Supabase Auth user under that domain.
