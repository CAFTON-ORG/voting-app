import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanism, new
 * name — see node_modules/next/dist/docs/.../file-conventions/proxy.md).
 * This refreshes the Supabase session cookie once per navigation so
 * Server Components/Actions downstream see a valid session. It is a UX
 * convenience, not a security boundary — Next's own docs warn that a
 * matcher change can silently stop covering a route, so every
 * Server Action independently re-verifies identity via getClaims()
 * (see src/lib/auth/identity.ts) rather than trusting this file ran. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() cryptographically verifies the JWT and refreshes it if
  // needed — never getSession() here, which reads the cookie without
  // revalidating it.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
