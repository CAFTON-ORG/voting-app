"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { generateGoogleNonce } from "@/lib/auth/google-nonce";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** Google Identity Services + supabase.auth.signInWithIdToken(), replacing
 * the previous signInWithOAuth redirect flow - the whole exchange now
 * happens at this app's own origin (Google's account picker shows this
 * site's domain, not the Supabase project's), with no round trip through
 * Supabase's own /auth/v1/authorize + /callback at all. Everything
 * downstream of a successful sign-in (the session cookie, getTrustedIdentity(),
 * every authorization/eligibility check) is unchanged - Supabase writes
 * the identical kind of session either way, so this is isolated entirely
 * to how that session gets established.
 *
 * Renders Google's OWN button (via renderButton) rather than a custom
 * one triggering google.accounts.id.prompt() - prompt()/One Tap can
 * silently decline to show for a given user (prior dismissal cooldown,
 * ITP/third-party-cookie restrictions, etc.) with no reliable fallback,
 * which is an acceptable trade-off for a convenience prompt but not for
 * the only way to sign in to a voting system. That does mean the button
 * itself looks like Google's standard button now, not the previous
 * custom-styled one - a deliberate reliability-over-pixel-match choice,
 * flagged for review rather than made silently.
 *
 * hdDomain pre-fills Google's account chooser to a Workspace domain — a
 * UX hint only, same caveat as before: the server-side domain check in
 * eligibility.ts is the actual authorization boundary, this is trivially
 * bypassable from the client and must never be treated as security.
 *
 * `label` is kept in the prop signature so existing call sites don't need
 * to change, but Google's own button only offers a few preset texts
 * (signin_with/signup_with/continue_with/signin) - every current caller
 * already wants "Continue with Google" (continue_with), so there's
 * nothing to actually switch on yet. */
export function GoogleSignInButton(props: { redirectTo: string; hdDomain?: string; label?: string }) {
  const { redirectTo, hdDomain } = props;
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef<string | null>(null);
  // Always points at the latest handler (closing over current props)
  // without forcing initialize()/renderButton() to re-run on every
  // render - Google's button only needs to be created once per mount.
  // Refs can't be written during render itself, so this is set in its
  // own effect (runs after every render, no dependency array) rather
  // than inline in the component body.
  const handleCredentialRef = useRef<(response: { credential: string }) => void>(() => {});

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCredentialRef.current = async (response) => {
      const nonce = nonceRef.current;
      if (!nonce) return;
      setSigningIn(true);
      setError(null);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce,
      });
      if (error) {
        setError(error.message);
        setSigningIn(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    };
  });

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    (async () => {
      const { nonce, hashedNonce } = await generateGoogleNonce();
      if (cancelled || !containerRef.current) return;

      const google = window.google;
      if (!google) {
        setError("Could not load Google Sign-In. Please refresh and try again.");
        return;
      }

      nonceRef.current = nonce;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => handleCredentialRef.current(response),
        nonce: hashedNonce,
        ...(hdDomain ? { hd: hdDomain } : {}),
      });

      const width = Math.min(400, containerRef.current.offsetWidth || 400);
      google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: String(width),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [scriptLoaded, hdDomain]);

  if (!GOOGLE_CLIENT_ID) {
    return <p className="text-center text-sm text-destructive">Sign-in is not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID).</p>;
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setError("Could not load Google Sign-In. Please refresh and try again.")}
      />
      <div ref={containerRef} className="flex w-full justify-center" />
      {signingIn && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Signing in…
        </div>
      )}
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
