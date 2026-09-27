"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { archiveEventAction, unarchiveEventAction } from "@/actions/events/mutations";

export function ArchiveEventButton({
  eventId,
  eventName,
  archived,
  /** Icon-only, no text label — matches the row's own View button (see
   * events-table.tsx) instead of the labeled outline button used on the
   * event workspace's own header toolbar. A tooltip stands in for the
   * label that's no longer visible. */
  iconOnly = false,
}: {
  eventId: string;
  eventName: string;
  archived: boolean;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  // ConfirmDialog's own `trigger` prop clones an onClick onto whatever
  // element is passed directly to it — a Tooltip-wrapped Button doesn't
  // forward that clone the way a bare Button does (Tooltip's root isn't a
  // DOM node), so the icon-only case drives ConfirmDialog via its
  // open/onOpenChange props instead, exactly as ConfirmDialog's own doc
  // comment recommends for a trigger that isn't a plain Button.
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (archived) {
    async function handleRestore() {
      const result = await unarchiveEventAction(eventId);
      if (result.ok) {
        toast.success("Event restored");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    }

    if (!iconOnly) {
      return (
        <Button variant="outline" size="sm" onClick={handleRestore}>
          <ArchiveRestore className="size-3.5" />
          Restore
        </Button>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" onClick={handleRestore}>
            <ArchiveRestore className="size-4" />
            <span className="sr-only">Restore</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Restore</TooltipContent>
      </Tooltip>
    );
  }

  const title = `Archive "${eventName}"?`;
  const description =
    "Hides it from the default events list. All history, results, and audit records are kept — this can be undone anytime.";
  const onConfirm = async () => {
    const result = await archiveEventAction(eventId);
    if (!result.ok) throw new Error(result.message);
    toast.success("Event archived");
    router.refresh();
  };

  if (!iconOnly) {
    return (
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="sm">
            <Archive className="size-3.5" />
            Archive
          </Button>
        }
        title={title}
        description={description}
        confirmLabel="Archive"
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setConfirmOpen(true)}>
            <Archive className="size-4" />
            <span className="sr-only">Archive</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Archive</TooltipContent>
      </Tooltip>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={title}
        description={description}
        confirmLabel="Archive"
        onConfirm={onConfirm}
      />
    </>
  );
}
