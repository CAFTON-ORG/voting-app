import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { getBallotCount } from "@/lib/results/queries";
import { getAdminEmailsByIds } from "@/lib/admin/queries";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/admin/page-title";
import { StatCards } from "@/components/admin/stat-cards";
import { EventsTable, type EventRow } from "@/components/admin/events-table";

export default async function AdminEventsPage() {
  const admin = await requireAdmin();
  const can = (permission: Parameters<typeof roleCan>[1]) => roleCan(admin.role, permission);

  const [events, teamCount] = await Promise.all([
    prisma.event.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.adminUser.count({ where: { active: true } }),
  ]);
  const ballotCounts = await Promise.all(events.map((event) => getBallotCount(event.id)));
  const creatorIds = [...new Set(events.map((e) => e.createdById).filter((v): v is string => Boolean(v)))];
  const creatorEmails = await getAdminEmailsByIds(creatorIds);

  const rows: EventRow[] = events.map((event, index) => ({
    id: event.id,
    name: event.name,
    state: event.state,
    eligibilityMode: event.eligibilityMode,
    votes: ballotCounts[index],
    archived: Boolean(event.archivedAt),
    createdByEmail: event.createdById ? (creatorEmails.get(event.createdById) ?? null) : null,
    canDelete: can("MANAGE_EVENT_CONFIG") && (event.state === "DRAFT" || event.state === "SCHEDULED"),
    canArchive:
      can("MANAGE_EVENT_CONFIG") &&
      (Boolean(event.archivedAt) || event.state === "CLOSED" || event.state === "FINALIZED"),
  }));

  const activeEvents = events.filter((e) => !e.archivedAt);
  const totalVotes = ballotCounts.reduce((sum, count) => sum + count, 0);
  const openEvents = activeEvents.filter((e) => e.state === "OPEN").length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle icon={LayoutDashboard}>Events</PageTitle>
        {can("MANAGE_EVENT_CONFIG") && (
          <Button asChild>
            <Link href="/admin/events/new">New Event</Link>
          </Button>
        )}
      </div>
      <StatCards
        stats={[
          { label: "Total events", value: activeEvents.length },
          { label: "Open for voting", value: openEvents },
          { label: "Total votes cast", value: totalVotes },
          { label: "Team members", value: teamCount },
        ]}
      />
      <EventsTable data={rows} />
    </div>
  );
}
