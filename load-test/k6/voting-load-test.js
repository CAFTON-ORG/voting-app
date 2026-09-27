// Progressive load test - run this same script once per level (100, 500,
// 1000, 2500, 5000, ...) by changing -e VUS/DURATION, so each level's
// results are its own clearly-labeled k6 output rather than one blended
// run. See docs/load-testing.md for the full step-by-step runbook and
// what to watch in the Supabase/Vercel dashboards while each run executes.
//
// Example:
//   k6 run load-test/k6/voting-load-test.js \
//     -e BASE_URL=https://staging.example.vercel.app \
//     -e TEST_AUTH_SECRET=... -e EVENT_SLUG=loadtest-election \
//     -e VUS=500 -e DURATION=3m
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, EVENT_SLUG, VOTER_DOMAIN, VOTER_POOL_SIZE, authHeaders } from "./config.js";
import {
  publicReadDuration,
  authLoginDuration,
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

export const options = {
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

export function setup() {
  const res = http.get(`${BASE_URL}/api/load-test/event-info?slug=${EVENT_SLUG}`, {
    headers: authHeaders(),
  });
  if (res.status !== 200) {
    throw new Error(`event-info setup call failed: ${res.status} ${res.body}`);
  }
  const info = JSON.parse(res.body);
  if (info.categories.some((c) => c.candidateIds.length === 0)) {
    throw new Error("Every category in the load-test event needs at least one active candidate");
  }
  return info;
}

function pickVoterEmail() {
  // Spreads usage across the whole provisioned pool rather than every VU
  // reusing voter #1 - deliberately still lets the same voter come up
  // again across iterations/VUs, since a realistic mix of fresh votes,
  // "already voted" retries, and rate-limited retries is exactly what's
  // being measured, not something to avoid.
  const index = (((__VU * 2654435761) >>> 0) + __ITER) % VOTER_POOL_SIZE + 1;
  return `loadtest-voter-${index}@${VOTER_DOMAIN}`;
}

function login(email) {
  const res = http.post(`${BASE_URL}/api/test-auth`, JSON.stringify({ email }), {
    headers: authHeaders({ "Content-Type": "application/json" }),
    tags: { name: "auth_login" },
  });
  authLoginDuration.add(res.timings.duration);
  const ok = check(res, { "login succeeded": (r) => r.status === 200 });
  if (!ok) hardErrors.add(1, { type: "auth_login" });
  return ok;
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

/** One simulated voter's full session: sign in (via the staging-only
 * /api/test-auth shim, never Google), load the real vote page under that
 * session, then submit a ballot through the load-test shim that calls the
 * real castBallotAction. This is deliberately "one iteration = one
 * voter, once" - that's what a real voter does, not a loop. */
export function votingFlow(eventInfo) {
  const email = pickVoterEmail();
  if (!login(email)) return;

  const pageRes = http.get(`${BASE_URL}/events/${EVENT_SLUG}/vote`, { tags: { name: "vote_page" } });
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
    { headers: authHeaders({ "Content-Type": "application/json" }), tags: { name: "ballot_submit" } }
  );
  classifyAndRecordBallotResult(submitRes);
}

/** Someone just checking whether voting has opened yet - the highest-
 * volume, lowest-cost request pattern, and the one src/lib/events/public-
 * queries.ts's caching is specifically meant to absorb. */
export function publicReads() {
  const homeRes = http.get(`${BASE_URL}/`, { tags: { name: "home" } });
  publicReadDuration.add(homeRes.timings.duration);
  if (!check(homeRes, { "home loaded": (r) => r.status === 200 })) hardErrors.add(1, { type: "home" });

  sleep(Math.random() * 2);

  const eventRes = http.get(`${BASE_URL}/events/${EVENT_SLUG}`, { tags: { name: "event_page" } });
  publicReadDuration.add(eventRes.timings.duration);
  if (!check(eventRes, { "event page loaded": (r) => r.status === 200 })) hardErrors.add(1, { type: "event_page" });

  sleep(Math.random() * 3);
}
