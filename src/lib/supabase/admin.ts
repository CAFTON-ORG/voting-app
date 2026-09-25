import "server-only";

import { createClient } from "@supabase/supabase-js";

/** Service-role client — bypasses RLS and Storage policies entirely.
 * Never imported from client code, never given a NEXT_PUBLIC_ prefix.
 * Used only for the one thing that needs it: writing to Storage from a
 * Server Action after that action has already done its own
 * requirePermission() check (same "application-layer authorization
 * first" pattern as Prisma — see docs/security-boundaries.md). */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdminConfigured = Boolean(supabaseUrl && serviceRoleKey);

export const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;
