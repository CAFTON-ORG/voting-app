import Link from "next/link";
import { notFound } from "next/navigation";
import { Presentation, ChevronLeft, BarChart3, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { getBallotCount, getCandidateResults } from "@/lib/results/queries";
import { getVoterParticipations } from "@/lib/voting/participation";
import { getAdminIdentitiesByIds, displayName } from "@/lib/admin/queries";
import { getEventReadiness } from "@/lib/events/readiness";
import { EventStateActions } from "@/components/admin/event-state-actions";
import { ScheduleEventForm } from "@/components/admin/schedule-event-form";
import { RescheduleEventDialog } from "@/components/admin/reschedule-event-dialog";
import { CategoryManager } from "@/components/admin/category-manager";
import { CandidatesGrid } from "@/components/admin/candidates-grid";
import { EditEventDialog } from "@/components/admin/edit-event-dialog";
import { DeleteEventButton } from "@/components/admin/delete-event-button";
import { ArchiveEventButton } from "@/components/admin/archive-event-button";
import { EventReadinessCard } from "@/components/admin/event-readiness-card";
import { EventAvatar } from "@/components/admin/event-avatar";
import { EmptyState } from "@/components/admin/empty-state";
import { EntityMetadata } from "@/components/admin/entity-metadata";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatCards } from "@/components/admin/stat-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

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

  const categoryOptions = event.categories.map((c) => ({ id: c.id, name: c.name }));
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
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <EventAvatar name={event.name} />
            <h1 className="text-xl font-semibold">{event.name}</h1>
            <StatusBadge status={event.archivedAt ? "ARCHIVED" : event.state} />
            <Badge variant="outline">{event.eligibilityMode}</Badge>
          </div>
          <div className="mt-1">
            <EntityMetadata
              createdByName={event.createdById && adminIdentities.has(event.createdById) ? displayName(adminIdentities.get(event.createdById)!) : null}
              createdAt={event.createdAt}
              updatedByName={event.updatedById && adminIdentities.has(event.updatedById) ? displayName(adminIdentities.get(event.updatedById)!) : null}
              updatedAt={event.updatedAt}
            />
          </div>
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

          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-muted-foreground">Schedule</p>
            {event.votingOpensAt && event.votingClosesAt ? (
              <div className="mt-2 flex flex-col gap-1 text-sm">
                <p>Opens: {event.votingOpensAt.toLocaleString()}</p>
                <p>Closes: {event.votingClosesAt.toLocaleString()}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Not scheduled yet.</p>
            )}
          </div>

          {event.state === "DRAFT" && can("MANAGE_EVENT_CONFIG") && <ScheduleEventForm eventId={event.id} />}

          <EventStateActions
            eventId={event.id}
            state={event.state}
            role={admin.role}
            isReady={readiness.isReady}
          />
        </div>

        <div className="lg:col-span-8">
          <Tabs defaultValue="candidates">
            <TabsList>
              <TabsTrigger value="candidates">Candidates</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              {canSeeVoters && <TabsTrigger value="voters">Voters</TabsTrigger>}
            </TabsList>

            <TabsContent value="candidates" className="mt-4">
              <CandidatesGrid
                eventId={event.id}
                categories={categoryOptions}
                candidates={flatCandidates}
                canManageFull={canManageCandidatesFull}
                canManageLimited={canManageCandidatesLimited}
              />
            </TabsContent>

            <TabsContent value="categories" className="mt-4">
              <CategoryManager
                eventId={event.id}
                categories={categoryRows}
                canManageFull={canManageCandidatesFull}
                canManageLimited={canManageCandidatesLimited}
              />
            </TabsContent>

            <TabsContent value="results" className="mt-4">
              {!results && (
                <EmptyState
                  icon={BarChart3}
                  title={votingEverActive ? "Live results are hidden" : "Results not available yet"}
                  description={
                    votingEverActive
                      ? "Your role does not include live results while voting is open."
                      : "Results will appear here once voting has started."
                  }
                />
              )}
              {results && (
                <div className="flex flex-col gap-6">
                  {results.map((category) => (
                    <div key={category.id}>
                      <p className="text-sm font-medium">{category.name}</p>
                      <Table className="mt-2">
                        <TableBody>
                          {category.candidates.map((candidate) => (
                            <TableRow key={candidate.id}>
                              <TableCell className="w-10 text-muted-foreground">
                                #{candidate.candidateNumber}
                              </TableCell>
                              <TableCell>{candidate.fullName}</TableCell>
                              <TableCell className="text-right font-medium">{candidate.votes}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {canSeeVoters && (
              <TabsContent value="voters" className="mt-4">
                {voters && voters.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Voted at</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voters.map((voter) => (
                        <TableRow key={voter.email + voter.votedAt.toISOString()}>
                          <TableCell>{voter.email}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {voter.votedAt.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="No one has voted yet"
                    description="Participation will show up here as voters cast their ballots."
                  />
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
