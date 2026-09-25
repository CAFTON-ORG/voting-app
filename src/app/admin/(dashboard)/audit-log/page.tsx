import { ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { getAdminIdentitiesByIds, displayName } from "@/lib/admin/queries";
import { PageTitle } from "@/components/admin/page-title";
import { AuditLogTable, type AuditRow } from "@/components/admin/audit-log-table";

export default async function AdminAuditLogPage() {
  const admin = await requireAdmin();
  if (!roleCan(admin.role, "VIEW_AUDIT_LOG")) {
    throw new Error("You don't have permission to view the audit log.");
  }

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { event: { select: { name: true } }, actorAdmin: { select: { id: true, role: true } } },
  });

  const actorIds = [...new Set(entries.map((e) => e.actorAdmin?.id).filter((v): v is string => Boolean(v)))];
  const actorIdentities = await getAdminIdentitiesByIds(actorIds);

  const rows: AuditRow[] = entries.map((entry) => ({
    id: entry.id,
    action: entry.action,
    eventName: entry.event?.name ?? "—",
    actorName:
      entry.actorAdmin && actorIdentities.has(entry.actorAdmin.id)
        ? displayName(actorIdentities.get(entry.actorAdmin.id)!)
        : null,
    actorRole: entry.actorAdmin?.role ?? "—",
    metadata: (entry.metadata as Record<string, unknown>) ?? {},
    createdAt: entry.createdAt,
  }));

  const distinctActions = [...new Set(entries.map((e) => e.action))].sort();

  return (
    <div className="flex flex-col gap-8">
      <PageTitle icon={ScrollText}>Audit Log</PageTitle>
      <AuditLogTable data={rows} actions={distinctActions} />
    </div>
  );
}
