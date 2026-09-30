// Shared config for every k6 script in this folder. All values come from
// -e KEY=value flags (or k6's --env-file, k6 v0.50+) - nothing here should
// ever be hardcoded to a real production URL or secret.
export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
export const TEST_AUTH_SECRET = __ENV.TEST_AUTH_SECRET;
export const EVENT_SLUG = __ENV.EVENT_SLUG;
export const VOTER_DOMAIN = __ENV.VOTER_DOMAIN || "loadtest.internal";
export const VOTER_POOL_SIZE = Number(__ENV.VOTER_POOL_SIZE || 5000);
// Only needed when BASE_URL is a Vercel deployment with Deployment
// Protection enabled (the default for Preview deployments) - Vercel's own
// SSO wall would otherwise redirect every k6 request before it ever
// reaches this app's code. Generated under Vercel Project Settings ->
// Deployment Protection -> "Protection Bypass for Automation". Not
// needed at all for local testing (BASE_URL=http://localhost:...).
export const VERCEL_BYPASS_SECRET = __ENV.VERCEL_BYPASS_SECRET;

if (!TEST_AUTH_SECRET) {
  throw new Error("Set -e TEST_AUTH_SECRET=... (must match the target deployment's env var)");
}
if (!EVENT_SLUG) {
  throw new Error("Set -e EVENT_SLUG=... (the load-test event's slug)");
}

// Every single request needs this when targeting a protected Vercel
// deployment - not just the load-test-guarded routes. Deployment
// Protection gates the WHOLE deployment (it's what caused the 302 to
// vercel.com/sso-api on a plain GET /), so even a plain public page read
// needs this header or it never reaches the app's own code at all.
export function vercelBypassHeaders(extra) {
  const headers = {};
  if (VERCEL_BYPASS_SECRET) headers["x-vercel-protection-bypass"] = VERCEL_BYPASS_SECRET;
  return Object.assign(headers, extra || {});
}

export function authHeaders(extra) {
  return vercelBypassHeaders(Object.assign({ "x-test-auth-secret": TEST_AUTH_SECRET }, extra || {}));
}
