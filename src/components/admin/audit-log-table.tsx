"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/admin/data-table";

export type AuditRow = {
  id: string;
  action: string;
  eventName: string;
  actorRole: string;
  createdAt: Date;
};

// See events-table.tsx for why these column defs live in a Client
// Component rather than the Server Component page that fetches the data.
const columns: ColumnDef<AuditRow>[] = [
  {
    accessorKey: "action",
    header: ({ column }) => (
      <SortableHeader label="Action" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
    ),
    cell: ({ row }) => <span className="font-medium">{row.original.action}</span>,
  },
  {
    accessorKey: "eventName",
    header: "Event",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.eventName}</span>,
  },
  {
    accessorKey: "actorRole",
    header: "Actor role",
    cell: ({ row }) => <Badge variant="outline">{row.original.actorRole}</Badge>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <div className="text-right">
        <SortableHeader label="When" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground">{row.original.createdAt.toLocaleString()}</div>
    ),
  },
];

export function AuditLogTable({ data }: { data: AuditRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search audit log…"
      emptyMessage="No audit entries yet."
    />
  );
}
