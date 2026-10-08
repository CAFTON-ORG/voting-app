"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ScrollText, UserCheck, EyeOff, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogoScene } from "@/components/shared/logo-scene";
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
  const [privacyOpen, setPrivacyOpen] = useState(false);

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
        <CardHeader className="flex flex-col items-center gap-4 text-center">
          <LogoScene size={56} />
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
          {/* footer is an arbitrary ReactNode, so this must be a <div>, not
              a <p>: a caller passing block content (a <div>/<form>) would
              produce invalid HTML nested inside a <p>, the same hydration
              bug already hit once with an earlier footer here. */}
          {footer && <div className="text-center text-xs text-muted-foreground">{footer}</div>}
          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to how this platform handles your data — see the{" "}
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Privacy Policy
            </button>
            .
          </p>
        </CardFooter>
      </Card>

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="size-4.5" />
              Privacy Policy
            </DialogTitle>
            <DialogDescription>What signing in shares, and how it&apos;s used.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex gap-3">
              <UserCheck className="size-4.5 shrink-0 text-muted-foreground" />
              <p>
                Signing in with Google shares your account&apos;s name, email, and profile photo with this
                platform — used only to verify who you are, whether that&apos;s confirming a voter&apos;s
                eligibility or an admin&apos;s access.
              </p>
            </div>
            <div className="flex gap-3">
              <EyeOff className="size-4.5 shrink-0 text-muted-foreground" />
              <p>
                For elections specifically, your identity is stored separately from your ballot
                selections — there is no record anywhere linking your account to who you voted for.
              </p>
            </div>
            <div className="flex gap-3">
              <Lock className="size-4.5 shrink-0 text-muted-foreground" />
              <p>Your Google credentials themselves are never seen or stored by this platform at all.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrivacyOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
