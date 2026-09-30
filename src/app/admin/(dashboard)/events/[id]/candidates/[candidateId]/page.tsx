import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { StatusBadge } from "@/components/admin/status-badge";
import { EntityMetadata } from "@/components/admin/entity-metadata";
import { getAdminIdentitiesByIds, displayName } from "@/lib/admin/queries";
import { CandidateDetailEditButton } from "@/components/admin/candidate-detail-edit-button";
import { CandidateLifecycleActions } from "@/components/admin/candidate-lifecycle-actions";
import { CandidatePhotoLightbox } from "@/components/admin/candidate-photo-lightbox";
import { Logo } from "@/components/shared/logo";
import { autoCloseIfExpired } from "@/lib/events/auto-transitions";
import { getPercentageColor } from "@/lib/format/progress-color";
import { formatDateTime } from "@/lib/format/datetime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "cn";

export default async function CandidateDetailPage(
  props: PageProps<"/admin/events/[id]/candidates/[candidateId]">
) {
  const { id, candidateId } = await props.params;
  const admin = await requireAdmin();
  const can = (permission: Parameters<typeof roleCan>[1]) => roleCan(admin.role, permission);

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, eventId: id },
    include: { category: true, event: true, _count: { select: { selections: true } } },
  });
  if (!candidate) notFound();
  if (await autoCloseIfExpired(candidate.event)) candidate.event.state = "CLOSED";

  const creatorIdentities = await getAdminIdentitiesByIds(
    candidate.createdById ? [candidate.createdById] : []
  );
  const createdByName =
    candidate.createdById && creatorIdentities.has(candidate.createdById)
      ? displayName(creatorIdentities.get(candidate.createdById)!)
      : null;
  const createdByAvatarUrl =
    candidate.createdById && creatorIdentities.has(candidate.createdById)
      ? (creatorIdentities.get(candidate.createdById)!.avatarUrl ?? null)
      : null;

  const votingEnded = candidate.event.state === "CLOSED" || candidate.event.state === "FINALIZED";
  const votingEverActive = candidate.event.state === "OPEN" || candidate.event.state === "PAUSED";
  const canSeeVotes =
    (votingEverActive && can("VIEW_LIVE_RESULTS")) || (votingEnded && can("VIEW_FINAL_RESULTS"));

  // See src/app/admin/(dashboard)/events/[id]/page.tsx's own canEdit
  // comment: candidate name/photo edits are locked once the event has
  // ever gone live, same threshold as structural changes, not just once
  // FINALIZED.
  const eventIsEditable = candidate.event.state === "DRAFT" || candidate.event.state === "SCHEDULED";
  const canManageLimited = can("MANAGE_CANDIDATES_LIMITED") && eventIsEditable;
  const canManageFull = can("MANAGE_CANDIDATES_FULL") && eventIsEditable;

  const rawCategories = await prisma.candidateCategory.findMany({
    where: { eventId: id },
    select: { id: true, name: true, _count: { select: { candidates: true } } },
    orderBy: { displayOrder: "asc" },
  });
  const categories = rawCategories.map((c) => ({ id: c.id, name: c.name, candidateCount: c._count.candidates }));

  const categoryTotalVotes = canSeeVotes
    ? await prisma.ballotSelection.count({ where: { categoryId: candidate.categoryId } })
    : 0;
  const votePercentage =
    categoryTotalVotes > 0 ? Math.round((candidate._count.selections / categoryTotalVotes) * 1000) / 10 : 0;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/admin/events/${id}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to {candidate.event.name}
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row">
        {candidate.photoUrl ? (
          <CandidatePhotoLightbox photoUrl={candidate.photoUrl} fullName={candidate.fullName} />
        ) : (
          <div className="relative aspect-4/5 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-80">
            <div className="flex size-full items-center justify-center">
              <Logo size={56} className="text-muted-foreground/40" />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">#{candidate.candidateNumber}</p>
              <h1 className="text-xl font-semibold">{candidate.fullName}</h1>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={candidate.isActive ? "ACTIVE" : "INACTIVE"} />
                <span className="text-sm text-muted-foreground">{candidate.category.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {canManageLimited && (
                <CandidateDetailEditButton
                  eventId={id}
                  categories={categories}
                  canEditStructural={canManageFull}
                  initialValues={{
                    id: candidate.id,
                    categoryId: candidate.categoryId,
                    candidateNumber: candidate.candidateNumber,
                    fullName: candidate.fullName,
                    programYear: candidate.programYear ?? "",
                    photoUrl: candidate.photoUrl,
                  }}
                />
              )}
              <CandidateLifecycleActions
                candidateId={candidate.id}
                fullName={candidate.fullName}
                isActive={candidate.isActive}
                eventId={id}
                canManageLimited={canManageLimited}
                canManageFull={canManageFull}
              />
            </div>
          </div>

          {/* Name, number, and category already show in the header above -
              repeating them here read as redundant. This card now only
              carries the one field the header doesn't (course/year), plus
              a compact activity footnote, so it earns a whole Card at all;
              when there's a live vote count to show, it sits alongside
              instead of stacked below, so the page doesn't scroll further
              than the actual amount of content justifies. */}
          <div className={cn("grid grid-cols-1 gap-4", canSeeVotes && "lg:grid-cols-5")}>
            <Card className={cn(canSeeVotes && "lg:col-span-3")}>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Course / Year level</p>
                  <p className="text-sm">{candidate.programYear ?? "—"}</p>
                </div>
                <div className="border-t pt-4">
                  {createdByName ? (
                    <EntityMetadata
                      createdByName={createdByName}
                      createdByAvatarUrl={createdByAvatarUrl}
                      createdAt={candidate.createdAt}
                      withAvatar
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">Added {formatDateTime(candidate.createdAt)}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {canSeeVotes && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Voting Information</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-semibold tabular-nums">{candidate._count.selections}</p>
                    <p className="text-xs text-muted-foreground">votes</p>
                    <p className="ml-auto text-sm font-medium tabular-nums">{votePercentage}%</p>
                  </div>
                  <Progress value={votePercentage} indicatorClassName={getPercentageColor(votePercentage)} />
                  <p className="text-xs text-muted-foreground">
                    of {categoryTotalVotes} vote{categoryTotalVotes === 1 ? "" : "s"} cast in{" "}
                    {candidate.category.name}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
