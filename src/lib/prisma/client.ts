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
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Cached on globalThis so Next.js dev's hot-reload doesn't create a fresh
// PrismaClient (and a fresh connection pool) on every file change.
export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
