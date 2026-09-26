import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** `next` arrives as a plain query param on a route anyone can hit
 * directly (or reach via a crafted link to Supabase's own /authorize
 * endpoint with this callback as `redirect_to` - that URL is itself
 * allow-listed in Supabase, but its query string isn't), so it must never
 * be trusted as-is. A value like ".attacker.com/evil" concatenated
 * straight onto `origin` produces "https://mmsit.cafton.com.attacker.com/evil"
 * - a host the attacker fully controls - turning a real, legitimate sign-in
 * into an open redirect to a look-alike phishing page. Only a same-origin
 * relative path (starts with exactly one "/", never "//" which the
 * browser reads as protocol-relative) is allowed through; anything else
 * falls back to "/". */
function safeNextPath(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

/** Route Handler required by the OAuth flow itself (Supabase needs a real
 * HTTP endpoint to redirect back to with the auth code) — not created
 * merely because an operation touches the database, per the project's
 * "route handlers only when genuinely required" convention. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
