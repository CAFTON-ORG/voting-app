import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const events = await prisma.event.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {admin.email} · {admin.role}
        </p>
      </div>
      {roleCan(admin.role, "MANAGE_EVENT_CONFIG") && (
        <Button asChild className="mt-4">
          <Link href="/admin/events/new">New Event</Link>
        </Button>
      )}
      <ul className="mt-6 flex flex-col gap-2">
        {events.map((event) => (
          <li key={event.id}>
            <Link
              href={`/admin/events/${event.id}`}
              className="block rounded-md border p-4 transition-colors hover:bg-muted/50"
            >
              <p className="font-medium">{event.name}</p>
              <p className="text-xs text-muted-foreground">
                {event.state} · {event.eligibilityMode}
              </p>
            </Link>
          </li>
        ))}
        {events.length === 0 && (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No events yet.
          </li>
        )}
      </ul>
    </div>
  );
}
