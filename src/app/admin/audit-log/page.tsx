import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";

export default async function AdminAuditLogPage() {
  const admin = await requireAdmin();
  if (!roleCan(admin.role, "VIEW_AUDIT_LOG")) {
    throw new Error("You don't have permission to view the audit log.");
  }

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { event: { select: { name: true } }, actorAdmin: { select: { role: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-xl font-semibold">Audit log</h1>
      <ul className="mt-6 flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-md border p-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{entry.action}</span>
              <span className="text-xs text-muted-foreground">
                {entry.createdAt.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.event?.name ?? "—"} · actor role: {entry.actorAdmin?.role ?? "—"}
            </p>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No audit entries yet.
          </li>
        )}
      </ul>
    </div>
  );
}
