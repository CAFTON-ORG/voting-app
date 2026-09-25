import Link from "next/link";
import { notFound } from "next/navigation";
import { Presentation } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { getBallotCount, getCandidateResults } from "@/lib/results/queries";
import { getVoterParticipations } from "@/lib/voting/participation";
import { EventStateActions } from "@/components/admin/event-state-actions";
import { ScheduleEventForm } from "@/components/admin/schedule-event-form";
import { ManageCandidatesForm } from "@/components/admin/manage-candidates-form";
import { CandidatePhotoUpload } from "@/components/admin/candidate-photo-upload";
import { EditEventDialog } from "@/components/admin/edit-event-dialog";
import { DeleteEventButton } from "@/components/admin/delete-event-button";
import { CandidateAvatar } from "@/components/voting/candidate-avatar";
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

const STATE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SCHEDULED: "secondary",
  OPEN: "default",
  PAUSED: "destructive",
  CLOSED: "secondary",
  FINALIZED: "outline",
};

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

  const canSeeVoters = can("VIEW_VOTER_LIST");
  const voters = canSeeVoters ? await getVoterParticipations(event.id) : null;

  const canManageCandidatesFull =
    (event.state === "DRAFT" || event.state === "SCHEDULED") && can("MANAGE_CANDIDATES_FULL");
  const canManageCandidatesLimited = can("MANAGE_CANDIDATES_LIMITED") && event.state !== "FINALIZED";

  const canEdit = can("MANAGE_EVENT_CONFIG") && event.state !== "FINALIZED";
  const canDelete = can("MANAGE_EVENT_CONFIG") && (event.state === "DRAFT" || event.state === "SCHEDULED");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{event.name}</h1>
          <Badge variant={STATE_VARIANT[event.state] ?? "outline"}>{event.state}</Badge>
          <span className="text-sm text-muted-foreground">{event.eligibilityMode}</span>
        </div>
        <div className="flex gap-2">
          {event.state === "FINALIZED" && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/events/${event.id}/present`}>
                <Presentation className="size-3.5" />
                Present Results
              </Link>
            </Button>
          )}
          {canEdit && <EditEventDialog event={event} />}
          {canDelete && <DeleteEventButton eventId={event.id} eventName={event.name} />}
        </div>
      </div>
      <p className="-mt-4 text-sm text-muted-foreground">{ballotCount} votes submitted</p>

      <div>
        <EventStateActions eventId={event.id} state={event.state} role={admin.role} />
      </div>

      {event.state === "DRAFT" && can("MANAGE_EVENT_CONFIG") && <ScheduleEventForm eventId={event.id} />}

      <Tabs defaultValue="candidates">
        <TabsList>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          {canSeeVoters && <TabsTrigger value="voters">Voters</TabsTrigger>}
        </TabsList>

        <TabsContent value="candidates" className="mt-4">
          {canManageCandidatesFull && (
            <div className="mb-4">
              <ManageCandidatesForm eventId={event.id} categories={event.categories} />
            </div>
          )}
          <div className="flex flex-col gap-6">
            {event.categories.map((category) => (
              <div key={category.id}>
                <p className="text-sm font-medium">{category.name}</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {category.candidates.map((candidate) => (
                    <li key={candidate.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CandidateAvatar
                          photoUrl={candidate.photoUrl}
                          fullName={candidate.fullName}
                          className="size-9"
                        />
                        <span className="text-sm">
                          #{candidate.candidateNumber} {candidate.fullName}
                          {!candidate.isActive && (
                            <span className="text-muted-foreground"> (inactive)</span>
                          )}
                        </span>
                      </div>
                      {canManageCandidatesLimited && (
                        <CandidatePhotoUpload
                          candidateId={candidate.id}
                          currentPhotoUrl={candidate.photoUrl}
                        />
                      )}
                    </li>
                  ))}
                  {category.candidates.length === 0 && (
                    <li className="text-sm text-muted-foreground">No candidates yet.</li>
                  )}
                </ul>
              </div>
            ))}
            {event.categories.length === 0 && (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          {!results && (
            <p className="text-sm text-muted-foreground">
              {votingEverActive
                ? "Your role does not include live results while voting is open."
                : "Results are not yet available."}
            </p>
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
              <p className="text-sm text-muted-foreground">No one has voted yet.</p>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
