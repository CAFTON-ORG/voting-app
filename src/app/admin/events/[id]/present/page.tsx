import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { getCandidateResults } from "@/lib/results/queries";
import { CandidateAvatar } from "@/components/voting/candidate-avatar";

/** Admin-only presentation screen for a FINALIZED event's winners —
 * suitable for projecting at the event. Deliberately not public: the
 * approved results policy only covers what voters see while voting is
 * open/closed, not a decision to publish final results publicly, which
 * remains a separate future call. */
export default async function PresentResultsPage(props: PageProps<"/admin/events/[id]/present">) {
  const { id } = await props.params;
  const admin = await requireAdmin();
  if (!roleCan(admin.role, "VIEW_FINAL_RESULTS")) {
    throw new Error("You don't have permission to view results.");
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();
  if (event.state !== "FINALIZED") {
    throw new Error("Results can only be presented once an event has been finalized.");
  }

  const categories = await getCandidateResults(event.id);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-6 py-16 text-center">
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{event.name}</p>
      <h1 className="mt-2 text-3xl font-semibold text-balance sm:text-4xl">Winners</h1>

      <div className="mt-16 flex w-full max-w-4xl flex-col gap-16">
        {categories.map((category) => {
          const topVotes = Math.max(0, ...category.candidates.map((c) => c.votes));
          const winners = category.candidates.filter((c) => c.votes === topVotes && topVotes > 0);
          const runnersUp = category.candidates.filter((c) => !winners.includes(c));

          return (
            <div key={category.id}>
              <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                {category.name}
              </p>
              {winners.length === 0 ? (
                <p className="mt-4 text-muted-foreground">No votes were cast in this category.</p>
              ) : (
                <div className="mt-6 flex flex-wrap justify-center gap-10">
                  {winners.map((winner) => (
                    <div key={winner.id} className="flex flex-col items-center gap-3">
                      <CandidateAvatar photoUrl={null} fullName={winner.fullName} className="size-28 text-2xl" />
                      <div>
                        <p className="text-2xl font-semibold">
                          #{winner.candidateNumber} {winner.fullName}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{winner.votes} votes</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {runnersUp.length > 0 && (
                <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  {runnersUp.map((candidate) => (
                    <li key={candidate.id}>
                      #{candidate.candidateNumber} {candidate.fullName} — {candidate.votes}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-24 text-xs text-muted-foreground">
        Voting Technology Partner — <span className="font-medium text-foreground">CAFTON</span>
      </p>
    </div>
  );
}
