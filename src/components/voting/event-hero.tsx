import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getAvatarColor } from "@/lib/format/avatar-color";
import { VotingStatusBadge } from "@/components/voting/voting-status-badge";
import { VotingCountdown } from "@/components/voting/voting-countdown";
import { Button } from "@/components/ui/button";
import type { EventState } from "@prisma/client";

function formatSchedule(date: Date) {
  return date.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
}

/** No event has a logo/banner upload today (see the Event model) — rather
 * than add storage-backed branding fields for this pass, the hero gets an
 * elegant generated identity (same color-hash approach as EventAvatar,
 * just larger) so every event still looks intentional, not blank. */
export function EventHero({
  name,
  organizer,
  state,
  votingOpensAt,
  votingClosesAt,
  slug,
  ballotCount,
}: {
  name: string;
  organizer?: string;
  state: EventState;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
  slug: string;
  ballotCount?: number | null;
}) {
  const { bg, fg } = getAvatarColor(name);
  const hasStatusPanel =
    (state === "SCHEDULED" && votingOpensAt) ||
    (state === "OPEN" && votingClosesAt) ||
    ((state === "CLOSED" || state === "FINALIZED") && votingClosesAt) ||
    state === "PAUSED" ||
    state === "OPEN" ||
    ballotCount != null;

  return (
    <div className="flex flex-col items-center gap-6 px-6 pt-12 pb-8 text-center sm:pt-16">
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden
          className="absolute size-24 rounded-full opacity-40 blur-2xl sm:size-28"
          style={{ backgroundColor: bg }}
        />
        <div
          className="relative flex size-16 items-center justify-center rounded-2xl shadow-lg sm:size-20"
          style={{ backgroundColor: bg, color: fg }}
        >
          <CalendarDays className="size-8 sm:size-9" />
        </div>
      </div>

      <div>
        {organizer && <p className="text-sm font-medium text-muted-foreground">{organizer}</p>}
        <h1 className="font-heading mt-1 text-3xl font-semibold text-balance sm:text-4xl">{name}</h1>
      </div>

      <VotingStatusBadge state={state} />

      {hasStatusPanel && (
        <div className="flex w-full max-w-xs flex-col items-center gap-5 rounded-2xl border bg-card/60 px-6 py-6 shadow-sm">
          {state === "SCHEDULED" && votingOpensAt && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Voting opens <span className="font-medium text-foreground">{formatSchedule(votingOpensAt)}</span>
              </p>
              <VotingCountdown target={votingOpensAt} label="Voting opens in" />
            </div>
          )}

          {state === "OPEN" && votingClosesAt && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Voting closes <span className="font-medium text-foreground">{formatSchedule(votingClosesAt)}</span>
              </p>
              <VotingCountdown target={votingClosesAt} label="Voting closes in" />
            </div>
          )}

          {(state === "CLOSED" || state === "FINALIZED") && votingClosesAt && (
            <p className="text-sm text-muted-foreground">
              Voting ended <span className="font-medium text-foreground">{formatSchedule(votingClosesAt)}</span>
            </p>
          )}

          {state === "PAUSED" && (
            <p className="text-sm text-muted-foreground">Voting is temporarily paused. Please check back shortly.</p>
          )}

          {state === "OPEN" && (
            <Button asChild size="lg" className="w-full">
              <Link href={`/events/${slug}/vote`}>Vote Now</Link>
            </Button>
          )}

          {ballotCount != null && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{ballotCount.toLocaleString()}</span> vote
              {ballotCount === 1 ? "" : "s"} submitted
            </p>
          )}
        </div>
      )}
    </div>
  );
}
