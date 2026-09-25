"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { archiveEventAction, unarchiveEventAction } from "@/actions/events/mutations";

export function ArchiveEventButton({
  eventId,
  eventName,
  archived,
}: {
  eventId: string;
  eventName: string;
  archived: boolean;
}) {
  const router = useRouter();

  if (archived) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          const result = await unarchiveEventAction(eventId);
          if (result.ok) {
            toast.success("Event restored");
            router.refresh();
          } else {
            toast.error(result.message);
          }
        }}
      >
        <ArchiveRestore className="size-3.5" />
        Restore
      </Button>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          <Archive className="size-3.5" />
          Archive
        </Button>
      }
      title={`Archive "${eventName}"?`}
      description="Hides it from the default events list. All history, results, and audit records are kept — this can be undone anytime."
      confirmLabel="Archive"
      onConfirm={async () => {
        const result = await archiveEventAction(eventId);
        if (!result.ok) throw new Error(result.message);
        toast.success("Event archived");
        router.refresh();
      }}
    />
  );
}
