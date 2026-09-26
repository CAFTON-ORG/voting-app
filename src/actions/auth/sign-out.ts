"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction(redirectTo: string = "/") {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Every real caller binds a fixed, same-origin path (see the .bind(null, …)
  // call sites), but redirect() itself would happily follow an absolute
  // URL too - same defense-in-depth reasoning as auth/callback's
  // safeNextPath, applied here in case a future caller ever passes
  // something less trusted.
  redirect(redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/");
}
