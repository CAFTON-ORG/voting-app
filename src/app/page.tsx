import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  CalendarClock,
  ShieldCheck,
  EyeOff,
  GraduationCap,
  Vote,
} from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { VotingStatusBadge } from "@/components/voting/voting-status-badge";
import { LogoScene } from "@/components/shared/logo-scene";
import { Reveal } from "@/components/shared/reveal";
import { AuroraGlow } from "@/components/shared/aurora-glow";
import { CandidateAvatarStack } from "@/components/shared/candidate-avatar-stack";
import { CandidatePhoto } from "@/components/shared/candidate-photo";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { CAFTON_WEBSITE_URL } from "@/lib/site";
import type { EventState } from "@prisma/client";

const OPEN_EVENTS_ANCHOR = "open-for-voting";

// Lists live events — without this, Next prerenders the query result at
// build time (no dynamic API here to force dynamic rendering otherwise),
// baking in whatever events existed at deploy time until the next build.
export const dynamic = "force-dynamic";

type HomeEvent = {
  id: string;
  slug: string;
  name: string;
  state: EventState;
  coverImageUrl: string | null;
  candidates: { id: string; fullName: string; photoUrl: string | null }[];
};

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "One account, one vote" },
  { icon: EyeOff, label: "Ballots are anonymous" },
  { icon: GraduationCap, label: "University accounts only" },
];

// Up to this many real candidate photos show as an overlapping gallery
// row on an OPEN event's card - beyond this, initials-only tends to read
// as more of a crowd than a preview anyway.
const GALLERY_PREVIEW_COUNT = 4;

/** A small overlapping-photo gallery — actual candidate photos, not just
 * initials — for an OPEN event's card, so "who's running" has a real
 * preview right on the home page instead of only being visible one click
 * away. CandidatePhoto already handles the no-photo-yet fallback and its
 * own loading skeleton. */
function CandidatePhotoRow({ candidates }: { candidates: HomeEvent["candidates"] }) {
  const visible = candidates.slice(0, GALLERY_PREVIEW_COUNT);
  if (visible.length === 0) return null;

  return (
    <div className="flex -space-x-3">
      {visible.map((candidate) => (
        <div
          key={candidate.id}
          className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-muted ring-2 ring-background"
        >
          <CandidatePhoto
            photoUrl={candidate.photoUrl}
            fullName={candidate.fullName}
            sizes="2.5rem"
            initialsClassName="text-xs"
          />
        </div>
      ))}
    </div>
  );
}

/** One shared card for both the "Open for voting" and "Voting closed"
 * lists — same structure either way (a past event's own page is still
 * worth visiting: candidates, when it ran), but a past event is
 * deliberately quieter — no accent bar, no lift on hover, a plain arrow
 * instead of the "go vote" one, and a quiet initials-only avatar stack
 * instead of the real photo gallery — so it reads as archive, not
 * competing with a currently-live election for attention. The accent bar
 * reuses VotingStatusBadge's own green for OPEN, so the two never disagree. */
function EventCard({ event, delayMs }: { event: HomeEvent; delayMs: number }) {
  const isOpen = event.state === "OPEN";

  return (
    <Reveal delayMs={delayMs}>
      <Link
        href={`/events/${event.slug}`}
        className={cn(
          "group relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-card py-5 pr-5 pl-6 transition-all duration-200",
          isOpen ? "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg" : "hover:border-foreground/20"
        )}
      >
        <span
          aria-hidden
          className={cn("absolute inset-y-0 left-0 w-1", isOpen ? "bg-green-500 dark:bg-green-400" : "bg-border")}
        />
        {event.coverImageUrl && (
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-16">
            <Image src={event.coverImageUrl} alt="" fill sizes="4rem" className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-heading truncate text-xl font-medium sm:text-2xl">{event.name}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <VotingStatusBadge state={event.state} />
            {isOpen ? (
              <CandidatePhotoRow candidates={event.candidates} />
            ) : (
              <CandidateAvatarStack candidates={event.candidates} />
            )}
          </div>
        </div>
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
            isOpen
              ? "bg-muted group-hover:bg-primary group-hover:text-primary-foreground"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        >
          {isOpen ? (
            <ArrowUpRight className="size-5 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          ) : (
            <ArrowRight className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
          )}
        </div>
      </Link>
    </Reveal>
  );
}

export default async function Home() {
  const [allEvents, identity] = await Promise.all([
    prisma.event.findMany({
      // Archived is a deliberate soft-hide independent of state (see the
      // Event model) - an archived CLOSED/FINALIZED event stays out of
      // the default list here too, same as it already does in the admin
      // events list. DRAFT/SCHEDULED stay excluded as before (nothing
      // public to show yet); CLOSED/FINALIZED are now included alongside
      // OPEN, since a past event is still real public information (who
      // ran, that it happened) even once voting has ended - the same
      // "never expose candidate-level results" policy still applies on
      // its own page regardless of state.
      where: { state: { in: ["OPEN", "CLOSED", "FINALIZED"] }, archivedAt: null },
      orderBy: [{ votingOpensAt: "desc" }, { createdAt: "desc" }],
      include: {
        candidates: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
          select: { id: true, fullName: true, photoUrl: true },
        },
      },
    }),
    getTrustedIdentity(),
  ]);
  const openEvents = allEvents.filter((e) => e.state === "OPEN");
  const pastEvents = allEvents.filter((e) => e.state !== "OPEN");

  // Deliberately no votes-cast figure here: an event's own ballot count is
  // opt-in (Event.showPublicBallotCount), and summing across all of them
  // regardless would leak activity for an event that specifically asked to
  // keep its count private. Elections/candidates counts carry no such
  // restriction - they're already public on every event's own page.
  const stats = [
    { label: allEvents.length === 1 ? "Election" : "Elections", value: allEvents.length },
    { label: "Open now", value: openEvents.length },
    {
      label: "Candidates",
      value: allEvents.reduce((sum, event) => sum + event.candidates.length, 0),
    },
  ];

  return (
    <div className="relative flex min-h-svh flex-col">
      <AuroraGlow />
      <PublicHeader
        signedInEmail={identity?.email}
        signedInName={identity?.fullName}
        signedInAvatarUrl={identity?.avatarUrl}
      />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
        <section className="flex flex-col items-center gap-8 pt-20 pb-20 text-center sm:pt-28 sm:pb-24">
          <Reveal>
            <div className="flex flex-col items-center gap-3">
              <LogoScene size={104} />
              <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground/70 uppercase">
                Cafton Voting
              </span>
            </div>
          </Reveal>
          <div className="flex flex-col items-center gap-5">
            <Reveal delayMs={100}>
              <p className="text-sm font-medium text-muted-foreground">
                University of Baguio · School of Information Technology
              </p>
            </Reveal>
            <Reveal delayMs={150} className="max-w-2xl">
              <h1 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
                Secure elections,{" "}
                <span className="bg-linear-to-r from-foreground via-foreground/70 to-foreground bg-clip-text text-transparent">
                  one account, one vote
                </span>
              </h1>
            </Reveal>
            <Reveal delayMs={220}>
              <p className="max-w-md text-base text-muted-foreground text-balance">
                Vote in University of Baguio elections with your own school account — powered by{" "}
                <a
                  href={CAFTON_WEBSITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                >
                  CAFTON
                </a>
                .
              </p>
            </Reveal>
          </div>

          <Reveal delayMs={260}>
            {openEvents.length === 1 ? (
              <Button asChild size="lg" className="gap-2">
                <Link href={`/events/${openEvents[0].slug}`}>
                  <Vote className="size-4" />
                  Vote in {openEvents[0].name}
                </Link>
              </Button>
            ) : openEvents.length > 1 ? (
              <Button asChild size="lg" className="gap-2">
                <a href={`#${OPEN_EVENTS_ANCHOR}`}>
                  <Vote className="size-4" />
                  See what&rsquo;s open
                  <ArrowDown className="size-4" />
                </a>
              </Button>
            ) : null}
          </Reveal>

          <Reveal delayMs={320}>
            <div className="grid grid-cols-3 gap-3 rounded-2xl border bg-card/60 px-4 py-5 sm:gap-8 sm:px-8">
              {stats.map((stat, index) => (
                <div key={stat.label} className={cn("px-2 text-center", index > 0 && "border-l")}>
                  <p className="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delayMs={380}>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {TRUST_POINTS.map(({ icon: Icon, label }, index) => (
                <Fragment key={label}>
                  {index > 0 && <span aria-hidden className="hidden h-3.5 w-px bg-border sm:block" />}
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          </Reveal>
        </section>

        <section id={OPEN_EVENTS_ANCHOR} className="scroll-mt-20 border-t pt-14 pb-16">
          <SectionHeader label="Open for voting" count={openEvents.length > 0 ? openEvents.length : undefined} />
          {openEvents.length === 0 ? (
            <Reveal
              delayMs={280}
              className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarClock className="size-5" />
              </div>
              <div>
                <p className="text-base font-medium">Voting opens soon.</p>
                <p className="mt-1 text-sm text-muted-foreground">Check back shortly.</p>
              </div>
            </Reveal>
          ) : (
            <div className="flex flex-col gap-4">
              {openEvents.map((event, index) => (
                <EventCard key={event.id} event={event} delayMs={280 + index * 80} />
              ))}
            </div>
          )}
        </section>

        {pastEvents.length > 0 && (
          <section className="border-t pt-14 pb-24">
            <SectionHeader label="Voting closed" count={pastEvents.length} />
            <div className="flex flex-col gap-4">
              {pastEvents.map((event, index) => (
                <EventCard key={event.id} event={event} delayMs={280 + index * 80} />
              ))}
            </div>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
