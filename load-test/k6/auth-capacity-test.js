// Measures ONE thing: how src/app/api/test-auth (and, behind it,
// Supabase's own /auth/v1/token?grant_type=password endpoint) behaves
// under repeated concurrent login attempts. This is the ONLY script in
// this suite where calling the login endpoint repeatedly is correct - its
// entire purpose is to probe that endpoint specifically, in isolation.
//
// IMPORTANT - read before drawing any conclusion from this result:
//
// 1. This does NOT measure production authentication capacity. Production
//    voters sign in via Google OAuth - an entirely different endpoint and
//    flow, with its own (and Google's own) rate-limit characteristics,
//    which this suite never tests (see docs/load-testing.md's safety
//    rules - we don't load-test Google's servers). This script only
//    measures the staging-only password-grant path this test harness
//    itself uses as a Google OAuth stand-in.
//
// 2. Supabase's token endpoint defaults to 150 requests per 5 minutes PER
//    IP (per Supabase's own docs), and k6 runs from one machine - one IP.
//    That means running more VUs here does NOT let you measure a higher
//    ceiling; it just guarantees a higher 429 rate once you're over ~30
//    requests in a burst / ~150 in 5 minutes. AUTH_VUS defaults to a
//    modest number for exactly this reason - this is intentionally not a
//    "how high can we push it" test.
//
// 3. Keep this result in its own section of any report - never blended
//    into or compared against voting_flow/public_reads numbers from
//    voting-load-test.js or spike-test.js.
//
// Example:
//   k6 run load-test/k6/auth-capacity-test.js \
//     -e BASE_URL=https://staging.example.vercel.app \
//     -e TEST_AUTH_SECRET=... -e VOTER_POOL_SIZE=300 \
//     -e AUTH_VUS=15 -e DURATION=5m
import http from "k6/http";
import { sleep } from "k6";
import { BASE_URL, VOTER_DOMAIN, VOTER_POOL_SIZE, authHeaders } from "./config.js";
import { authAttemptDuration, authSuccess, authRateLimited, authOtherFailure } from "./auth-capacity-metrics.js";

const AUTH_VUS = Number(__ENV.AUTH_VUS || 10);
const DURATION = __ENV.DURATION || "5m"; // a full 5-minute window, to see the bucket actually refill

export const options = {
  scenarios: {
    auth_capacity: {
      executor: "constant-vus",
      vus: AUTH_VUS,
      duration: DURATION,
      exec: "authAttempt",
    },
  },
  // No thresholds here on purpose - a high auth_rate_limited_total isn't a
  // failure, it's the expected shape of this specific result once you're
  // past the per-IP budget. Read the counts, don't gate on them.
};

export function authAttempt() {
  const index = Math.floor(Math.random() * VOTER_POOL_SIZE) + 1;
  const email = `loadtest-voter-${index}@${VOTER_DOMAIN}`;

  const res = http.post(`${BASE_URL}/api/test-auth`, JSON.stringify({ email }), {
    headers: authHeaders({ "Content-Type": "application/json" }),
    tags: { name: "auth_attempt" },
  });
  authAttemptDuration.add(res.timings.duration);

  if (res.status === 200) {
    authSuccess.add(1);
  } else if (res.status === 429) {
    authRateLimited.add(1);
  } else {
    authOtherFailure.add(1);
    console.warn(`unexpected auth status ${res.status}: ${res.body}`);
  }

  sleep(1);
}
