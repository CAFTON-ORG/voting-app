import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

/** Where requireAdmin() sends a signed-in account with no active AdminUser
 * row — a real voter's own valid Google sign-in, or a deactivated admin's.
 * Distinct from /admin/login: this account is authenticated, it's just not
 * authorized for the admin area, so the message and the way back are both
 * different from "please sign in." */
export default function UnauthorizedPage() {
  return (
    <AuthPageShell
      title="You don't have access"
      description="This account isn't authorized for the admin dashboard. If you think that's wrong, contact an event administrator."
    >
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </div>
        <Button asChild className="w-full">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </AuthPageShell>
  );
}
