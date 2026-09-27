"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Vote } from "lucide-react";
import { cn } from "cn";
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

/** An event with a cover image gets it as a real 21:9 banner (loading
 * skeleton + fade-in, same pattern as CandidatePhoto); one without falls
 * back to a generated color identity (same hash as EventAvatar) washed
 * softly behind the content, so no event ever looks unfinished. */
export function EventHero({
  name,
  organizer,
  state,
  votingOpensAt,
  votingClosesAt,
  slug,
  ballotCount,
  categoryCount,
  candidateCount,
  coverImageUrl,
}: {
  name: string;
  organizer?: string;
  state: EventState;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
  slug: string;
  ballotCount?: number | null;
  categoryCount: number;
  candidateCount: number;
  coverImageUrl?: string | null;
}) {
  const { bg, fg } = getAvatarColor(name);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const hasStatusPanel =
    (state === "SCHEDULED" && votingOpensAt) ||
    (state === "OPEN" && votingClosesAt) ||
    ((state === "CLOSED" || state === "FINALIZED") && votingClosesAt) ||
    state === "PAUSED" ||
    state === "OPEN" ||
    ballotCount != null;

  return (
    <div className="relative flex flex-col items-center gap-6 overflow-hidden px-6 pt-12 pb-8 text-center sm:pt-16">
      {!coverImageUrl && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-[0.15]"
          style={{ background: `radial-gradient(closest-side, ${bg}, transparent 70%)` }}
        />
      )}

      {coverImageUrl ? (
        <div className="relative aspect-21/9 w-full max-w-2xl overflow-hidden rounded-3xl bg-muted shadow-lg">
          <Image
            src={coverImageUrl}
            alt=""
            fill
            priority
            sizes="(min-width: 672px) 42rem, 100vw"
            onLoad={() => setCoverLoaded(true)}
            className={cn("object-cover transition-opacity duration-300", coverLoaded ? "opacity-100" : "opacity-0")}
          />
          {!coverLoaded && <div aria-hidden className="absolute inset-0 animate-pulse bg-muted" />}
        </div>
      ) : (
        <div className="relative flex items-center justify-center">
          <div aria-hidden className="absolute size-24 rounded-full opacity-40 blur-2xl sm:size-28" style={{ backgroundColor: bg }} />
          <div
            className="relative flex size-16 items-center justify-center rounded-2xl shadow-lg sm:size-20"
            style={{ backgroundColor: bg, color: fg }}
          >
            <Vote className="size-8 sm:size-9" />
          </div>
        </div>
      )}

      <div>
        {organizer && <p className="text-sm font-medium text-muted-foreground">{organizer}</p>}
        <h1 className="font-heading mt-1 text-3xl font-semibold text-balance sm:text-4xl">{name}</h1>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <VotingStatusBadge state={state} />
        <span aria-hidden className="h-3 w-px bg-border" />
        <p className="text-xs text-muted-foreground">
          {categoryCount} categor{categoryCount === 1 ? "y" : "ies"} · {candidateCount} candidate
          {candidateCount === 1 ? "" : "s"}
        </p>
      </div>

      {hasStatusPanel && (
        <div className="flex w-full max-w-xs flex-col items-center gap-5 rounded-2xl border bg-card/70 px-6 py-6 shadow-sm backdrop-blur-sm">
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
            <Button asChild size="lg" className="w-full gap-2">
              <Link href={`/events/${slug}/vote`}>
                <Vote className="size-4" />
                Vote Now
              </Link>
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
