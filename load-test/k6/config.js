// Shared config for every k6 script in this folder. All values come from
// -e KEY=value flags (or k6's --env-file, k6 v0.50+) - nothing here should
// ever be hardcoded to a real production URL or secret.
export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
export const TEST_AUTH_SECRET = __ENV.TEST_AUTH_SECRET;
export const EVENT_SLUG = __ENV.EVENT_SLUG;
export const VOTER_DOMAIN = __ENV.VOTER_DOMAIN || "loadtest.internal";
export const VOTER_POOL_SIZE = Number(__ENV.VOTER_POOL_SIZE || 5000);

if (!TEST_AUTH_SECRET) {
  throw new Error("Set -e TEST_AUTH_SECRET=... (must match the target deployment's env var)");
}
if (!EVENT_SLUG) {
  throw new Error("Set -e EVENT_SLUG=... (the load-test event's slug)");
}

export function authHeaders(extra) {
  return Object.assign({ "x-test-auth-secret": TEST_AUTH_SECRET }, extra || {});
}
