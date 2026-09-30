import "server-only";

import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { loadTestGuardFailed } from "@/lib/load-test/guard";

/** Staging-only session-minting endpoint for load testing — lets a test
 * script (k6) obtain a REAL Supabase Auth session for a pre-provisioned
 * test voter (see load-test/provision-test-voters.mts) without ever
 * touching Google's OAuth consent screen. This is deliberate: hammering
 * Google's own login endpoint at load-test volume is both against the
 * point (we're testing this app, not Google) and a real risk of getting
 * flagged/rate-limited by Google.
 *
 * signInWithPassword() here is Supabase's OWN Auth service issuing a real
 * session — the exact same mechanism a Google OAuth completion hands off
 * to. The resulting cookies are byte-identical in shape to a real voter's
 * session, so getTrustedIdentity() downstream (and therefore every
 * authorization check built on it) is exercised exactly as it would be in
 * production. Only the Google-hosted screen itself is skipped.
 *
 * SAFETY: see src/lib/load-test/guard.ts - this refuses to run at all on
 * Vercel's real production environment (VERCEL_ENV === "production"),
 * regardless of any other env var, and additionally requires an explicit
 * ALLOW_TEST_AUTH=true + matching TEST_AUTH_SECRET wherever it should
 * work (staging, or local dev/prod-build testing). */
export async function POST(request: Request) {
  if (loadTestGuardFailed(request)) {
    return new NextResponse(null, { status: 404 });
  }

  const password = process.env.TEST_VOTER_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "TEST_VOTER_PASSWORD is not set" }, { status: 500 });
  }

  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "Body must be JSON: { email: string }" }, { status: 400 });
  }
  if (typeof email !== "string" || !email) {
    return NextResponse.json({ error: "Body must be JSON: { email: string }" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    // Forward Supabase's own status (e.g. 429 when its token endpoint's
    // rate limit is hit - see docs/load-testing.md and auth-capacity-
    // test.js) rather than collapsing every failure into a generic 401.
    // A load-test script needs the real status to tell "rate limited" apart
    // from "actually failed", and a genuine caller benefits from the same
    // distinction.
    const status = typeof error?.status === "number" ? error.status : 401;
    return NextResponse.json({ error: error?.message ?? "Sign-in failed" }, { status });
  }

  // The session is already persisted via the cookie-writing callbacks
  // inside createSupabaseServerClient() (see src/lib/supabase/server.ts) —
  // signInWithPassword() triggers those automatically. k6's cookie jar
  // picks up the Set-Cookie headers on this response and replays them on
  // every subsequent request for that VU, exactly like a browser.
  return NextResponse.json({ ok: true, email });
}
