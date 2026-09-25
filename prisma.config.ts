import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// The CLI (migrate/introspect) always needs a direct, non-pooled
// connection — Supabase's transaction pooler (used by DATABASE_URL at
// runtime) doesn't support the prepared statements Prisma Migrate relies
// on. Runtime queries use DATABASE_URL separately via the driver adapter
// in src/lib/prisma/client.ts, not through this file.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
