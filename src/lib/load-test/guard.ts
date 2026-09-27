import "server-only";

/** The one guard every load-test-only route (src/app/api/test-auth,
 * src/app/api/load-test/*) must call first, before touching Supabase,
 * Prisma, or anything else.
 *
 * Two independent conditions, both required:
 *
 * 1. `process.env.VERCEL_ENV !== "production"` — Vercel sets this
 *    automatically on every deployment (values: "production", "preview",
 *    "development"); it is NOT something set by hand in the dashboard's
 *    environment-variable list, so a human can't misconfigure it the way
 *    ALLOW_TEST_AUTH could be. This is the actual safety boundary: even
 *    if ALLOW_TEST_AUTH=true were accidentally set on the real production
 *    Vercel project/environment (a config mistake, not a secret leak),
 *    this route still refuses to run there. Locally (`next dev`/`next
 *    start` on a machine, not Vercel), VERCEL_ENV is simply undefined,
 *    which correctly is not "production" either, so local testing keeps
 *    working exactly as already verified.
 * 2. `ALLOW_TEST_AUTH=true` + a matching `TEST_AUTH_SECRET` — the explicit
 *    opt-in for wherever this SHOULD work (a staging Vercel project, or
 *    local dev/prod-build testing).
 *
 * Every caller must 404 (not 401/403) on failure — a 404 gives an
 * attacker or scanner no signal that this route exists at all, unlike an
 * auth-style status code. */
export function loadTestGuardFailed(request: Request): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.ALLOW_TEST_AUTH !== "true") return true;

  const configuredSecret = process.env.TEST_AUTH_SECRET;
  const providedSecret = request.headers.get("x-test-auth-secret");
  if (!configuredSecret || providedSecret !== configuredSecret) return true;

  return false;
}
