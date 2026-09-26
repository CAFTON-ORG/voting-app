"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateTimePicker } from "@/components/admin/date-time-picker";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { scheduleEventSchema } from "@/lib/validation/events";
import { scheduleEventAction } from "@/actions/events/mutations";
import type { z } from "zod";

type FormValues = z.infer<typeof scheduleEventSchema>;

export function ScheduleEventForm({ eventId }: { eventId: string }) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(scheduleEventSchema),
    mode: "onChange",
    defaultValues: { eventId, votingOpensAt: undefined, votingClosesAt: undefined },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await scheduleEventAction(values);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <p className="text-sm font-medium">Set schedule to move this event to SCHEDULED</p>
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="votingOpensAt"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Opens</FormLabel>
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
                    <FormLabel>Closes</FormLabel>
                    <DateTimePicker value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={form.formState.isSubmitting} className="self-start">
              {form.formState.isSubmitting ? "Saving…" : "Schedule Event"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
