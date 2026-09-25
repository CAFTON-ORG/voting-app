"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { GoogleLogo } from "@/components/auth/google-logo";

/** hdDomain pre-fills Google's account chooser to a Workspace domain —
 * a UX hint only. The server-side domain check in eligibility.ts is the
 * actual authorization boundary; this parameter is trivially bypassable
 * from the client and must never be treated as security. */
export function GoogleSignInButton({
  redirectTo,
  hdDomain,
  label = "Continue with Google",
}: {
  redirectTo: string;
  hdDomain?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        ...(hdDomain ? { queryParams: { hd: hdDomain } } : {}),
      },
    });
    if (error) setLoading(false);
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline" className="w-full">
      {loading ? <Loader2 className="size-4 animate-spin" /> : <GoogleLogo className="size-4" />}
      {loading ? "Redirecting…" : label}
    </Button>
  );
}
