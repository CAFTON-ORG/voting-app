import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { getAdminUsersWithEmail } from "@/lib/admin/queries";
import { AddMemberDialog } from "@/components/admin/add-member-dialog";
import { PageTitle } from "@/components/admin/page-title";
import { StatCards } from "@/components/admin/stat-cards";
import { MembersTable, type MemberRow } from "@/components/admin/members-table";

export default async function AdminTeamPage() {
  const admin = await requireAdmin();
  const canManage = roleCan(admin.role, "MANAGE_ADMIN_USERS");

  const [admins, pendingInvitations] = await Promise.all([
    getAdminUsersWithEmail(),
    canManage
      ? prisma.adminInvitation.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ]);

  const rows: MemberRow[] = [
    ...admins.map(
      (a): MemberRow => ({
        id: a.id,
        email: a.email,
        role: a.role,
        status: a.active ? "ACTIVE" : "EXPIRED",
        kind: "member",
      })
    ),
    ...pendingInvitations.map(
      (invite): MemberRow => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.expiresAt < new Date() ? "EXPIRED" : "PENDING",
        kind: "invitation",
      })
    ),
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle icon={Users}>Team</PageTitle>
        {canManage && <AddMemberDialog />}
      </div>

      <StatCards
        stats={[
          { label: "Active members", value: admins.filter((a) => a.active).length },
          { label: "Pending invitations", value: pendingInvitations.filter((i) => i.expiresAt > new Date()).length },
        ]}
      />

      <MembersTable data={rows} canManage={canManage} />
    </div>
  );
}
