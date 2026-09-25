import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { getBallotCount, getCandidateResults } from "@/lib/results/queries";
import { EventStateActions } from "@/components/admin/event-state-actions";
import { ScheduleEventForm } from "@/components/admin/schedule-event-form";
import { ManageCandidatesForm } from "@/components/admin/manage-candidates-form";
import { CandidatePhotoUpload } from "@/components/admin/candidate-photo-upload";

export default async function AdminEventDetailPage(props: PageProps<"/admin/events/[id]">) {
  const { id } = await props.params;
  const admin = await requireAdmin();
  const can = (permission: Parameters<typeof roleCan>[1]) => roleCan(admin.role, permission);

  const event = await prisma.event.findUnique({
    where: { id },
    include: { categories: { orderBy: { displayOrder: "asc" }, include: { candidates: true } } },
  });
  if (!event) notFound();

  const ballotCount = await getBallotCount(event.id);

  const votingEverActive = event.state === "OPEN" || event.state === "PAUSED";
  const votingEnded = event.state === "CLOSED" || event.state === "FINALIZED";
  const canSeeLive = votingEverActive && can("VIEW_LIVE_RESULTS");
  const canSeeFinal = votingEnded && can("VIEW_FINAL_RESULTS");
  const results = canSeeLive || canSeeFinal ? await getCandidateResults(event.id) : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-xl font-semibold">{event.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {event.state} · {event.eligibilityMode} · {ballotCount} votes submitted
      </p>

      <div className="mt-6">
        <EventStateActions eventId={event.id} state={event.state} can={can} />
      </div>

      {event.state === "DRAFT" && can("MANAGE_EVENT_CONFIG") && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Schedule
          </h2>
          <div className="mt-3">
            <ScheduleEventForm eventId={event.id} />
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Results
        </h2>
        {!results && (
          <p className="mt-2 text-sm text-muted-foreground">
            {votingEverActive
              ? "Your role does not include live results while voting is open."
              : "Results are not yet available."}
          </p>
        )}
        {results && (
          <div className="mt-3 flex flex-col gap-4">
            {results.map((category) => (
              <div key={category.id}>
                <p className="text-sm font-medium">{category.name}</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {category.candidates.map((candidate) => (
                    <li key={candidate.id} className="flex justify-between text-sm">
                      <span>
                        #{candidate.candidateNumber} {candidate.fullName}
                      </span>
                      <span className="font-medium">{candidate.votes}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Candidates
        </h2>

        {(event.state === "DRAFT" || event.state === "SCHEDULED") &&
          can("MANAGE_CANDIDATES_FULL") && (
            <div className="mt-3">
              <ManageCandidatesForm eventId={event.id} categories={event.categories} />
            </div>
          )}

        <div className="mt-4 flex flex-col gap-4">
          {event.categories.map((category) => (
            <div key={category.id}>
              <p className="text-sm font-medium">{category.name}</p>
              <ul className="mt-2 flex flex-col gap-2">
                {category.candidates.map((candidate) => (
                  <li key={candidate.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      #{candidate.candidateNumber} {candidate.fullName}
                      {!candidate.isActive && " (inactive)"}
                    </span>
                    {can("MANAGE_CANDIDATES_LIMITED") && event.state !== "FINALIZED" && (
                      <CandidatePhotoUpload
                        candidateId={candidate.id}
                        currentPhotoUrl={candidate.photoUrl}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
