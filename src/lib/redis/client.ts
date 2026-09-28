import "server-only";

import { Redis } from "@upstash/redis";

// Shared by rate-limit/client.ts and cache/public-cache.ts - one Redis
// client for the whole app, not one per feature. Optional by design: local
// dev and any environment without Upstash configured runs with this null,
// and every caller falls back to its own uncached/unlimited behavior (see
// each caller's own fail-open comment) rather than crashing on missing env
// vars.
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redisConfigured = Boolean(url && token);
export const redis = redisConfigured ? new Redis({ url: url!, token: token! }) : null;
