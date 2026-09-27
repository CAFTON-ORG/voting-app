"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DomainsInput } from "@/components/admin/domains-input";
import { EventCoverPicker } from "@/components/admin/event-cover-picker";
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
import { uploadEventCoverAction } from "@/actions/events/cover";
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
  // Same reasoning as CandidateFormSheet's pendingPhoto: there's no eventId
  // yet to upload a cover against until createEventAction returns one, so
  // the picked file is held here and uploaded right after.
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(createEventSchema),
    mode: "onChange",
    defaultValues: { name: "", allowedDomains: [], showPublicBallotCount: true },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await createEventAction(values);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (pendingCover) {
      const formData = new FormData();
      formData.set("cover", pendingCover);
      const coverResult = await uploadEventCoverAction(result.data.id, formData);
      if (!coverResult.ok) {
        // The event itself was created successfully - a failed cover
        // upload shouldn't block navigating to it, just say so; the cover
        // can always be added from the edit dialog.
        toast.warning(`Event created, but the cover couldn't be uploaded: ${coverResult.message}`);
      }
    }
    setOpen(false);
    router.push(`/admin/events/${result.data.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setError(null);
          setPendingCover(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <CalendarPlus className="size-3.5" />
          New Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>New event</DialogTitle>
              <DialogDescription>
                Starts as a draft. You&apos;ll add categories, candidates, and a schedule on the event page
                next.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Cover image</Label>
                <EventCoverPicker file={pendingCover} onChange={setPendingCover} />
              </div>
              <div className="flex flex-col gap-4">
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
                <FormField
                  control={form.control}
                  name="showPublicBallotCount"
                  render={({ field }) => (
                    <FormItem className="flex-row items-center justify-between">
                      <FormLabel>Show public ballot count</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
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
