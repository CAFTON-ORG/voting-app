import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { getAdminUsersWithEmail } from "@/lib/admin/queries";
import { InviteAdminForm } from "@/components/admin/invite-admin-form";
import { PageTitle } from "@/components/admin/page-title";
import { TeamTable } from "@/components/admin/team-table";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";

export default async function AdminTeamPage() {
  const admin = await requireAdmin();
  const canManage = roleCan(admin.role, "MANAGE_ADMIN_USERS");

  const [admins, pendingInvitations] = await Promise.all([
    getAdminUsersWithEmail(),
    canManage
      ? prisma.adminInvitation.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageTitle icon={Users}>Team</PageTitle>

      <TeamTable data={admins} />

      {canManage && (
        <section className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="md:w-96">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Invite someone
            </h2>
            <div className="mt-3">
              <InviteAdminForm />
            </div>
          </div>

          {pendingInvitations.length > 0 && (
            <div className="flex-1">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Pending invitations
              </h3>
              <Table className="mt-3">
                <TableBody>
                  {pendingInvitations.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{invite.role}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
