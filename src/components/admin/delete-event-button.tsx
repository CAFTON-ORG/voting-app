"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deleteEventAction } from "@/actions/events/mutations";

export function DeleteEventButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm" className="gap-1.5 text-destructive">
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      }
      title={`Delete "${eventName}"?`}
      description="This permanently removes the event and its candidates. Only available when it has no submitted ballots."
      confirmLabel="Delete Event"
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteEventAction(eventId);
        if (!result.ok) throw new Error(result.message);
        router.push("/admin");
      }}
    />
  );
}
