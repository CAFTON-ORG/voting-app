import Link from "next/link";
import { notFound } from "next/navigation";
import { Presentation, ChevronLeft, CalendarClock, CalendarX2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { getBallotCount, getCandidateResults } from "@/lib/results/queries";
import { getVoterParticipations } from "@/lib/voting/participation";
import { getAdminIdentitiesByIds, displayName } from "@/lib/admin/queries";
import { getEventReadiness, getElapsedPercent, isFuture } from "@/lib/events/readiness";
import { autoCloseIfExpired } from "@/lib/events/auto-close";
import { EventStateActions } from "@/components/admin/event-state-actions";
import { VotingCountdown } from "@/components/voting/voting-countdown";
import { ScheduleEventForm } from "@/components/admin/schedule-event-form";
import { RescheduleEventDialog } from "@/components/admin/reschedule-event-dialog";
import { EventWorkspaceTabs } from "@/components/admin/event-workspace-tabs";
import { EditEventDialog } from "@/components/admin/edit-event-dialog";
import { DeleteEventButton } from "@/components/admin/delete-event-button";
import { ArchiveEventButton } from "@/components/admin/archive-event-button";
import { EventReadinessCard } from "@/components/admin/event-readiness-card";
import { EventAvatar } from "@/components/admin/event-avatar";
import { EntityMetadata } from "@/components/admin/entity-metadata";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatCards } from "@/components/admin/stat-cards";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function AdminEventDetailPage(props: PageProps<"/admin/events/[id]">) {
  const { id } = await props.params;
  const admin = await requireAdmin();
  const can = (permission: Parameters<typeof roleCan>[1]) => roleCan(admin.role, permission);

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      categories: {
        orderBy: { displayOrder: "asc" },
        include: { candidates: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });
  if (!event) notFound();
  if (await autoCloseIfExpired(event)) event.state = "CLOSED";

  const ballotCount = await getBallotCount(event.id);

  const votingEverActive = event.state === "OPEN" || event.state === "PAUSED";
  const votingEnded = event.state === "CLOSED" || event.state === "FINALIZED";
  const canSeeLive = votingEverActive && can("VIEW_LIVE_RESULTS");
  const canSeeFinal = votingEnded && can("VIEW_FINAL_RESULTS");
  const results = canSeeLive || canSeeFinal ? await getCandidateResults(event.id) : null;

  const canSeeVoters = can("VIEW_VOTER_LIST");
  const voters = canSeeVoters ? await getVoterParticipations(event.id) : null;

  const canManageCandidatesFull =
    (event.state === "DRAFT" || event.state === "SCHEDULED") && can("MANAGE_CANDIDATES_FULL");
  const canManageCandidatesLimited = can("MANAGE_CANDIDATES_LIMITED") && event.state !== "FINALIZED";

  const canEdit = can("MANAGE_EVENT_CONFIG") && event.state !== "FINALIZED";
  const canDelete =
    can("MANAGE_EVENT_CONFIG") &&
    ((event.state === "DRAFT" || event.state === "SCHEDULED") ||
      (Boolean(event.archivedAt) && ballotCount === 0));
  const canArchive = can("MANAGE_EVENT_CONFIG") && (event.state === "CLOSED" || event.state === "FINALIZED");
  const canReschedule = can("MANAGE_EVENT_CONFIG") && event.state === "SCHEDULED";

  const totalCandidates = event.categories.reduce((sum, c) => sum + c.candidates.length, 0);
  const readiness = getEventReadiness(event);

  const adminIdentities = await getAdminIdentitiesByIds(
    [event.createdById, event.updatedById].filter((v): v is string => Boolean(v))
  );
  const createdByName =
    event.createdById && adminIdentities.has(event.createdById)
      ? displayName(adminIdentities.get(event.createdById)!)
      : null;
  const updatedByName =
    event.updatedById && adminIdentities.has(event.updatedById)
      ? displayName(adminIdentities.get(event.updatedById)!)
      : null;
  const createdByAvatarUrl =
    event.createdById && adminIdentities.has(event.createdById)
      ? (adminIdentities.get(event.createdById)!.avatarUrl ?? null)
      : null;
  const updatedByAvatarUrl =
    event.updatedById && adminIdentities.has(event.updatedById)
      ? (adminIdentities.get(event.updatedById)!.avatarUrl ?? null)
      : null;

  const elapsedPercent =
    votingEverActive && event.votingOpensAt && event.votingClosesAt
      ? getElapsedPercent(event.votingOpensAt, event.votingClosesAt)
      : null;

  const flatCandidates = event.categories.flatMap((category) =>
    category.candidates.map((candidate) => ({
      id: candidate.id,
      eventId: event.id,
      candidateNumber: candidate.candidateNumber,
      fullName: candidate.fullName,
      photoUrl: candidate.photoUrl,
      programYear: candidate.programYear,
      tagline: candidate.tagline,
      bio: candidate.bio,
      isActive: candidate.isActive,
      categoryName: category.name,
    }))
  );
  const categoryRows = event.categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    candidateCount: c.candidates.length,
    candidates: c.candidates.map((candidate) => ({
      id: candidate.id,
      fullName: candidate.fullName,
      photoUrl: candidate.photoUrl,
    })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to Events
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <EventAvatar name={event.name} />
          <h1 className="text-xl font-semibold">{event.name}</h1>
          <StatusBadge status={event.archivedAt ? "ARCHIVED" : event.state} />
        </div>
        <div className="flex flex-wrap gap-2">
          {event.state === "FINALIZED" && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/events/${event.id}/present`}>
                <Presentation className="size-3.5" />
                Present Results
              </Link>
            </Button>
          )}
          {canReschedule && event.votingOpensAt && event.votingClosesAt && (
            <RescheduleEventDialog
              eventId={event.id}
              currentOpensAt={event.votingOpensAt}
              currentClosesAt={event.votingClosesAt}
            />
          )}
          {canEdit && <EditEventDialog event={event} />}
          {canArchive && (
            <ArchiveEventButton eventId={event.id} eventName={event.name} archived={Boolean(event.archivedAt)} />
          )}
          {canDelete && <DeleteEventButton eventId={event.id} eventName={event.name} />}
        </div>
      </div>

      <StatCards
        stats={[
          { label: "Categories", value: event.categories.length },
          { label: "Candidates", value: totalCandidates },
          { label: "Votes submitted", value: ballotCount },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          {!readiness.isReady && event.state !== "FINALIZED" && <EventReadinessCard items={readiness.items} />}

          {/* Before a schedule exists, the "Not scheduled yet" card was
              just dead weight above the very form that sets it - hidden
              until there's an actual schedule to show, and the form
              itself takes the prominent first slot instead. */}
          {event.state === "DRAFT" && can("MANAGE_EVENT_CONFIG") && <ScheduleEventForm eventId={event.id} />}

          {event.votingOpensAt && event.votingClosesAt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300">
                      <CalendarClock className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Opens</p>
                      <p className="text-sm font-medium">
                        {event.votingOpensAt.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                      <CalendarX2 className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Closes</p>
                      <p className="text-sm font-medium">
                        {event.votingClosesAt.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                  {votingEverActive && isFuture(event.votingClosesAt) ? (
                    <div className="flex justify-center rounded-lg border bg-muted/40 py-3">
                      <VotingCountdown target={event.votingClosesAt} label="Closes in" />
                    </div>
                  ) : (
                    event.state === "SCHEDULED" &&
                    isFuture(event.votingOpensAt) && (
                      <div className="flex justify-center rounded-lg border bg-muted/40 py-3">
                        <VotingCountdown target={event.votingOpensAt} label="Opens in" />
                      </div>
                    )
                  )}
                  {elapsedPercent !== null && (
                    <div>
                      <Progress
                        value={elapsedPercent}
                        className="h-1.5"
                        indicatorClassName={
                          elapsedPercent >= 100
                            ? "bg-red-500 dark:bg-red-400"
                            : elapsedPercent >= 70
                              ? "bg-amber-500 dark:bg-amber-400"
                              : "bg-green-500 dark:bg-green-400"
                        }
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {elapsedPercent}% through the voting window
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {(createdByName || updatedByName) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
              </CardHeader>
              <CardContent>
                <EntityMetadata
                  createdByName={createdByName}
                  createdByAvatarUrl={createdByAvatarUrl}
                  createdAt={event.createdAt}
                  updatedByName={updatedByName}
                  updatedByAvatarUrl={updatedByAvatarUrl}
                  updatedAt={event.updatedAt}
                  withAvatar
                />
              </CardContent>
            </Card>
          )}

          <EventStateActions
            eventId={event.id}
            state={event.state}
            role={admin.role}
            isReady={readiness.isReady}
          />
        </div>

        <div className="lg:col-span-8">
          <EventWorkspaceTabs
            eventId={event.id}
            categories={categoryRows}
            candidates={flatCandidates}
            canManageFull={canManageCandidatesFull}
            canManageLimited={canManageCandidatesLimited}
            results={results}
            votingEverActive={votingEverActive}
            canSeeVoters={canSeeVoters}
            voters={voters}
          />
        </div>
      </div>
    </div>
  );
}
