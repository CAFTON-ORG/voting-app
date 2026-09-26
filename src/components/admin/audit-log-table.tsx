"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Bot } from "lucide-react";
import { UserAvatar } from "@/components/admin/user-avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, SortableHeader } from "@/components/admin/data-table";

export type AuditRow = {
  id: string;
  action: string;
  eventName: string;
  actorName: string | null;
  actorAvatarUrl: string | null;
  actorRole: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

function actionLabel(action: string) {
  return action.toLowerCase().split("_").join(" ");
}

function ActionCell({ row }: { row: AuditRow }) {
  if (row.action === "EVENT_RESCHEDULED" && row.metadata.previous && row.metadata.next) {
    const prev = row.metadata.previous as { votingOpensAt?: string };
    const next = row.metadata.next as { votingOpensAt?: string };
    return (
      <div>
        <p className="font-medium capitalize">{actionLabel(row.action)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {prev.votingOpensAt && new Date(prev.votingOpensAt).toLocaleString()} →{" "}
          {next.votingOpensAt && new Date(next.votingOpensAt).toLocaleString()}
        </p>
      </div>
    );
  }
  return <span className="font-medium capitalize">{actionLabel(row.action)}</span>;
}

// See events-table.tsx for why these column defs live in a Client
// Component rather than the Server Component page that fetches the data.
const columns: ColumnDef<AuditRow>[] = [
  {
    accessorKey: "actorName",
    header: "Actor",
    cell: ({ row }) =>
      row.original.actorName ? (
        <div className="flex items-center gap-2">
          <UserAvatar label={row.original.actorName} imageUrl={row.original.actorAvatarUrl} size="sm" />
          <div>
            <p className="text-sm">{row.original.actorName}</p>
            <p className="text-xs text-muted-foreground">{row.original.actorRole}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Bot className="size-3.5" />
          </div>
          <span className="text-sm text-muted-foreground">System</span>
        </div>
      ),
  },
  {
    accessorKey: "action",
    header: ({ column }) => (
      <SortableHeader label="Action" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
    ),
    cell: ({ row }) => <ActionCell row={row.original} />,
  },
  {
    accessorKey: "eventName",
    header: "Event",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.eventName}</span>,
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

export function AuditLogTable({ data, actions }: { data: AuditRow[]; actions: string[] }) {
  const [actionFilter, setActionFilter] = useState("all");

  const filtered = useMemo(
    () => (actionFilter === "all" ? data : data.filter((row) => row.action === actionFilter)),
    [data, actionFilter]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((action) => (
              <SelectItem key={action} value={action}>
                {actionLabel(action)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Search audit log…"
        emptyMessage="No audit entries yet."
      />
    </div>
  );
}
