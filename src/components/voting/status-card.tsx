import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";

const TONE_STYLES: Record<string, string> = {
  success: "bg-green-50 text-green-600 dark:bg-green-950/60 dark:text-green-300",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
  info: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300",
  destructive: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300",
  neutral: "bg-muted text-muted-foreground",
};

/** The shared "here's your current voting status" card — a tone-colored
 * icon tile, title, optional description, optional richer children, and
 * an optional footer set off by a top border. Used by VotingUnavailableState
 * (scheduled/paused/closed/already-voted/not-eligible) and by the
 * just-submitted confirmation screen, so a fresh "you voted" and a later
 * "you already voted" read as the same kind of message instead of two
 * different bespoke treatments. Plain base Card styling (no added shadow)
 * on purpose, to match every other card in the app. */
export function StatusCard({
  icon: Icon,
  tone = "neutral",
  title,
  description,
  children,
  footer,
}: {
  icon: LucideIcon;
  tone?: "success" | "warning" | "info" | "destructive" | "neutral";
  title: string;
  // Plain string, deliberately not ReactNode: this renders inside a <p>,
  // and block content (a <div>/<form>) nested in a <p> is invalid HTML
  // that causes a hydration error. Use `children` below for anything
  // richer than text.
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center gap-3 px-8 py-10 text-center">
        <div className={cn("flex size-16 items-center justify-center rounded-2xl shadow-sm", TONE_STYLES[tone])}>
          <Icon className="size-7" />
        </div>
        <h1 className="font-heading mt-1 text-xl font-semibold text-balance">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {children}
        {footer && <div className="mt-3 w-full border-t pt-4">{footer}</div>}
      </CardContent>
    </Card>
  );
}
