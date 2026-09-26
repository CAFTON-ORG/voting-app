import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { autoCloseIfExpired } from "@/lib/events/auto-close";
import { getBallotCount } from "@/lib/results/queries";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { EventHero } from "@/components/voting/event-hero";
import { CandidatePreviewGrid } from "@/components/voting/candidate-preview-grid";
import { AuroraGlow } from "@/components/shared/aurora-glow";
import { Reveal } from "@/components/shared/reveal";

/** Public event page. Deliberately shows only a total ballot count (and
 * only when the event owner enabled it) — never candidate-level totals,
 * percentages, or rankings while voting is open, per the approved public
 * results policy. Candidate photos/names/taglines are not results, so a
 * "meet the candidates" preview is shown regardless of voting state. */
export default async function EventPage(props: PageProps<"/events/[slug]">) {
  const { slug } = await props.params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { displayOrder: "asc" },
        include: { candidates: { where: { isActive: true }, orderBy: { displayOrder: "asc" } } },
      },
    },
  });
  if (!event || event.state === "DRAFT") notFound();
  if (await autoCloseIfExpired(event)) event.state = "CLOSED";

  const ballotCount = event.showPublicBallotCount ? await getBallotCount(event.id) : null;

  const candidates = event.categories.flatMap((category) =>
    category.candidates.map((candidate) => ({
      id: candidate.id,
      candidateNumber: candidate.candidateNumber,
      fullName: candidate.fullName,
      photoUrl: candidate.photoUrl,
      tagline: candidate.tagline,
      categoryName: category.name,
    }))
  );

  return (
    <div className="relative flex min-h-svh flex-col">
      <AuroraGlow />
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-16 px-6 pb-16">
        <Reveal>
          <EventHero
            name={event.name}
            organizer="University of Baguio · School of Information Technology"
            state={event.state}
            votingOpensAt={event.votingOpensAt}
            votingClosesAt={event.votingClosesAt}
            slug={slug}
            ballotCount={ballotCount}
          />
        </Reveal>

        <Reveal delayMs={150}>
          {event.categories.length === 0 ? (
            <>
              <h2 className="font-heading text-xl font-semibold">Meet the Candidates</h2>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Voting categories haven&apos;t been configured yet.
              </p>
            </>
          ) : candidates.length === 0 ? (
            <>
              <h2 className="font-heading text-xl font-semibold">Meet the Candidates</h2>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Candidates haven&apos;t been announced yet.
              </p>
            </>
          ) : (
            <CandidatePreviewGrid candidates={candidates} />
          )}
        </Reveal>
      </main>
      <PublicFooter />
    </div>
  );
}
