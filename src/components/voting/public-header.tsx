import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavUserPopover } from "@/components/voting/nav-user-popover";

/** Sticky, matching the treatment CAFTON's own marketing site
 * (cafton-landing) uses for its navbar — stays visible while the voter
 * scrolls through a long candidate list instead of scrolling away.
 *
 * Deliberately takes the signed-in identity as flat props rather than
 * calling getTrustedIdentity() itself — this component is imported by both
 * plain Server Components and BallotForm, a Client Component, and a "use
 * client" module can never import a component that reaches into
 * server-only code (see src/lib/auth/identity.ts's "server-only" guard).
 * Each caller that already knows the signed-in identity passes it down. */
export function PublicHeader({
  signedInEmail,
  signedInName,
  signedInAvatarUrl,
}: {
  signedInEmail?: string;
  signedInName?: string | null;
  signedInAvatarUrl?: string | null;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-6">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Logo size={24} aria-hidden="true" />
          <span className="grid leading-tight">
            <span className="text-sm font-bold tracking-tight uppercase">Cafton</span>
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Voting</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {signedInEmail && (
            <NavUserPopover email={signedInEmail} fullName={signedInName} avatarUrl={signedInAvatarUrl} />
          )}
        </div>
      </div>
    </header>
  );
}
