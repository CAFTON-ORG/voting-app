"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deleteEventAction } from "@/actions/events/mutations";

export function DeleteEventButton({
  eventId,
  eventName,
  /** Icon-only, no text label — matches the row's own View button (see
   * events-table.tsx) instead of the labeled outline button used on the
   * event workspace's own header toolbar. A tooltip stands in for the
   * label that's no longer visible. */
  iconOnly = false,
}: {
  eventId: string;
  eventName: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  // See ArchiveEventButton for why the icon-only case drives ConfirmDialog
  // via open/onOpenChange rather than its trigger prop.
  const [confirmOpen, setConfirmOpen] = useState(false);

  const title = `Delete "${eventName}"?`;
  const description = "This permanently removes the event and its candidates. Only available when it has no submitted ballots.";
  const onConfirm = async () => {
    const result = await deleteEventAction(eventId);
    if (!result.ok) throw new Error(result.message);
    router.push("/admin");
  };

  if (!iconOnly) {
    return (
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive">
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        }
        title={title}
        description={description}
        confirmLabel="Delete Event"
        variant="destructive"
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={title}
        description={description}
        confirmLabel="Delete Event"
        variant="destructive"
        onConfirm={onConfirm}
      />
    </>
  );
}
