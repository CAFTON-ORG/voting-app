"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTableRowActions } from "@/components/admin/data-table-row-actions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { deactivateCandidateAction } from "@/actions/candidates/mutations";

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

export function CandidateCard({
  candidate,
  canManageFull,
  onEdit,
}: {
  candidate: CandidateCardData;
  canManageFull: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();

  return (
    <Card className="overflow-hidden py-0">
      <div className="relative aspect-4/5 w-full bg-muted">
        {candidate.photoUrl ? (
          <Image
            src={candidate.photoUrl}
            alt={candidate.fullName}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-3xl font-semibold text-muted-foreground">
            {candidate.fullName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("")}
          </div>
        )}
        <div className="absolute right-2 top-2">
          <StatusBadge status={candidate.isActive ? "ACTIVE" : "INACTIVE"} />
        </div>
      </div>
      <CardContent className="flex flex-col gap-1 py-3">
        <p className="text-xs font-medium text-muted-foreground">#{candidate.candidateNumber}</p>
        <Link
          href={`/admin/events/${candidate.eventId}/candidates/${candidate.id}`}
          className="truncate font-medium hover:underline"
        >
          {candidate.fullName}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {candidate.programYear ? `${candidate.programYear} · ` : ""}
          {candidate.categoryName}
        </p>
        <div className="mt-2 flex items-center justify-end">
          <DataTableRowActions>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            {canManageFull && candidate.isActive && (
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
            )}
          </DataTableRowActions>
        </div>
      </CardContent>
    </Card>
  );
}
