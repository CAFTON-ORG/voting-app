"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { rescheduleEventSchema } from "@/lib/validation/events";
import { rescheduleEventAction } from "@/actions/events/mutations";
import type { z } from "zod";

type FormValues = z.infer<typeof rescheduleEventSchema>;

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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(rescheduleEventSchema),
    mode: "onChange",
    defaultValues: { eventId, votingOpensAt: currentOpensAt, votingClosesAt: currentClosesAt },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await rescheduleEventAction(values);
    if (result.ok) {
      toast.success("Schedule updated");
      setOpen(false);
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  const opensAt = useWatch({ control: form.control, name: "votingOpensAt" });
  const closesAt = useWatch({ control: form.control, name: "votingClosesAt" });
  const changed = opensAt?.getTime() !== currentOpensAt.getTime() || closesAt?.getTime() !== currentClosesAt.getTime();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset({ eventId, votingOpensAt: currentOpensAt, votingClosesAt: currentClosesAt });
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock className="size-3.5" />
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
              <FormField
                control={form.control}
                name="votingOpensAt"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>New opening time</FormLabel>
                    <DateTimePicker value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="votingClosesAt"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>New closing time</FormLabel>
                    <DateTimePicker value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <Button type="submit" disabled={form.formState.isSubmitting || !changed}>
                {form.formState.isSubmitting ? "Saving…" : "Confirm Reschedule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
