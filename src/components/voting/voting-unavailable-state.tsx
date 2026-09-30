import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { AuroraGlow } from "@/components/shared/aurora-glow";
import { StatusCard } from "@/components/voting/status-card";

/** The shared shell for every "you can't vote right now, and here's why"
 * state — upcoming, closed, paused, already voted, not eligible. One
 * consistent layout instead of near-identical ad-hoc blocks. Styled as a
 * status card on the same AuroraGlow backdrop as AuthPageShell, so these
 * read as a sibling of the sign-in flow rather than a bare, unstyled
 * fallback page. `tone` colors the icon tile to match the message's
 * actual meaning (a paused vote and an already-cast vote shouldn't look
 * identical). */
export function VotingUnavailableState({
  icon,
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
        <StatusCard icon={icon} tone={tone} title={title} description={description} footer={footer}>
          {children}
        </StatusCard>
      </main>
      <PublicFooter />
    </div>
  );
}
