"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "cn";
import { Logo } from "@/components/shared/logo";
import { getAvatarColor } from "@/lib/format/avatar-color";
import { formatSchedule } from "@/lib/format/datetime";
import { VotingStatusBadge } from "@/components/voting/voting-status-badge";
import { VotingCountdown } from "@/components/voting/voting-countdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EventState } from "@prisma/client";

/** An event with a cover image gets a real banner - name and status
 * overlaid directly on the photo via a bottom scrim, the way a cover photo
 * is actually supposed to work (Facebook/YouTube-style), rather than a
 * small image floating above separate text. Rendered as a rounded card
 * within the page's own side padding, not broken out edge-to-edge - once
 * the banner has rounded corners, sitting flush against the viewport edge
 * on mobile just reads as the image being cut off, not as an intentional
 * full-bleed treatment. No cover still gets the same rounded banner box,
 * scrim, and white overlaid text - just with the event's generated color
 * wash in place of a photo - instead of falling back to plain page-
 * background text with no box at all, so every event has a consistent
 * banner shape whether or not it has a real cover photo.
 *
 * The cover itself renders twice, stacked: a blurred, zoomed copy fills
 * the whole frame edge-to-edge as a backdrop (purely decorative), and the
 * real photo sits on top at `object-contain` — so whatever the source
 * image's own aspect ratio is, none of it is ever cropped, while the
 * banner still always fills its full width with no visible letterboxing.
 * Same technique Spotify/Apple Music use for oddly-shaped cover art. */
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
    <div className="relative flex flex-col items-center gap-6 pt-8 pb-8 text-center sm:pt-10">
      {coverImageUrl ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted sm:aspect-2/1">
          <Image
            src={coverImageUrl}
            alt=""
            fill
            aria-hidden
            sizes="(min-width: 56rem) 56rem, calc(100vw - 3rem)"
            className="scale-125 object-cover opacity-70 blur-2xl"
          />
          <div aria-hidden className="absolute inset-0 bg-background/40" />
          <Image
            src={coverImageUrl}
            alt=""
            fill
            priority
            sizes="(min-width: 56rem) 56rem, calc(100vw - 3rem)"
            onLoad={() => setCoverLoaded(true)}
            className={cn("object-contain transition-opacity duration-300", coverLoaded ? "opacity-100" : "opacity-0")}
          />
          {!coverLoaded && <div aria-hidden className="absolute inset-0 animate-pulse bg-muted" />}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/80 via-black/25 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-6 pb-6 text-center">
            {organizer && <p className="text-sm font-medium text-white/80">{organizer}</p>}
            <h1 className="font-heading text-2xl font-semibold text-balance text-white sm:text-4xl">{name}</h1>
            <VotingStatusBadge state={state} />
          </div>
        </div>
      ) : (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted sm:aspect-2/1">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 30% 20%, ${bg}, transparent 65%)` }}
          />
          <Logo
            aria-hidden
            size={64}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ color: fg, opacity: 0.35 }}
          />
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-6 pb-6 text-center">
            {organizer && <p className="text-sm font-medium text-white/80">{organizer}</p>}
            <h1 className="font-heading text-2xl font-semibold text-balance text-white sm:text-4xl">{name}</h1>
            <VotingStatusBadge state={state} />
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {categoryCount} categor{categoryCount === 1 ? "y" : "ies"} · {candidateCount} candidate
        {candidateCount === 1 ? "" : "s"}
      </p>

      {hasStatusPanel && (
        <Card className="w-full max-w-xs">
          <CardContent className="flex flex-col items-center gap-5">
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
                <Link href={`/events/${slug}/vote`}>Vote Now</Link>
              </Button>
            )}

            {ballotCount != null && (
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{ballotCount.toLocaleString()}</span> vote
                {ballotCount === 1 ? "" : "s"} submitted
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
