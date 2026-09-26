import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { PartnerLogos } from "@/components/shared/partner-logos";
import { AuroraGlow } from "@/components/shared/aurora-glow";

/** One consistent shell for every sign-in-adjacent page (admin login,
 * accept-invitation, voter sign-in, auth error) — these previously each
 * hand-rolled the same centered "title + description + content" layout
 * with no shared visual identity. Carries the same AuroraGlow backdrop and
 * partner-logo strip as the rest of the public site, so a login page
 * doesn't read as a separate, unbranded surface. */
export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  backHref = "/",
  backLabel = "Back",
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Where the top-left back link goes — defaults to the public home page.
   * Pass a more specific page (e.g. an event's own landing page) when one
   * makes more sense for that particular sign-in-adjacent screen. */
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/30 px-6 py-12">
      <AuroraGlow />
      <Link
        href={backHref}
        className="absolute top-6 left-6 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {backLabel}
      </Link>
      <Card className="w-full max-w-sm rounded-2xl border-border/60 shadow-lg shadow-black/3 dark:shadow-black/20">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
            <Logo size={22} aria-hidden="true" />
          </div>
          <div>
            {eyebrow && (
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
            )}
            <CardTitle className="font-heading text-xl">{title}</CardTitle>
          </div>
          {description && <CardDescription className="text-balance">{description}</CardDescription>}
        </CardHeader>
        {children && <CardContent className="flex flex-col gap-4">{children}</CardContent>}
        <CardFooter className="flex flex-col gap-4 border-t pt-5">
          <PartnerLogos />
          {/* footer is an arbitrary ReactNode (plain text on most pages,
              but SignedInBar - a <div> wrapping a sign-out <form> - on the
              vote page's ineligible-voter state), so this must be a <div>,
              not a <p>: a <div>/<form> nested inside a <p> is invalid HTML
              and was causing a real hydration error. */}
          {footer && <div className="text-center text-xs text-muted-foreground">{footer}</div>}
        </CardFooter>
      </Card>
    </div>
  );
}
