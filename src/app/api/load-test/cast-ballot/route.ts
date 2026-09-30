import "server-only";

import { NextResponse } from "next/server";
import { castBallotAction, type CastBallotResult } from "@/actions/voting/cast-ballot";
import type { CastBallotInput } from "@/lib/validation/voting";
import { loadTestGuardFailed } from "@/lib/load-test/guard";

/** A plain REST shim over castBallotAction, for load testing only.
 *
 * k6 is a plain HTTP tool - it can't invoke a React Server Action
 * directly, since that goes over Next's own React Server Components wire
 * format (a `Next-Action` header carrying a build-specific action-id hash,
 * plus a non-trivial serialized-arguments body encoding). Reverse-
 * engineering that format in a load-test script would be fragile (the
 * action-id hash changes across builds) and wouldn't actually test
 * anything more real than calling the function directly.
 *
 * This route calls the exact same castBallotAction used in production -
 * same identity check (getTrustedIdentity() reads the cookies k6 already
 * carries from /api/test-auth), same eligibility check, same rate
 * limiter, same cast_ballot() Postgres call. The only thing skipped is
 * the RSC transport layer itself, which is a framework detail, not part
 * of "the vote path and authorization logic."
 *
 * Response shape mirrors what a real browser sees from the real Server
 * Action: HTTP 200 with { ok: false, message } for an expected rejection
 * (ineligible, already voted, rate-limited, validation) - these are
 * business outcomes, not failures. An HTTP 5xx here means something threw
 * before that action's own try/catch could produce a friendly message
 * (e.g. a Prisma/Postgres connection failure) - that distinction is
 * exactly what separates "expected rejection" from "real infra failure"
 * in the load-test metrics (see load-test/k6/voting-load-test.js).
 *
 * SAFETY: see src/lib/load-test/guard.ts - same guard as /api/test-auth,
 * including the hard VERCEL_ENV === "production" refusal. */
export async function POST(request: Request) {
  if (loadTestGuardFailed(request)) {
    return new NextResponse(null, { status: 404 });
  }

  let input: CastBallotInput;
  try {
    input = (await request.json()) as CastBallotInput;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" } satisfies CastBallotResult, {
      status: 400,
    });
  }

  const result = await castBallotAction(input);
  return NextResponse.json(result, { status: 200 });
}
