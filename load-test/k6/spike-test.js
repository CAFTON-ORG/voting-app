// The "voting just opened" scenario: near-zero traffic, then everyone
// arrives within a couple minutes of each other - a materially different
// shape than voting-load-test.js's steady constant-vus levels, and
// arguably the more realistic failure mode for a student election (a
// sharp connection-pool spike right at the open, not gradually rising
// steady load). Reuses the same request logic and metrics as
// voting-load-test.js so the two are directly comparable, and the same
// setup()-only authentication approach - see voting-load-test.js's
// top-of-file comment for why login never happens inside the timed load
// phase.
//
// Example:
//   k6 run load-test/k6/spike-test.js \
//     -e BASE_URL=https://staging.example.vercel.app \
//     -e TEST_AUTH_SECRET=... -e EVENT_SLUG=loadtest-election \
//     -e PEAK_VUS=5000
import { establishSessions } from "./sessions.js";
import { votingFlow as sharedVotingFlow, publicReads as sharedPublicReads } from "./voting-load-test.js";

const PEAK_VUS = Number(__ENV.PEAK_VUS || 5000);
// Most of the crowd is just there to watch it open (see PUBLIC_SHARE in
// voting-load-test.js) - a spike test should reflect the same mix, not an
// all-voting worst case, which overstates how much of the spike actually
// hits castBallotAction specifically.
const PUBLIC_SHARE = Number(__ENV.PUBLIC_SHARE || 0.8);
const SESSION_POOL_SIZE = Number(__ENV.SESSION_POOL_SIZE || Math.max(20, Math.round(PEAK_VUS * (1 - PUBLIC_SHARE) * 1.5)));
const SETUP_LOGIN_DELAY_SECONDS = Number(__ENV.SETUP_LOGIN_DELAY_SECONDS || 1.5);

export const options = {
  // See voting-load-test.js's own options.setupTimeout comment - session
  // establishment can take longer than k6's 60s default, more so here
  // since a large PEAK_VUS can mean a larger SESSION_POOL_SIZE.
  setupTimeout: "10m",
  scenarios: {
    public_reads_spike: {
      executor: "ramping-vus",
      exec: "publicReads",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 0 }, // calm before voting opens
        { duration: "20s", target: Math.round(PEAK_VUS * PUBLIC_SHARE) }, // the open - sharp rush
        { duration: "3m", target: Math.round(PEAK_VUS * PUBLIC_SHARE) }, // sustained post-open traffic
        { duration: "1m", target: 0 }, // tails off
      ],
    },
    voting_flow_spike: {
      executor: "ramping-vus",
      exec: "votingFlow",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 0 },
        { duration: "20s", target: Math.round(PEAK_VUS * (1 - PUBLIC_SHARE)) },
        { duration: "3m", target: Math.round(PEAK_VUS * (1 - PUBLIC_SHARE)) },
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.1"], // looser than the steady-state test - a spike is allowed to hurt more
  },
};

/** IMPORTANT: at a large PEAK_VUS, SESSION_POOL_SIZE can be big enough
 * that setup()'s sequential, rate-limit-respecting login pacing takes a
 * genuinely long time (pool size x SETUP_LOGIN_DELAY_SECONDS) - k6 has no
 * timeout on setup() by default, but budget for this before running a
 * large spike test, and consider raising SESSION_POOL_SIZE's reuse
 * tolerance (a smaller pool reused more often) rather than growing it
 * indefinitely with PEAK_VUS. */
export function setup() {
  return establishSessions(SESSION_POOL_SIZE, SETUP_LOGIN_DELAY_SECONDS);
}

export const votingFlow = sharedVotingFlow;
export const publicReads = sharedPublicReads;
