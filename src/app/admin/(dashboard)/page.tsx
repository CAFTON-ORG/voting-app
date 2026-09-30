import { LayoutDashboard } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { autoCloseIfExpired, autoOpenIfDue } from "@/lib/events/auto-transitions";
import { getBallotCounts } from "@/lib/results/queries";
import { getAdminIdentitiesByIds, displayName } from "@/lib/admin/queries";
import { PageTitle } from "@/components/admin/page-title";
import { StatCards } from "@/components/admin/stat-cards";
import { EventsTable, type EventRow } from "@/components/admin/events-table";
import { CreateEventDialog } from "@/components/admin/create-event-dialog";

export default async function AdminEventsPage() {
  const admin = await requireAdmin();
  const can = (permission: Parameters<typeof roleCan>[1]) => roleCan(admin.role, permission);

  const [events, teamCount] = await Promise.all([
    prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      // categories/candidates are only needed for autoOpenIfDue's
      // readiness check below, not for anything this page itself renders.
      include: { categories: { include: { candidates: { select: { isActive: true } } } } },
    }),
    prisma.adminUser.count({ where: { active: true } }),
  ]);
  await Promise.all(
    events.map(async (event) => {
      if (await autoOpenIfDue(event)) event.state = "OPEN";
      if (await autoCloseIfExpired(event)) event.state = "CLOSED";
    })
  );
  const ballotCounts = await getBallotCounts(events.map((event) => event.id));
  const creatorIds = [...new Set(events.map((e) => e.createdById).filter((v): v is string => Boolean(v)))];
  const creatorIdentities = await getAdminIdentitiesByIds(creatorIds);

  const rows: EventRow[] = events.map((event) => {
    const votes = ballotCounts.get(event.id) ?? 0;
    return {
      id: event.id,
      name: event.name,
      coverImageUrl: event.coverImageUrl,
      state: event.state,
      eligibilityMode: event.eligibilityMode,
      votes,
      archived: Boolean(event.archivedAt),
      createdByName:
        event.createdById && creatorIdentities.has(event.createdById)
          ? displayName(creatorIdentities.get(event.createdById)!)
          : null,
      createdByAvatarUrl:
        event.createdById && creatorIdentities.has(event.createdById)
          ? (creatorIdentities.get(event.createdById)!.avatarUrl ?? null)
          : null,
      canDelete:
        can("MANAGE_EVENT_CONFIG") &&
        ((event.state === "DRAFT" || event.state === "SCHEDULED") || (Boolean(event.archivedAt) && votes === 0)),
      canArchive:
        can("MANAGE_EVENT_CONFIG") &&
        (Boolean(event.archivedAt) || event.state === "CLOSED" || event.state === "FINALIZED"),
    };
  });

  const activeEvents = events.filter((e) => !e.archivedAt);
  const totalVotes = [...ballotCounts.values()].reduce((sum, count) => sum + count, 0);
  const openEvents = activeEvents.filter((e) => e.state === "OPEN").length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle icon={LayoutDashboard}>Events</PageTitle>
        {can("MANAGE_EVENT_CONFIG") && <CreateEventDialog />}
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
