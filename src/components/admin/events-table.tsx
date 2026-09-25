"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { UserAvatar } from "@/components/admin/user-avatar";
import { StatusBadge, type StatusBadgeStatus } from "@/components/admin/status-badge";
import { DataTable, SortableHeader } from "@/components/admin/data-table";
import { ArchiveEventButton } from "@/components/admin/archive-event-button";
import { DeleteEventButton } from "@/components/admin/delete-event-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export type EventRow = {
  id: string;
  name: string;
  state: string;
  eligibilityMode: string;
  votes: number;
  archived: boolean;
  createdByEmail: string | null;
  canDelete: boolean;
  canArchive: boolean;
};

/** Column defs live here, in a Client Component, deliberately — a
 * ColumnDef's `cell`/`header` are functions, and functions can't cross
 * the Server -> Client Component boundary (only "use server" actions
 * can). Defining them in the Server Component page and passing them down
 * as a prop fails at runtime with exactly that error — confirmed via a
 * live authenticated request, not just inferred. */
const columns: ColumnDef<EventRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader label="Event" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
    ),
    cell: ({ row }) => (
      <Link href={`/admin/events/${row.original.id}`} className="font-medium hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "state",
    header: ({ column }) => (
      <SortableHeader label="State" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
    ),
    cell: ({ row }) => (
      <StatusBadge status={(row.original.archived ? "ARCHIVED" : row.original.state) as StatusBadgeStatus} />
    ),
  },
  {
    accessorKey: "eligibilityMode",
    header: "Mode",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.eligibilityMode}</span>,
  },
  {
    accessorKey: "createdByEmail",
    header: "Created by",
    cell: ({ row }) =>
      row.original.createdByEmail ? (
        <div className="flex items-center gap-2">
          <UserAvatar label={row.original.createdByEmail} size="sm" />
          <span className="text-sm text-muted-foreground">{row.original.createdByEmail}</span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "votes",
    header: ({ column }) => (
      <div className="text-right">
        <SortableHeader label="Votes" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
      </div>
    ),
    cell: ({ row }) => <div className="text-right">{row.original.votes}</div>,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        {row.original.canArchive && (
          <ArchiveEventButton
            eventId={row.original.id}
            eventName={row.original.name}
            archived={row.original.archived}
          />
        )}
        {row.original.canDelete && <DeleteEventButton eventId={row.original.id} eventName={row.original.name} />}
      </div>
    ),
  },
];

export function EventsTable({ data }: { data: EventRow[] }) {
  const [showArchived, setShowArchived] = useState(false);
  const filtered = useMemo(
    () => (showArchived ? data : data.filter((row) => !row.archived)),
    [data, showArchived]
  );
  const archivedCount = data.filter((row) => row.archived).length;

  return (
    <div className="flex flex-col gap-3">
      {archivedCount > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Label htmlFor="show-archived" className="text-sm text-muted-foreground">
            Show archived ({archivedCount})
          </Label>
          <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
        </div>
      )}
      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Search events…"
        emptyMessage="No events yet."
      />
    </div>
  );
}
