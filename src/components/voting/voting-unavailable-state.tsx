import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { AuroraGlow } from "@/components/shared/aurora-glow";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";

const TONE_STYLES: Record<string, string> = {
  success: "bg-green-50 text-green-600 dark:bg-green-950/60 dark:text-green-300",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
  info: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300",
  destructive: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300",
  neutral: "bg-muted text-muted-foreground",
};

/** The shared shell for every "you can't vote right now, and here's why"
 * state — upcoming, closed, paused, already voted. One consistent layout
 * instead of three near-identical ad-hoc blocks. Styled as a status card
 * on the same AuroraGlow backdrop as AuthPageShell, so these read as a
 * sibling of the sign-in flow rather than a bare, unstyled fallback page.
 * `tone` colors the icon tile to match the message's actual meaning (a
 * paused vote and an already-cast vote shouldn't look identical). */
export function VotingUnavailableState({
  icon: Icon,
  tone = "neutral",
  title,
  description,
  children,
  footer,
  signedInEmail,
  signedInName,
  signedInAvatarUrl,
}: {
  icon: LucideIcon;
  tone?: "success" | "warning" | "info" | "destructive" | "neutral";
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
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      <AuroraGlow />
      <PublicHeader
        signedInEmail={signedInEmail}
        signedInName={signedInName}
        signedInAvatarUrl={signedInAvatarUrl}
      />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-16">
        <Card className="w-full rounded-2xl border-border/60 shadow-lg shadow-black/3 dark:shadow-black/20">
          <CardContent className="flex flex-col items-center gap-3 px-8 py-10 text-center">
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-2xl shadow-sm",
                TONE_STYLES[tone]
              )}
            >
              <Icon className="size-7" />
            </div>
            <h1 className="font-heading mt-1 text-xl font-semibold text-balance">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {children}
            {footer && <div className="mt-3 w-full border-t pt-4">{footer}</div>}
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
