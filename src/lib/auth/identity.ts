import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type TrustedIdentity = { authUserId: string; email: string };

/** The one place the app establishes "who is making this request." Uses
 * getClaims() (cryptographically verifies the JWT, refreshing it if
 * needed) — never getSession() (reads the cookie without revalidating)
 * and never a client-submitted email. Shared by both the voter path and
 * the admin path: it's the same underlying identity mechanism either way,
 * only the authorization check layered on top differs (domain allowlist
 * vs AdminUser row — see eligibility.ts and admin.ts). Cached per request
 * so the several places a page/action calls this don't each repeat the
 * JWT verification. */
export const getTrustedIdentity = cache(async (): Promise<TrustedIdentity | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub || !data.claims.email) return null;
  return { authUserId: data.claims.sub, email: data.claims.email };
});
