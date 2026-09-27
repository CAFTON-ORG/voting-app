// The "voting just opened" scenario: near-zero traffic, then everyone
// arrives within a couple minutes of each other - a materially different
// shape than voting-load-test.js's steady constant-vus levels, and
// arguably the more realistic failure mode for a student election (a
// sharp connection-pool spike right at the open, not gradually rising
// steady load). Reuses the same request logic and metrics as
// voting-load-test.js so the two are directly comparable.
//
// Example:
//   k6 run load-test/k6/spike-test.js \
//     -e BASE_URL=https://staging.example.vercel.app \
//     -e TEST_AUTH_SECRET=... -e EVENT_SLUG=loadtest-election \
//     -e PEAK_VUS=5000
import http from "k6/http";
import { EVENT_SLUG, authHeaders, BASE_URL } from "./config.js";
import { votingFlow as sharedVotingFlow, publicReads as sharedPublicReads } from "./voting-load-test.js";

const PEAK_VUS = Number(__ENV.PEAK_VUS || 5000);
// Most of the crowd is just there to watch it open (see PUBLIC_SHARE in
// voting-load-test.js) - a spike test should reflect the same mix, not an
// all-voting worst case, which overstates how much of the spike actually
// hits castBallotAction specifically.
const PUBLIC_SHARE = Number(__ENV.PUBLIC_SHARE || 0.8);

export const options = {
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

export function setup() {
  const res = http.get(`${BASE_URL}/api/load-test/event-info?slug=${EVENT_SLUG}`, {
    headers: authHeaders(),
  });
  if (res.status !== 200) {
    throw new Error(`event-info setup call failed: ${res.status} ${res.body}`);
  }
  return JSON.parse(res.body);
}

export const votingFlow = sharedVotingFlow;
export const publicReads = sharedPublicReads;
