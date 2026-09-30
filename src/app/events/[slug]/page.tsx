import { notFound } from "next/navigation";
import { getPublicEventDetail } from "@/lib/events/public-queries";
import { autoCloseIfExpired, autoOpenIfDue } from "@/lib/events/auto-transitions";
import { getBallotCount } from "@/lib/results/queries";
import { getTrustedIdentity } from "@/lib/auth/identity";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { EventHero } from "@/components/voting/event-hero";
import { CandidatePreviewGrid } from "@/components/voting/candidate-preview-grid";
import { AuroraGlow } from "@/components/shared/aurora-glow";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeader } from "@/components/shared/section-header";

/** Public event page. Deliberately shows only a total ballot count (and
 * only when the event owner enabled it) — never candidate-level totals,
 * percentages, or rankings while voting is open, per the approved public
 * results policy. Candidate photos/names/taglines are not results, so a
 * "meet the candidates" preview is shown regardless of voting state. */
export default async function EventPage(props: PageProps<"/events/[slug]">) {
  const { slug } = await props.params;
  const event = await getPublicEventDetail(slug);
  if (!event || event.state === "DRAFT") notFound();
  // `event` comes back from the Redis-backed public cache (see
  // src/lib/cache/public-cache.ts) - mutating it in place isn't something
  // to rely on (whether that leaks into the cached value is an internal
  // implementation detail, not a documented guarantee), so the
  // just-transitioned state is tracked separately instead of writing
  // event.state. Checked in order: an event can't be due to both open and
  // close at once (autoOpenIfDue only ever fires from SCHEDULED,
  // autoCloseIfExpired only from OPEN/PAUSED), but resolving open first
  // reads naturally as "advance state as far as reality allows".
  const state = (await autoOpenIfDue(event)) ? "OPEN" : (await autoCloseIfExpired(event)) ? "CLOSED" : event.state;

  const [ballotCount, identity] = await Promise.all([
    event.showPublicBallotCount ? getBallotCount(event.id) : Promise.resolve(null),
    getTrustedIdentity(),
  ]);

  const candidates = event.categories.flatMap((category) =>
    category.candidates.map((candidate) => ({
      id: candidate.id,
      candidateNumber: candidate.candidateNumber,
      fullName: candidate.fullName,
      photoUrl: candidate.photoUrl,
      programYear: candidate.programYear,
      tagline: candidate.tagline,
      bio: candidate.bio,
      categoryName: category.name,
    }))
  );

  return (
    <div className="relative flex min-h-svh flex-col">
      <AuroraGlow />
      <PublicHeader
        signedInEmail={identity?.email}
        signedInName={identity?.fullName}
        signedInAvatarUrl={identity?.avatarUrl}
      />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pb-16">
        <Reveal>
          <EventHero
            name={event.name}
            organizer="University of Baguio · School of Information Technology"
            state={state}
            votingOpensAt={event.votingOpensAt}
            votingClosesAt={event.votingClosesAt}
            slug={slug}
            ballotCount={ballotCount}
            categoryCount={event.categories.length}
            candidateCount={candidates.length}
            coverImageUrl={event.coverImageUrl}
          />
        </Reveal>

        <Reveal delayMs={150} className="border-t pt-14">
          <SectionHeader
            label="Meet the Candidates"
            count={candidates.length > 0 ? candidates.length : undefined}
          />
          {event.categories.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Voting categories haven&apos;t been configured yet.
            </p>
          ) : candidates.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Candidates haven&apos;t been announced yet.
            </p>
          ) : (
            <CandidatePreviewGrid candidates={candidates} />
          )}
        </Reveal>
      </main>
      <PublicFooter />
    </div>
  );
}
