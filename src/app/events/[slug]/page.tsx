import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { getBallotCount } from "@/lib/results/queries";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { CandidatePreviewGrid } from "@/components/voting/candidate-preview-grid";

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
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="mx-auto max-w-sm text-center">
          <p className="text-sm font-medium text-muted-foreground">University of Baguio</p>
          <h1 className="mt-2 text-2xl font-semibold text-balance">{event.name}</h1>

          {ballotCount !== null && (
            <p className="mt-6 text-sm text-muted-foreground">
              {ballotCount.toLocaleString()} votes submitted
            </p>
          )}

          {event.state === "OPEN" && (
            <Button asChild className="mt-8 w-full">
              <Link href={`/events/${slug}/vote`}>Vote Now</Link>
            </Button>
          )}
          {event.state === "SCHEDULED" && (
            <p className="mt-8 text-sm text-muted-foreground">Voting has not opened yet.</p>
          )}
          {(event.state === "CLOSED" || event.state === "FINALIZED") && (
            <p className="mt-8 text-sm text-muted-foreground">Voting has closed.</p>
          )}
          {event.state === "PAUSED" && (
            <p className="mt-8 text-sm text-muted-foreground">Voting is temporarily paused.</p>
          )}
        </div>

        {candidates.length > 0 && (
          <div>
            <h2 className="text-center text-lg font-semibold">Meet the Candidates</h2>
            <div className="mt-6">
              <CandidatePreviewGrid candidates={candidates} />
            </div>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
