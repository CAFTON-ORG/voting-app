// Deletes the provisioned test voter accounts from Supabase Auth entirely
// - final teardown once load testing against a staging project is done.
// (Run reset-test-event-ballots.mts instead if you just want to rerun a
// test with the same voter pool.)
//
// Usage:
//   npx tsx --env-file=.env.staging load-test/cleanup-test-voters.mts [domain]
//
// Deletes every user whose email ends in "@<domain>" - no count argument
// needed, since it's driven by what's actually in Supabase Auth rather
// than an assumed range.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const domain = process.argv[2] ?? "loadtest.internal";
const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const CONCURRENCY = 10;
const PAGE_SIZE = 1000;

async function collectMatchingUserIds(): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    // listUsers only returns one page (default 50) if you don't paginate
    // through it explicitly - fetching every page up front, once, is far
    // faster and more correct than a listUsers() call per user being
    // deleted (which would also silently miss anyone past page 1).
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) {
      console.error(`listUsers page ${page}: ${error.message}`);
      break;
    }
    for (const user of data.users) {
      if (user.email?.endsWith(`@${domain}`)) ids.push(user.id);
    }
    if (data.users.length < PAGE_SIZE) break;
  }
  return ids;
}

async function main() {
  console.log(`Finding test voters at @${domain} ...`);
  const ids = await collectMatchingUserIds();
  console.log(`Found ${ids.length}. Deleting...`);

  let deleted = 0;
  let failed = 0;
  for (let start = 0; start < ids.length; start += CONCURRENCY) {
    const batch = ids.slice(start, start + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (id) => {
        const { error } = await supabase.auth.admin.deleteUser(id);
        return !error;
      })
    );
    for (const ok of results) {
      if (ok) deleted++;
      else failed++;
    }
  }

  console.log(`Done. deleted=${deleted} failed=${failed}`);
}

main();
