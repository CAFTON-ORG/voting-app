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

  return (
    <div className="flex flex-col items-center gap-5 px-6 pt-12 pb-8 text-center sm:pt-16">
      <div
        className="flex size-16 items-center justify-center rounded-2xl sm:size-20"
        style={{ backgroundColor: bg, color: fg }}
      >
        <CalendarDays className="size-8 sm:size-9" />
      </div>

      <div>
        {organizer && <p className="text-sm font-medium text-muted-foreground">{organizer}</p>}
        <h1 className="mt-1 text-2xl font-semibold text-balance sm:text-3xl">{name}</h1>
      </div>

      <VotingStatusBadge state={state} />

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
        <Button asChild size="lg" className="mt-2 w-full max-w-xs">
          <Link href={`/events/${slug}/vote`}>Vote Now</Link>
        </Button>
      )}

      {ballotCount != null && (
        <p className="text-sm text-muted-foreground">
          {ballotCount.toLocaleString()} vote{ballotCount === 1 ? "" : "s"} submitted
        </p>
      )}
    </div>
  );
}
