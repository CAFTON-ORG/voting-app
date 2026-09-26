import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";

/** The shared shell for every "you can't vote right now, and here's why"
 * state — upcoming, closed, paused, already voted. One consistent layout
 * instead of three near-identical ad-hoc blocks. */
export function VotingUnavailableState({
  icon: Icon,
  title,
  description,
  children,
  footer,
  signedInEmail,
  signedInName,
  signedInAvatarUrl,
}: {
  icon: LucideIcon;
  title: string;
  // Plain string, deliberately not ReactNode: this renders inside a <p>,
  // and block content (a <div>/<form>) nested in a <p> is invalid HTML
  // that causes a hydration error — exactly the bug just fixed in
  // AuthPageShell and ConfirmDialog. Use `children` below for anything
  // richer than text.
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  signedInEmail?: string;
  signedInName?: string | null;
  signedInAvatarUrl?: string | null;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader
        signedInEmail={signedInEmail}
        signedInName={signedInName}
        signedInAvatarUrl={signedInAvatarUrl}
      />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <Icon className="size-10 text-muted-foreground" />
        <h1 className="font-heading text-xl font-semibold text-balance">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {children}
        {footer && <div className="mt-4">{footer}</div>}
      </main>
      <PublicFooter />
    </div>
  );
}
