import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { InviteAdminForm } from "@/components/admin/invite-admin-form";

export default async function AdminTeamPage() {
  const admin = await requireAdmin();
  const canManage = roleCan(admin.role, "MANAGE_ADMIN_USERS");

  const [admins, pendingInvitations] = await Promise.all([
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
    canManage
      ? prisma.adminInvitation.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-xl font-semibold">Team</h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Admin accounts
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {admins.map((a) => (
            <li key={a.id} className="flex justify-between rounded-md border p-3 text-sm">
              <span>{a.authUserId}</span>
              <span className="text-muted-foreground">
                {a.role} {!a.active && "· inactive"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Invite someone
          </h2>
          <div className="mt-3">
            <InviteAdminForm />
          </div>

          {pendingInvitations.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-medium text-muted-foreground">Pending invitations</h3>
              <ul className="mt-2 flex flex-col gap-1">
                {pendingInvitations.map((invite) => (
                  <li key={invite.id} className="flex justify-between text-sm">
                    <span>{invite.email}</span>
                    <span className="text-muted-foreground">{invite.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
