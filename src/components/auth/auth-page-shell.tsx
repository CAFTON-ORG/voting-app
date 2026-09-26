import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";

/** One consistent shell for every sign-in-adjacent page (admin login,
 * accept-invitation, voter sign-in, auth error) — these previously each
 * hand-rolled the same centered "title + description + content" layout
 * with no shared visual identity. */
export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-6 py-12">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background">
            <Logo size={20} aria-hidden="true" />
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
        {footer && (
          <CardFooter className="flex justify-center text-xs text-muted-foreground">{footer}</CardFooter>
        )}
      </Card>
    </div>
  );
}
