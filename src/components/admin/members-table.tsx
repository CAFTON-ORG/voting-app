"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { RotateCw, X, UserMinus, UserCheck } from "lucide-react";
import { UserAvatar } from "@/components/admin/user-avatar";
import { StatusBadge, type StatusBadgeStatus } from "@/components/admin/status-badge";
import { DataTableRowActions } from "@/components/admin/data-table-row-actions";
import { DataTable } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  updateAdminRoleAction,
  deactivateAdminAction,
  reactivateAdminAction,
  resendInvitationAction,
  cancelInvitationAction,
} from "@/actions/admin/invitations";
import { canManageRole, canInviteRole } from "@/lib/auth/permissions";
import type { AdminRole } from "@prisma/client";

export type MemberRow = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: AdminRole;
  status: "ACTIVE" | "PENDING" | "EXPIRED";
  kind: "member" | "invitation";
};

const ALL_ROLES: AdminRole[] = ["ADMIN", "MODERATOR", "AUDITOR"];

/** `viewerRole` drives per-row permission, not a single flat flag: an
 * ADMIN and a MODERATOR looking at this same table see different rows as
 * manageable, per the role hierarchy — nobody can manage a peer or a
 * higher role (see canManageRole/canInviteRole in lib/auth/permissions). */
export function MembersTable({ data, viewerRole }: { data: MemberRow[]; viewerRole: AdminRole }) {
  const router = useRouter();
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return data.filter((row) => {
      if (roleFilter !== "all" && row.role !== roleFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    });
  }, [data, roleFilter, statusFilter]);

  const columns: ColumnDef<MemberRow>[] = [
    {
      accessorKey: "email",
      header: "Account",
      cell: ({ row }) => {
        const label = row.original.fullName || row.original.email;
        return (
          <div className="flex items-center gap-2">
            <UserAvatar label={label} imageUrl={row.original.avatarUrl} size="sm" />
            <div>
              <p className="text-sm">{label}</p>
              {row.original.fullName && (
                <p className="text-xs text-muted-foreground">{row.original.email}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const member = row.original;
        const canManageThisRow = member.kind === "member" && canManageRole(viewerRole, member.role);
        if (canManageThisRow) {
          // Only roles the viewer could also manage once assigned — e.g. a
          // MODERATOR can never see ADMIN/MODERATOR as an option here,
          // since promoting someone to either would put them at or above
          // the viewer's own level.
          const assignableRoles = ALL_ROLES.filter((r) => canManageRole(viewerRole, r));
          return (
            <Select
              value={member.role}
              onValueChange={async (value) => {
                const result = await updateAdminRoleAction(member.id, value);
                if (result.ok) {
                  toast.success("Role updated");
                  router.refresh();
                } else {
                  toast.error(result.message);
                }
              }}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return <span className="text-sm text-muted-foreground">{member.role}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status as StatusBadgeStatus} />,
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const member = row.original;
        const canManageThisRow =
          member.kind === "member" ? canManageRole(viewerRole, member.role) : canInviteRole(viewerRole, member.role);
        if (!canManageThisRow) return null;
        return (
          <div className="flex justify-end">
            <DataTableRowActions>
              {member.kind === "member" ? (
                member.status === "ACTIVE" ? (
                  <ConfirmDialog
                    trigger={
                      <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                        <UserMinus className="size-4" />
                        Remove member
                      </DropdownMenuItem>
                    }
                    title={`Remove ${member.fullName || member.email}?`}
                    description="They immediately lose admin access. Their history (audit entries, events they created) is kept."
                    confirmLabel="Remove"
                    variant="destructive"
                    onConfirm={async () => {
                      const result = await deactivateAdminAction(member.id);
                      if (!result.ok) throw new Error(result.message);
                      toast.success("Member removed");
                      router.refresh();
                    }}
                  />
                ) : (
                  <DropdownMenuItem
                    onClick={async () => {
                      const result = await reactivateAdminAction(member.id);
                      if (result.ok) {
                        toast.success("Member reactivated");
                        router.refresh();
                      } else {
                        toast.error(result.message);
                      }
                    }}
                  >
                    <UserCheck className="size-4" />
                    Reactivate member
                  </DropdownMenuItem>
                )
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={async () => {
                      const result = await resendInvitationAction(member.id);
                      if (result.ok) {
                        if (result.data.emailSent) {
                          toast.success("Invitation extended and re-sent");
                        } else {
                          toast.warning(
                            result.data.emailError
                              ? `Invitation extended, but the email couldn't be sent: ${result.data.emailError}`
                              : "Invitation extended, but the email couldn't be sent"
                          );
                        }
                        router.refresh();
                      } else {
                        toast.error(result.message);
                      }
                    }}
                  >
                    <RotateCw className="size-4" />
                    Resend invitation
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={async () => {
                      const result = await cancelInvitationAction(member.id);
                      if (result.ok) {
                        toast.success("Invitation cancelled");
                        router.refresh();
                      } else {
                        toast.error(result.message);
                      }
                    }}
                  >
                    <X className="size-4" />
                    Cancel invitation
                  </DropdownMenuItem>
                </>
              )}
            </DataTableRowActions>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={filtered}
      searchPlaceholder="Search members…"
      emptyMessage="No members yet."
      actions={
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
              <SelectItem value="MODERATOR">MODERATOR</SelectItem>
              <SelectItem value="AUDITOR">AUDITOR</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}
