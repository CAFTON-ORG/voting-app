import "server-only";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** Prisma connects to Supabase Postgres as a dedicated `prisma` role that
 * Supabase's own setup guide creates with `bypassrls` — see
 * docs/security-boundaries.md. RLS does not protect anything reached
 * through this client; every operation that touches a sensitive table via
 * Prisma must perform its own authorization check first. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // DATABASE_URL already points at Supabase's pgbouncer transaction
  // pooler, which does the real connection multiplexing — each serverless
  // function instance still opens its own pg.Pool on top of that (default
  // max: 10). This was previously set to 3 on the assumption that one
  // function instance handles one request at a time (classic serverless).
  // With Fluid Compute, a single warm instance serves many CONCURRENT
  // requests through this same PrismaClient singleton, so a too-small max
  // doesn't cause errors — it makes concurrent requests queue for one of
  // only 3 real connections, showing up as latency, not failures. 10 stays
  // comfortably under Supavisor's 200-client pooler limit even across
  // several concurrently-warm instances.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 10 });
  return new PrismaClient({ adapter });
}

// Cached on globalThis so Next.js dev's hot-reload doesn't create a fresh
// PrismaClient (and a fresh connection pool) on every file change.
export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
