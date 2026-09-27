"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DomainsInput } from "@/components/admin/domains-input";
import { EventCoverUpload } from "@/components/admin/event-cover-upload";
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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { editEventSchema } from "@/lib/validation/events";
import { editEventAction } from "@/actions/events/mutations";
import type { Event } from "@prisma/client";
import type { z } from "zod";

type FormValues = z.infer<typeof editEventSchema>;

export function EditEventDialog({ event }: { event: Event }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(editEventSchema),
    mode: "onChange",
    defaultValues: {
      eventId: event.id,
      name: event.name,
      allowedDomains: event.allowedDomains,
      showPublicBallotCount: event.showPublicBallotCount,
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await editEventAction(values);
    if (result.ok) {
      setOpen(false);
      router.refresh();
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
        <Button variant="outline" size="sm">
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit event</DialogTitle>
              <DialogDescription>
                Name, allowed domains, and the public ballot-count toggle can be changed anytime before
                results are finalized.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label>Cover image</Label>
                <EventCoverUpload eventId={event.id} currentCoverUrl={event.coverImageUrl} />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
