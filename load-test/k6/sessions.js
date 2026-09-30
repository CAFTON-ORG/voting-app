// Shared setup-phase session establishment - used by both voting-load-
// test.js and spike-test.js so pre-authentication works identically in
// both. See voting-load-test.js's own top-of-file comment for why this
// happens once in setup(), never inside the timed load phase.
import http from "k6/http";
import { sleep } from "k6";
import { BASE_URL, EVENT_SLUG, VOTER_DOMAIN, authHeaders } from "./config.js";

/** Fetches the load-test event's real ids, then establishes `poolSize`
 * authenticated sessions sequentially (spaced `delaySeconds` apart to
 * stay well under Supabase Auth's 150-requests-per-5-minutes-per-IP
 * token-endpoint limit - k6 runs from one machine, so every login this
 * whole test suite makes shares that one IP's budget). Returns
 * `{ eventInfo, sessions }`, where `sessions` is an array of ready-to-use
 * `Cookie` header strings - call this from a k6 `setup()` function and
 * return its result directly. */
export function establishSessions(poolSize, delaySeconds) {
  const infoRes = http.get(`${BASE_URL}/api/load-test/event-info?slug=${EVENT_SLUG}`, {
    headers: authHeaders(),
  });
  if (infoRes.status !== 200) {
    throw new Error(`event-info setup call failed: ${infoRes.status} ${infoRes.body}`);
  }
  const eventInfo = JSON.parse(infoRes.body);
  if (eventInfo.categories.some((c) => c.candidateIds.length === 0)) {
    throw new Error("Every category in the load-test event needs at least one active candidate");
  }

  const sessions = [];
  for (let i = 1; i <= poolSize; i++) {
    const email = `loadtest-voter-${i}@${VOTER_DOMAIN}`;
    const res = http.post(`${BASE_URL}/api/test-auth`, JSON.stringify({ email }), {
      headers: authHeaders({ "Content-Type": "application/json" }),
      tags: { name: "setup_login" },
    });
    if (res.status === 200) {
      // k6's automatic per-VU cookie jar doesn't apply here - setup() runs
      // outside any VU's request context, and its result has to be handed
      // to every VU as plain data. Capturing every Set-Cookie the response
      // produced (there can be more than one if Supabase's session value
      // is large enough to be chunked across multiple cookies) and
      // replaying them all as one Cookie header on later requests is the
      // manual equivalent of what a browser's cookie jar does for free.
      const cookieHeader = Object.entries(res.cookies)
        .map(([name, entries]) => `${name}=${entries[0].value}`)
        .join("; ");
      sessions.push(cookieHeader);
    } else {
      console.warn(`setup login failed for ${email}: ${res.status} ${res.body}`);
    }
    if (i < poolSize) sleep(delaySeconds);
  }

  if (sessions.length === 0) {
    throw new Error(
      "Every setup-phase login failed - check TEST_AUTH_SECRET/TEST_VOTER_PASSWORD and Supabase Auth logs"
    );
  }
  console.log(`setup: established ${sessions.length}/${poolSize} authenticated sessions`);
  return { eventInfo, sessions };
}
