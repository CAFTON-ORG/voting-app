// Progressive load test - run this same script once per level (100, 500,
// 1000, 2500, 5000, ...) by changing -e VUS/DURATION, so each level's
// results are its own clearly-labeled k6 output rather than one blended
// run. See docs/load-testing.md for the full step-by-step runbook and
// what to watch in the Supabase/Vercel dashboards while each run executes.
//
// Authentication happens ONCE, up front, in setup() - never inside the
// timed load phase. A real voter authenticates once (via Google OAuth in
// production) and then just carries that session; a k6 iteration calling
// /api/test-auth on every loop doesn't reflect that; it hammers Supabase
// Auth's own /auth/v1/token endpoint, which defaults to 150 requests per
// 5 minutes PER IP (per Supabase's own docs) - and every k6 VU shares the
// same IP, the load-generator machine's. A first version of this test
// tripped that limit at just 20 looping VUs, produced a wave of 429s that
// had nothing to do with voting-system capacity, and made the whole run's
// numbers unreliable. See auth-capacity-test.js for testing that endpoint
// specifically, in isolation, with its own separate metrics.
//
// Example:
//   k6 run load-test/k6/voting-load-test.js \
//     -e BASE_URL=https://staging.example.vercel.app \
//     -e TEST_AUTH_SECRET=... -e EVENT_SLUG=loadtest-election \
//     -e VUS=500 -e DURATION=3m
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, EVENT_SLUG, vercelBypassHeaders, authHeaders } from "./config.js";
import { establishSessions } from "./sessions.js";
import {
  publicReadDuration,
  votePageDuration,
  ballotSubmitDuration,
  ballotSuccess,
  ballotAlreadyVoted,
  ballotRateLimited,
  ballotOtherRejection,
  hardErrors,
} from "./metrics.js";

const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || "2m";
// Real traffic on a voting day is roughly 80% people just checking status/
// browsing and 20% people actually mid-vote at any given moment - split
// the VU pool the same way rather than giving both scenarios equal weight.
const PUBLIC_SHARE = Number(__ENV.PUBLIC_SHARE || 0.8);
// How many distinct authenticated sessions to establish during setup().
// This is deliberately NOT tied to VUS - it doesn't need to be. Sessions
// are reused across iterations (a session submitting a second ballot just
// correctly gets "already voted", which is itself a real outcome worth
// measuring), and a bigger pool only helps if you specifically want more
// unique first-time voters represented in one run. Default covers the
// voting_flow VU count with some headroom.
const SESSION_POOL_SIZE = Number(__ENV.SESSION_POOL_SIZE || Math.max(20, Math.round(VUS * (1 - PUBLIC_SHARE) * 1.5)));
// Spacing between each setup-phase login call, in seconds. At the default
// 1.5s, a 40-session pool takes ~60s to build and sits comfortably under
// Supabase's 150/5min-per-IP budget even stacked on top of whatever a
// prior run in the same 5-minute window already used.
const SETUP_LOGIN_DELAY_SECONDS = Number(__ENV.SETUP_LOGIN_DELAY_SECONDS || 1.5);

export const options = {
  // k6's default setupTimeout is 60s - establishing a session pool takes
  // longer than that once you add up each login's real request latency on
  // top of the deliberate SETUP_LOGIN_DELAY_SECONDS spacing (a 30-session
  // pool alone was clocked at over 60s). Generous headroom here costs
  // nothing if setup finishes early.
  setupTimeout: "5m",
  scenarios: {
    public_reads: {
      executor: "constant-vus",
      vus: Math.max(1, Math.round(VUS * PUBLIC_SHARE)),
      duration: DURATION,
      exec: "publicReads",
    },
    voting_flow: {
      executor: "constant-vus",
      vus: Math.max(1, Math.round(VUS * (1 - PUBLIC_SHARE))),
      duration: DURATION,
      exec: "votingFlow",
      // Gives setup()'s sequential, rate-limit-respecting session
      // establishment time to finish before the timed load phase starts -
      // setup() itself isn't part of any scenario's timed duration, but
      // this keeps the k6 progress output honest about when "the test"
      // (as opposed to "preparing for the test") is actually running.
      startTime: "0s",
    },
  },
  thresholds: {
    // Starting points, not a pass/fail gate carved in stone - tighten
    // these once a baseline run tells you what "normal" actually looks
    // like on your infra. A threshold breach doesn't fail the deployment,
    // it fails k6's own exit code, which is useful in CI later.
    http_req_failed: ["rate<0.05"],
    public_read_duration: ["p(95)<1500"],
    ballot_submit_duration: ["p(95)<3000"],
  },
};

/** Runs once, sequentially, before any VU starts iterating - this is
 * where ALL authentication happens for this test. Real server-side
 * identity/authorization checks still run for real on every subsequent
 * request (getTrustedIdentity() verifies the actual session cookie via
 * Supabase on every call, exactly like production) - only the repeated
 * *calling of the login endpoint itself* is removed, because that's the
 * part that doesn't reflect a real voter's behavior. */
export function setup() {
  return establishSessions(SESSION_POOL_SIZE, SETUP_LOGIN_DELAY_SECONDS);
}

function classifyAndRecordBallotResult(res) {
  ballotSubmitDuration.add(res.timings.duration);
  if (res.status >= 500) {
    hardErrors.add(1, { type: "ballot_submit" });
    return;
  }
  let body;
  try {
    body = JSON.parse(res.body);
  } catch {
    hardErrors.add(1, { type: "ballot_submit_unparseable" });
    return;
  }
  if (body.ok) {
    ballotSuccess.add(1);
    return;
  }
  const message = body.message || "";
  // Exact strings from src/actions/voting/errors.ts (P0014) and the rate-
  // limit message built in src/actions/voting/cast-ballot.ts.
  if (/already voted/i.test(message)) {
    ballotAlreadyVoted.add(1);
  } else if (/too many attempts/i.test(message)) {
    ballotRateLimited.add(1);
  } else {
    ballotOtherRejection.add(1);
  }
}

/** One simulated voter's session, reusing a cookie header established
 * back in setup() - no call to /api/test-auth happens here. Loads the
 * real vote page under that session (getTrustedIdentity/eligibility/
 * hasVoterParticipated all execute for real against the cookie), then
 * submits a ballot through the load-test shim that calls the real
 * castBallotAction. */
export function votingFlow(data) {
  const { eventInfo, sessions } = data;
  const cookieHeader = sessions[(__VU + __ITER) % sessions.length];

  const pageRes = http.get(`${BASE_URL}/events/${EVENT_SLUG}/vote`, {
    headers: vercelBypassHeaders({ Cookie: cookieHeader }),
    tags: { name: "vote_page" },
  });
  votePageDuration.add(pageRes.timings.duration);
  if (!check(pageRes, { "vote page loaded": (r) => r.status === 200 })) {
    hardErrors.add(1, { type: "vote_page" });
  }

  const selections = eventInfo.categories.map((category) => ({
    categoryId: category.categoryId,
    candidateId: category.candidateIds[Math.floor(Math.random() * category.candidateIds.length)],
  }));

  const submitRes = http.post(
    `${BASE_URL}/api/load-test/cast-ballot`,
    JSON.stringify({ eventId: eventInfo.eventId, selections }),
    {
      headers: authHeaders({ "Content-Type": "application/json", Cookie: cookieHeader }),
      tags: { name: "ballot_submit" },
    }
  );
  classifyAndRecordBallotResult(submitRes);
}

/** Someone just checking whether voting has opened yet - the highest-
 * volume, lowest-cost request pattern, and the one src/lib/events/public-
 * queries.ts's caching is specifically meant to absorb. Deliberately
 * unauthenticated, same as a real anonymous visitor. */
export function publicReads() {
  const homeRes = http.get(`${BASE_URL}/`, { headers: vercelBypassHeaders(), tags: { name: "home" } });
  publicReadDuration.add(homeRes.timings.duration);
  if (!check(homeRes, { "home loaded": (r) => r.status === 200 })) hardErrors.add(1, { type: "home" });

  sleep(Math.random() * 2);

  const eventRes = http.get(`${BASE_URL}/events/${EVENT_SLUG}`, {
    headers: vercelBypassHeaders(),
    tags: { name: "event_page" },
  });
  publicReadDuration.add(eventRes.timings.duration);
  if (!check(eventRes, { "event page loaded": (r) => r.status === 200 })) hardErrors.add(1, { type: "event_page" });

  sleep(Math.random() * 3);
}
