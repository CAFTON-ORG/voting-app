"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DateTimePicker } from "@/components/admin/date-time-picker";
import { scheduleEventAction } from "@/actions/events/mutations";

export function ScheduleEventForm({ eventId }: { eventId: string }) {
  const [opensAt, setOpensAt] = useState<Date | undefined>();
  const [closesAt, setClosesAt] = useState<Date | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!opensAt || !closesAt) {
      setError("Both an opening and closing date/time are required.");
      return;
    }
    startTransition(async () => {
      const result = await scheduleEventAction({ eventId, votingOpensAt: opensAt, votingClosesAt: closesAt });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm font-medium">Set schedule to move this event to SCHEDULED</p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Opens</Label>
              <DateTimePicker value={opensAt} onChange={setOpensAt} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Closes</Label>
              <DateTimePicker value={closesAt} onChange={setClosesAt} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Saving…" : "Schedule Event"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
