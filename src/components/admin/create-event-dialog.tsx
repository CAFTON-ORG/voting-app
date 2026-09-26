"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DomainsInput } from "@/components/admin/domains-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { createEventSchema } from "@/lib/validation/events";
import { createEventAction } from "@/actions/events/mutations";
import type { z } from "zod";

type FormValues = z.infer<typeof createEventSchema>;

/** Collects only what an event needs to exist (name, allowed domains) —
 * categories, candidates, and scheduling all have their own, more capable
 * UI in the event workspace, so a multi-step wizard that duplicated them
 * here just meant maintaining two worse copies of the same forms. The URL
 * slug is derived from the name and uniquified server-side — nobody needs
 * to see or set it, so it's not a field here at all. */
export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(createEventSchema),
    mode: "onChange",
    defaultValues: { name: "", allowedDomains: [] },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await createEventAction(values);
    if (result.ok) {
      setOpen(false);
      router.push(`/admin/events/${result.data.id}`);
    } else {
      setError(result.message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <CalendarPlus className="size-3.5" />
          New Event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>New event</DialogTitle>
              <DialogDescription>
                Starts as a draft. You&apos;ll add categories, candidates, and a schedule on the event page
                next.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Mr. & Ms. SIT — Netizen's Choice 2026" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allowedDomains"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowed voter domains</FormLabel>
                    <FormControl>
                      <DomainsInput value={field.value} onChange={field.onChange} placeholder="s.ubaguio.edu" />
                    </FormControl>
                    <FormDescription>Type a domain and press Enter — no leading &quot;@&quot;.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating…" : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
