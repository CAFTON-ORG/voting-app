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
} from "lucide-react";
import { getPublicHomeEvents } from "@/lib/events/public-queries";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { VotingStatusBadge } from "@/components/voting/voting-status-badge";
import { LogoScene } from "@/components/shared/logo-scene";
import { Reveal } from "@/components/shared/reveal";
import { AuroraGlow } from "@/components/shared/aurora-glow";
import { CandidateAvatarStack } from "@/components/shared/candidate-avatar-stack";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { CAFTON_WEBSITE_URL } from "@/lib/site";
import { getAvatarColor } from "@/lib/format/avatar-color";
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

/** A currently-live election gets the full treatment: its cover photo (or,
 * lacking one, the same generated color wash EventHero falls back to) as a
 * real banner with the name and status overlaid on it, Facebook/YouTube-
 * cover style — so "what's open right now" reads as the main event on the
 * page, not just another row in a list. Candidate photos and the vote CTA
 * live in a plain content strip below the banner, deliberately never on
 * top of the image. Candidates render through the same CandidateAvatarStack
 * used on closed events, at the same fixed small size regardless of how
 * many there are — a single candidate previously showed via a much larger
 * square photo here, which read as "enlarged" next to the closed cards'
 * compact circular stack; this keeps every event card visually consistent. */
function OpenEventCard({
  event,
  delayMs,
}: {
  event: HomeEvent;
  delayMs: number;
}) {
  const { bg } = getAvatarColor(event.name);
  const candidateCount = event.candidates.length;

  return (
    <Reveal delayMs={delayMs}>
      <Link
        href={`/events/${event.slug}`}
        className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {event.coverImageUrl ? (
            <Image
              src={event.coverImageUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 48rem, 100vw"
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 25% 15%, ${bg}, transparent 65%)`,
              }}
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent"
          />
          <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur-md">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-green-400" />
            </span>
            Voting Open
          </span>
          <h3 className="font-heading absolute inset-x-0 bottom-0 px-5 pb-5 text-xl font-semibold text-balance text-white sm:px-6 sm:pb-6 sm:text-2xl">
            {event.name}
          </h3>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <CandidateAvatarStack candidates={event.candidates} />
            {candidateCount > 0 && (
              <span className="truncate text-sm text-muted-foreground">
                {candidateCount} candidate{candidateCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-4 py-2 text-sm font-medium transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            Vote Now
            <ArrowUpRight className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}

/** A closed election is deliberately quieter than an open one — no accent
 * bar, no lift on hover, a plain arrow, and a compact initials-only avatar
 * stack instead of a photo gallery — so it reads as archive (still worth
 * visiting: who ran, when it happened) without competing with a
 * currently-live election for attention. */
function ClosedEventCard({
  event,
  delayMs,
}: {
  event: HomeEvent;
  delayMs: number;
}) {
  return (
    <Reveal delayMs={delayMs}>
      <Link
        href={`/events/${event.slug}`}
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-card py-5 pr-5 pl-6 transition-colors hover:border-foreground/20"
      >
        {event.coverImageUrl && (
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-16">
            <Image
              src={event.coverImageUrl}
              alt=""
              fill
              sizes="4rem"
              className="object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-heading truncate text-xl font-medium sm:text-2xl">
            {event.name}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <VotingStatusBadge state={event.state} />
            <CandidateAvatarStack candidates={event.candidates} />
          </div>
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:text-foreground">
          <ArrowRight className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
        </div>
      </Link>
    </Reveal>
  );
}

export default async function Home() {
  const [allEvents, identity] = await Promise.all([
    // Cached for 20s (see src/lib/events/public-queries.ts) - every action
    // that changes which events should show here also busts this
    // explicitly, so this window only matters between now and the next
    // admin change, not as the normal update latency.
    getPublicHomeEvents(),
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
    {
      label: allEvents.length === 1 ? "Election" : "Elections",
      value: allEvents.length,
    },
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
                Vote in University of Baguio elections with your own school
                account — powered by{" "}
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
                  Vote in {openEvents[0].name}
                </Link>
              </Button>
            ) : openEvents.length > 1 ? (
              <Button asChild size="lg" className="gap-2">
                <a href={`#${OPEN_EVENTS_ANCHOR}`}>
                  See what&rsquo;s open
                  <ArrowDown className="size-4" />
                </a>
              </Button>
            ) : null}
          </Reveal>

          <Reveal delayMs={320}>
            <div className="grid grid-cols-3 gap-3 rounded-2xl border bg-card/60 px-4 py-5 sm:gap-8 sm:px-8">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={cn("px-2 text-center", index > 0 && "border-l")}
                >
                  <p className="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delayMs={380}>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {TRUST_POINTS.map(({ icon: Icon, label }, index) => (
                <Fragment key={label}>
                  {index > 0 && (
                    <span
                      aria-hidden
                      className="hidden h-3.5 w-px bg-border sm:block"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {label}
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>
          </Reveal>
        </section>

        <section
          id={OPEN_EVENTS_ANCHOR}
          className="scroll-mt-20 border-t pt-14 pb-16"
        >
          <SectionHeader
            label="Open for voting"
            count={openEvents.length > 0 ? openEvents.length : undefined}
          />
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
                <p className="mt-1 text-sm text-muted-foreground">
                  Check back shortly.
                </p>
              </div>
            </Reveal>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {openEvents.map((event, index) => (
                <OpenEventCard
                  key={event.id}
                  event={event}
                  delayMs={280 + index * 80}
                />
              ))}
            </div>
          )}
        </section>

        {pastEvents.length > 0 && (
          <section className="border-t pt-14 pb-24">
            <SectionHeader label="Voting closed" count={pastEvents.length} />
            <div className="flex flex-col gap-4">
              {pastEvents.map((event, index) => (
                <ClosedEventCard
                  key={event.id}
                  event={event}
                  delayMs={280 + index * 80}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
