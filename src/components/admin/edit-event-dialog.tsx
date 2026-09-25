"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { editEventAction } from "@/actions/events/mutations";
import type { Event } from "@prisma/client";

export function EditEventDialog({ event }: { event: Event }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(event.name);
  const [allowedDomains, setAllowedDomains] = useState(event.allowedDomains.join(", "));
  const [showPublicBallotCount, setShowPublicBallotCount] = useState(event.showPublicBallotCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await editEventAction({
        eventId: event.id,
        name,
        allowedDomains: allowedDomains.split(",").map((d) => d.trim()).filter(Boolean),
        showPublicBallotCount,
      });
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit event</DialogTitle>
            <DialogDescription>
              Name, allowed domains, and the public ballot-count toggle can be changed anytime before
              results are finalized.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Event name</Label>
              <Input id="edit-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-domains">Allowed voter domains</Label>
              <Input
                id="edit-domains"
                required
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-ballot-count">Show public ballot count</Label>
              <Switch
                id="edit-ballot-count"
                checked={showPublicBallotCount}
                onCheckedChange={setShowPublicBallotCount}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
