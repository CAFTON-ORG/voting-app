import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Optional by design: local dev and any environment without Upstash
// configured just runs with no rate limiting at all (see checkRateLimit
// below) rather than crashing on missing env vars. This is a defense-in-
// depth layer against abuse, not the thing that keeps voting data correct
// — Postgres's own unique constraint on (eventId, voterAuthUserId) is what
// actually prevents a duplicate vote (see docs/security-boundaries.md and
// the cast_ballot() Postgres function), so its absence is degraded
// posture, never a correctness gap.
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const rateLimitConfigured = Boolean(url && token);

const redis = rateLimitConfigured ? new Redis({ url: url!, token: token! }) : null;

// One Ratelimit instance per named limiter, not per call - @upstash/
// ratelimit's own docs recommend reusing the instance so its internal
// ephemeral cache (which skips a Redis round trip for a key it already
// knows is currently blocked) actually helps.
function buildLimiter(prefix: string, limiter: ReturnType<typeof Ratelimit.slidingWindow>) {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter, prefix: `cafton:${prefix}`, analytics: false });
}

// Ballots are a one-time action per voter per event, not a repeated one -
// this is generous enough to cover legitimate retries after a validation
// error or a flaky connection, while still stopping a script from
// hammering the endpoint. Keyed by the voter's own trusted identity (see
// castBallotAction), so the limit follows the account, not an IP shared by
// an entire campus NAT.
export const castBallotLimiter = buildLimiter("cast-ballot", Ratelimit.slidingWindow(8, "10 m"));

/** Fails OPEN: if Redis isn't configured, or the check itself errors out
 * (network blip, Upstash outage, wrong credentials), this returns
 * "allowed" rather than blocking the request. A rate limiter's job is to
 * shed abusive load; it is never allowed to become a single point of
 * failure that can take voting itself down, and Redis unavailability must
 * never be able to reject or corrupt a legitimate vote — the one thing
 * that actually protects vote integrity (Postgres's unique constraint)
 * doesn't depend on this succeeding. Every caller must still pass a real,
 * server-verified identity as `key` - never client-submitted input,
 * exactly like every other trust boundary in this app. */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  if (!limiter) return { allowed: true };
  try {
    const result = await limiter.limit(key);
    if (result.success) return { allowed: true };
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) };
  } catch (err) {
    console.error("Rate limit check failed, allowing the request through:", err);
    return { allowed: true };
  }
}
