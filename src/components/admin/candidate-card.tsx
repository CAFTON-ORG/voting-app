"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, UserX, UserCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTableRowActions } from "@/components/admin/data-table-row-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { CandidatePhoto } from "@/components/shared/candidate-photo";
import {
  deactivateCandidateAction,
  activateCandidateAction,
  deleteCandidateAction,
} from "@/actions/candidates/mutations";

export type CandidateCardData = {
  id: string;
  eventId: string;
  candidateNumber: number;
  fullName: string;
  photoUrl: string | null;
  programYear: string | null;
  tagline: string | null;
  bio: string | null;
  isActive: boolean;
  categoryName: string;
};

/** Poster-style, matching the public ballot's CandidateCard visual
 * language (photo fills the tile, number as a Badge, name overlaid on a
 * gradient scrim) — an admin looking at this grid and the public one a
 * voter sees should recognize it as the same candidate roster, not two
 * unrelated designs. */
export function CandidateCard({
  candidate,
  canManageFull,
  canManageLimited,
  onEdit,
}: {
  candidate: CandidateCardData;
  canManageFull: boolean;
  canManageLimited: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-lg">
      <div className="relative aspect-4/5 w-full bg-muted">
        <CandidatePhoto
          photoUrl={candidate.photoUrl}
          fullName={candidate.fullName}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        />

        {/* A flat tint instead of scaling the photo on hover — scaling a
            fill-positioned image risks visible overflow/clipping at the
            card's rounded corners; this reads as "hovered" just as clearly
            without moving the image at all. */}
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />

        <Badge className="absolute top-2 left-2 shadow-sm" variant="secondary">
          #{candidate.candidateNumber}
        </Badge>
        <div className="absolute top-2 right-2">
          <StatusBadge status={candidate.isActive ? "ACTIVE" : "INACTIVE"} />
        </div>

        <Link
          href={`/admin/events/${candidate.eventId}/candidates/${candidate.id}`}
          className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-3 pt-8 pb-2"
        >
          <p className="truncate font-medium text-white hover:underline">{candidate.fullName}</p>
        </Link>
      </div>

      <div className="flex items-center justify-between gap-2 p-2.5">
        <p className="truncate text-xs text-muted-foreground">
          {candidate.programYear ? `${candidate.programYear} · ` : ""}
          {candidate.categoryName}
        </p>
        <DataTableRowActions>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          {canManageLimited &&
            (candidate.isActive ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => {
                  const result = await deactivateCandidateAction(candidate.id);
                  if (result.ok) {
                    toast.success("Candidate deactivated");
                    router.refresh();
                  } else {
                    toast.error(result.message);
                  }
                }}
              >
                <UserX className="size-4" />
                Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={async () => {
                  const result = await activateCandidateAction(candidate.id);
                  if (result.ok) {
                    toast.success("Candidate activated");
                    router.refresh();
                  } else {
                    toast.error(result.message);
                  }
                }}
              >
                <UserCheck className="size-4" />
                Activate
              </DropdownMenuItem>
            ))}
          {canManageFull && (
            <ConfirmDialog
              trigger={
                <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              }
              title={`Delete ${candidate.fullName}?`}
              description="This permanently removes the candidate. This can't be undone."
              confirmLabel="Delete"
              variant="destructive"
              onConfirm={async () => {
                const result = await deleteCandidateAction(candidate.id);
                if (!result.ok) throw new Error(result.message);
                toast.success("Candidate deleted");
                router.refresh();
              }}
            />
          )}
        </DataTableRowActions>
      </div>
    </div>
  );
}
