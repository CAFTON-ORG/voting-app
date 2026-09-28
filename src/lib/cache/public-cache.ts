import "server-only";

import { redis, redisConfigured } from "@/lib/redis/client";

// Vercel's own Data Cache (what unstable_cache used to be backed by here)
// is pooled per-team on the Hobby/Pro plans - see
// https://vercel.com/docs/caching/runtime-cache/data-cache#storage-scope-by-plan.
// Every project on the same account/team shares one cache with LRU
// eviction, so a burst of writes from an unrelated project can evict this
// app's entries and force a real DB query under load that has nothing to
// do with this app's own traffic. Upstash Redis (already provisioned for
// rate limiting - see src/lib/rate-limit/client.ts) is dedicated to this
// project, so it can't be evicted by anything outside this app.
//
// Fails open like the rate limiter: if Redis isn't configured, or a read/
// write call itself errors (network blip, Upstash outage), this falls
// back to calling the real source directly rather than blocking the
// request - a cache is never allowed to be a single point of failure for
// pages that must still render without it, just slower.
async function readThrough<T>(key: string, ttlSeconds: number, fetchFresh: () => Promise<T>): Promise<T> {
  if (!redisConfigured) return fetchFresh();
  try {
    const cached = await redis!.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;
  } catch (err) {
    console.error(`public-cache: read failed for "${key}", falling back to source:`, err);
  }
  const fresh = await fetchFresh();
  try {
    await redis!.set(key, fresh, { ex: ttlSeconds });
  } catch (err) {
    console.error(`public-cache: write failed for "${key}":`, err);
  }
  return fresh;
}

async function invalidate(key: string): Promise<void> {
  if (!redisConfigured) return;
  try {
    await redis!.del(key);
  } catch (err) {
    console.error(`public-cache: invalidate failed for "${key}":`, err);
  }
}

const HOME_EVENTS_KEY = "cafton:public-cache:home-events";
const eventDetailKey = (slug: string) => `cafton:public-cache:event-detail:${slug}`;

export function readHomeEventsCache<T>(ttlSeconds: number, fetchFresh: () => Promise<T>): Promise<T> {
  return readThrough(HOME_EVENTS_KEY, ttlSeconds, fetchFresh);
}

export function readEventDetailCache<T>(slug: string, ttlSeconds: number, fetchFresh: () => Promise<T>): Promise<T> {
  return readThrough(eventDetailKey(slug), ttlSeconds, fetchFresh);
}

/** Called by every admin action that changes what the public home page or
 * an event's own public page shows, so the change is visible immediately
 * instead of waiting out the TTL. */
export function invalidatePublicHomeCache(): Promise<void> {
  return invalidate(HOME_EVENTS_KEY);
}

export function invalidatePublicEventCache(slug: string): Promise<void> {
  return invalidate(eventDetailKey(slug));
}
