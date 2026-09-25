"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/admin/date-time-picker";
import { rescheduleEventAction } from "@/actions/events/mutations";

export function RescheduleEventDialog({
  eventId,
  currentOpensAt,
  currentClosesAt,
}: {
  eventId: string;
  currentOpensAt: Date;
  currentClosesAt: Date;
}) {
  const [open, setOpen] = useState(false);
  const [opensAt, setOpensAt] = useState<Date | undefined>(currentOpensAt);
  const [closesAt, setClosesAt] = useState<Date | undefined>(currentClosesAt);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!opensAt || !closesAt) {
      setError("Both dates are required.");
      return;
    }
    startTransition(async () => {
      const result = await rescheduleEventAction({ eventId, votingOpensAt: opensAt, votingClosesAt: closesAt });
      if (result.ok) {
        toast.success("Schedule updated");
        setOpen(false);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  const changed = opensAt?.getTime() !== currentOpensAt.getTime() || closesAt?.getTime() !== currentClosesAt.getTime();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock className="size-3.5" />
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Reschedule voting</DialogTitle>
            <DialogDescription>Only possible before voting opens.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Current schedule
              </p>
              <p className="mt-1">
                {currentOpensAt.toLocaleString()} — {currentClosesAt.toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>New opening time</Label>
              <DateTimePicker value={opensAt} onChange={setOpensAt} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>New closing time</Label>
              <DateTimePicker value={closesAt} onChange={setClosesAt} />
            </div>
            {changed && opensAt && closesAt && (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  New schedule
                </p>
                <p className="mt-1">
                  {opensAt.toLocaleString()} — {closesAt.toLocaleString()}
                </p>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !changed}>
              {pending ? "Saving…" : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
