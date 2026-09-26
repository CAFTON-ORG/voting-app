"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserX, UserCheck, Trash2 } from "lucide-react";
import { DataTableRowActions } from "@/components/admin/data-table-row-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { deactivateCandidateAction, activateCandidateAction, deleteCandidateAction } from "@/actions/candidates/mutations";

/** The detail-page counterpart to CandidateCard's own dropdown - same
 * three actions (deactivate/activate/delete), same permission windows.
 * Kept as a separate component rather than reusing CandidateCard's
 * internals because this page navigates away on delete (the candidate it
 * was showing no longer exists) instead of just refreshing in place. */
export function CandidateLifecycleActions({
  candidateId,
  fullName,
  isActive,
  eventId,
  canManageLimited,
  canManageFull,
}: {
  candidateId: string;
  fullName: string;
  isActive: boolean;
  eventId: string;
  canManageLimited: boolean;
  canManageFull: boolean;
}) {
  const router = useRouter();

  if (!canManageLimited && !canManageFull) return null;

  return (
    <DataTableRowActions>
      {canManageLimited &&
        (isActive ? (
          <DropdownMenuItem
            variant="destructive"
            onClick={async () => {
              const result = await deactivateCandidateAction(candidateId);
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
              const result = await activateCandidateAction(candidateId);
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
          title={`Delete ${fullName}?`}
          description="This permanently removes the candidate. This can't be undone."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={async () => {
            const result = await deleteCandidateAction(candidateId);
            if (!result.ok) throw new Error(result.message);
            toast.success("Candidate deleted");
            router.push(`/admin/events/${eventId}`);
          }}
        />
      )}
    </DataTableRowActions>
  );
}
