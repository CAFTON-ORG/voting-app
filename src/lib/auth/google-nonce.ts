/** Exact pattern from Supabase's own Google Identity Services guide
 * (https://supabase.com/docs/guides/auth/social-login/auth-google) - the
 * HASHED nonce goes to Google (so the ID token it issues embeds a hash
 * Supabase can verify), the RAW nonce goes to signInWithIdToken() (which
 * hashes it again internally and compares against the token's claim).
 * Passing the same value to both, or skipping this entirely, is exactly
 * the nonce-replay gap this mechanism exists to close - never shortcut
 * it, even though the earlier redirect-based OAuth flow never needed an
 * equivalent client-side step at all. */
export async function generateGoogleNonce(): Promise<{ nonce: string; hashedNonce: string }> {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const encoded = new TextEncoder().encode(nonce);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { nonce, hashedNonce };
}
