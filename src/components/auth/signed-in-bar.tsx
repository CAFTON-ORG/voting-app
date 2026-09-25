import { signOutAction } from "@/actions/auth/sign-out";

/** Uses .bind() to pre-supply redirectTo rather than an inline "use
 * server" closure: this component is imported by both a pure Server
 * Component (the vote page's early-return states) and a Client Component
 * (BallotForm's "select" step) — an inline server action isn't allowed
 * once a module is pulled into a client bundle, so it must reference the
 * already-exported named action instead. */
export function SignedInBar({ email, redirectTo }: { email: string; redirectTo: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <span>Signed in as {email}</span>
      <span aria-hidden>·</span>
      <form action={signOutAction.bind(null, redirectTo)}>
        <button type="submit" className="underline underline-offset-2 hover:text-foreground">
          Sign out
        </button>
      </form>
    </div>
  );
}
