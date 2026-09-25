"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { scheduleEventAction } from "@/actions/events/mutations";

export function ScheduleEventForm({ eventId }: { eventId: string }) {
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await scheduleEventAction({
          eventId,
          votingOpensAt: new Date(opensAt),
          votingClosesAt: new Date(closesAt),
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border p-4">
      <p className="text-sm font-medium">Set schedule to move this event to SCHEDULED</p>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="opens-at" className="text-xs font-medium text-muted-foreground">
            Opens
          </label>
          <input
            id="opens-at"
            type="datetime-local"
            required
            value={opensAt}
            onChange={(e) => setOpensAt(e.target.value)}
            className="rounded-md border p-2 text-sm"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="closes-at" className="text-xs font-medium text-muted-foreground">
            Closes
          </label>
          <input
            id="closes-at"
            type="datetime-local"
            required
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className="rounded-md border p-2 text-sm"
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Schedule Event"}
      </Button>
    </form>
  );
}
