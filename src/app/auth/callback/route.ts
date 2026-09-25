import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Route Handler required by the OAuth flow itself (Supabase needs a real
 * HTTP endpoint to redirect back to with the auth code) — not created
 * merely because an operation touches the database, per the project's
 * "route handlers only when genuinely required" convention. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
