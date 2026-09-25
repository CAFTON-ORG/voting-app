"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createEventAction } from "@/actions/events/mutations";

export function CreateEventForm() {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("s.ubaguio.edu, e.ubaguio.edu");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const event = await createEventAction({
          slug,
          name,
          allowedDomains: allowedDomains
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
        });
        router.push(`/admin/events/${event.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="event-name" className="text-sm font-medium">
          Event name
        </label>
        <input
          id="event-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mr. & Ms. SIT — Netizen's Choice 2026"
          className="rounded-md border p-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="event-slug" className="text-sm font-medium">
          URL slug
        </label>
        <input
          id="event-slug"
          required
          pattern="[a-z0-9-]+"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="mr-ms-sit-2026"
          className="rounded-md border p-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens only.</p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="event-domains" className="text-sm font-medium">
          Allowed voter domains
        </label>
        <input
          id="event-domains"
          required
          value={allowedDomains}
          onChange={(e) => setAllowedDomains(e.target.value)}
          className="rounded-md border p-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">Comma-separated, no leading &quot;@&quot;.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create Event"}
      </Button>
    </form>
  );
}
