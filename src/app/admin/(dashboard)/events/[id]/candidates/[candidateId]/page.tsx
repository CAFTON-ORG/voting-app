import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { StatusBadge } from "@/components/admin/status-badge";
import { CandidateDetailEditButton } from "@/components/admin/candidate-detail-edit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const votingEnded = candidate.event.state === "CLOSED" || candidate.event.state === "FINALIZED";
  const votingEverActive = candidate.event.state === "OPEN" || candidate.event.state === "PAUSED";
  const canSeeVotes =
    (votingEverActive && can("VIEW_LIVE_RESULTS")) || (votingEnded && can("VIEW_FINAL_RESULTS"));

  const canManageLimited = can("MANAGE_CANDIDATES_LIMITED") && candidate.event.state !== "FINALIZED";
  const canManageFull =
    can("MANAGE_CANDIDATES_FULL") && (candidate.event.state === "DRAFT" || candidate.event.state === "SCHEDULED");

  const categories = await prisma.candidateCategory.findMany({
    where: { eventId: id },
    select: { id: true, name: true },
    orderBy: { displayOrder: "asc" },
  });

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
        <div className="relative aspect-4/5 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-56">
          {candidate.photoUrl ? (
            <Image src={candidate.photoUrl} alt={candidate.fullName} fill className="object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-4xl font-semibold text-muted-foreground">
              {candidate.fullName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join("")}
            </div>
          )}
        </div>

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
                  tagline: candidate.tagline ?? "",
                  bio: candidate.bio ?? "",
                  photoUrl: candidate.photoUrl,
                }}
              />
            )}
          </div>

          {candidate.tagline && <p className="text-sm italic text-muted-foreground">&quot;{candidate.tagline}&quot;</p>}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Candidate Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Full name</p>
                <p>{candidate.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Program/Year</p>
                <p>{candidate.programYear ?? "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Biography</p>
                <p className="whitespace-pre-wrap">{candidate.bio || "No biography provided."}</p>
              </div>
            </CardContent>
          </Card>

          {canSeeVotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Voting Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{candidate._count.selections}</p>
                <p className="text-xs text-muted-foreground">votes</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Activity</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Added {candidate.createdAt.toLocaleString()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
