// Bulk-creates real Supabase Auth users for load testing, entirely via the
// Admin API (service-role key) - never touches Google OAuth. Run against
// a dedicated STAGING Supabase project only; see docs/load-testing.md.
//
// Usage:
//   npx tsx --env-file=.env.staging load-test/provision-test-voters.mts <count> [domain]
//
// Example:
//   npx tsx --env-file=.env.staging load-test/provision-test-voters.mts 5000 loadtest.internal
//
// Creates loadtest-voter-1@loadtest.internal .. loadtest-voter-<count>@<domain>,
// all with the password in TEST_VOTER_PASSWORD and email_confirm: true (no
// confirmation email step needed). Idempotent - rerunning with the same
// count just skips users that already exist.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.TEST_VOTER_PASSWORD;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!password) {
  console.error("Missing TEST_VOTER_PASSWORD - set it in the same env file, k6 doesn't need to know it");
  process.exit(1);
}

const count = Number(process.argv[2]);
const domain = process.argv[3] ?? "loadtest.internal";
if (!Number.isInteger(count) || count < 1) {
  console.error("Usage: provision-test-voters.mts <count> [domain]");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

// A handful in flight at once - fast enough for thousands of users in a
// few minutes without hammering the Admin API hard enough to get
// throttled by Supabase itself.
const CONCURRENCY = 10;

async function createOne(i: number): Promise<"created" | "exists" | "error"> {
  const email = `loadtest-voter-${i}@${domain}`;
  const { error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (!error) return "created";
  if (error.message.toLowerCase().includes("already been registered") || error.status === 422) return "exists";
  console.error(`  ${email}: ${error.message}`);
  return "error";
}

async function main() {
  console.log(`Provisioning ${count} test voters at @${domain} ...`);
  let created = 0;
  let exists = 0;
  let failed = 0;

  for (let start = 1; start <= count; start += CONCURRENCY) {
    const batch = Array.from({ length: Math.min(CONCURRENCY, count - start + 1) }, (_, k) => start + k);
    const results = await Promise.all(batch.map(createOne));
    for (const r of results) {
      if (r === "created") created++;
      else if (r === "exists") exists++;
      else failed++;
    }
    if (start % 200 === 1) console.log(`  ... ${start - 1}/${count}`);
  }

  console.log(`Done. created=${created} already-existed=${exists} failed=${failed}`);
  console.log(`\nNext: create/point a test event's allowedDomains at "${domain}" (see docs/load-testing.md),`);
  console.log(`then fetch its ids via GET /api/load-test/event-info?slug=<slug>.`);
}

main();
