import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type TrustedIdentity = {
  authUserId: string;
  email: string;
  fullName: string | null;
  /** Google's profile photo URL, from user_metadata — purely cosmetic
   * (an avatar image), never used for any authorization decision. */
  avatarUrl: string | null;
};

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
  const claims = data.claims as {
    sub: string;
    email: string;
    user_metadata?: { full_name?: string; avatar_url?: string };
  };
  return {
    authUserId: claims.sub,
    email: claims.email,
    fullName: claims.user_metadata?.full_name ?? null,
    avatarUrl: claims.user_metadata?.avatar_url ?? null,
  };
});
