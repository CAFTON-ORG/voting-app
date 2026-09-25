"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { UserAvatar } from "@/components/admin/user-avatar";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import type { AdminUserRow } from "@/lib/admin/queries";

// See events-table.tsx for why these column defs live in a Client
// Component rather than the Server Component page that fetches the data.
const columns: ColumnDef<AdminUserRow>[] = [
  {
    accessorKey: "email",
    header: "Account",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <UserAvatar label={row.original.email} size="sm" />
        <span className="text-sm">{row.original.email}</span>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <Badge variant="secondary">{row.original.role}</Badge>,
  },
  {
    accessorKey: "active",
    header: () => <div className="text-right">Status</div>,
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground">{row.original.active ? "Active" : "Inactive"}</div>
    ),
  },
];

export function TeamTable({ data }: { data: AdminUserRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search team…"
      emptyMessage="No admin accounts yet."
    />
  );
}
