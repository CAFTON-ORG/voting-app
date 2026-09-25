"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createEventAction } from "@/actions/events/mutations";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Collects only what an event needs to exist (name, slug, allowed
 * domains) — categories, candidates, and scheduling all have their own,
 * more capable UI in the event workspace, so a multi-step wizard that
 * duplicated them here just meant maintaining two worse copies of the
 * same forms. Landing on the workspace immediately after creation is
 * also just one fewer decision than a "what's next?" screen. */
export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createEventAction({
        name,
        slug,
        allowedDomains: allowedDomains.split(",").map((d) => d.trim()).filter(Boolean),
      });
      if (result.ok) {
        setOpen(false);
        router.push(`/admin/events/${result.data.id}`);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setName("");
          setSlug("");
          setSlugTouched(false);
          setAllowedDomains("");
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
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
            <DialogDescription>
              Starts as a draft. You&apos;ll add categories, candidates, and a schedule on the event page
              next.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-event-name">Event name</Label>
              <Input
                id="create-event-name"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Mr. & Ms. SIT — Netizen's Choice 2026"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-event-slug">URL slug</Label>
              <Input
                id="create-event-slug"
                required
                pattern="[-a-z0-9]+"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="mr-ms-sit-2026"
              />
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens only.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-event-domains">Allowed voter domains</Label>
              <Input
                id="create-event-domains"
                required
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                placeholder="s.ubaguio.edu, e.ubaguio.edu"
              />
              <p className="text-xs text-muted-foreground">Comma-separated, no leading &quot;@&quot;.</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
