import { Fragment } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, CalendarClock, ShieldCheck, EyeOff, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { VotingStatusBadge } from "@/components/voting/voting-status-badge";
import { LogoScene } from "@/components/shared/logo-scene";
import { Reveal } from "@/components/shared/reveal";
import { AuroraGlow } from "@/components/shared/aurora-glow";
import { CandidateAvatarStack } from "@/components/shared/candidate-avatar-stack";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import { CAFTON_WEBSITE_URL } from "@/lib/site";
import type { EventState } from "@prisma/client";

// Lists live events — without this, Next prerenders the query result at
// build time (no dynamic API here to force dynamic rendering otherwise),
// baking in whatever events existed at deploy time until the next build.
export const dynamic = "force-dynamic";

type HomeEvent = {
  id: string;
  slug: string;
  name: string;
  state: EventState;
  candidates: { id: string; fullName: string; photoUrl: string | null }[];
};

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "One account, one vote" },
  { icon: EyeOff, label: "Ballots are anonymous" },
  { icon: GraduationCap, label: "University accounts only" },
];

/** One shared card for both the "Open for voting" and "Voting closed"
 * lists — same structure either way (a past event's own page is still
 * worth visiting: candidates, when it ran), but a past event is
 * deliberately quieter — no accent bar, no lift on hover, a plain arrow
 * instead of the "go vote" one — so it reads as archive, not competing
 * with a currently-live election for attention. The accent bar reuses
 * VotingStatusBadge's own green for OPEN, so the two never disagree. */
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
        <div className="min-w-0 flex-1">
          <p className="font-heading truncate text-xl font-medium sm:text-2xl">{event.name}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <VotingStatusBadge state={event.state} />
            <CandidateAvatarStack candidates={event.candidates} />
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
            <LogoScene size={128} />
          </Reveal>
          <div className="flex flex-col items-center gap-5">
            <Reveal delayMs={100}>
              <p className="text-sm font-medium text-muted-foreground">
                University of Baguio · School of Information Technology
              </p>
            </Reveal>
            <Reveal delayMs={150} className="max-w-2xl">
              <h1 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
                Mr. &amp; Ms. SIT
                <br />
                <span className="bg-linear-to-r from-foreground via-foreground/70 to-foreground bg-clip-text text-transparent">
                  Netizen&rsquo;s Choice
                </span>
              </h1>
            </Reveal>
            <Reveal delayMs={220}>
              <p className="max-w-md text-base text-muted-foreground text-balance">
                Secure, one-account-one-vote elections for University of Baguio students and employees — powered
                by{" "}
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

          <Reveal delayMs={280}>
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

        <section className="border-t pt-14 pb-16">
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Open for voting</h2>
            {openEvents.length > 0 && (
              <Badge variant="secondary" className="tabular-nums">
                {openEvents.length}
              </Badge>
            )}
          </div>
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
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Voting closed</h2>
              <Badge variant="secondary" className="tabular-nums">
                {pastEvents.length}
              </Badge>
            </div>
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
