"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { UserAvatar } from "@/components/admin/user-avatar";
import { EventAvatar } from "@/components/admin/event-avatar";
import { StatusBadge, type StatusBadgeStatus } from "@/components/admin/status-badge";
import { DataTable, SortableHeader } from "@/components/admin/data-table";
import { ArchiveEventButton } from "@/components/admin/archive-event-button";
import { DeleteEventButton } from "@/components/admin/delete-event-button";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type EventRow = {
  id: string;
  name: string;
  coverImageUrl: string | null;
  state: string;
  eligibilityMode: string;
  votes: number;
  archived: boolean;
  createdByName: string | null;
  createdByAvatarUrl: string | null;
  canDelete: boolean;
  canArchive: boolean;
};

const STATUS_OPTIONS = ["DRAFT", "SCHEDULED", "OPEN", "PAUSED", "CLOSED", "FINALIZED"];

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
      <Link href={`/admin/events/${row.original.id}`} className="flex items-center gap-2 font-medium hover:underline">
        <EventAvatar name={row.original.name} coverImageUrl={row.original.coverImageUrl} size="sm" />
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
    accessorKey: "createdByName",
    header: "Created by",
    cell: ({ row }) =>
      row.original.createdByName ? (
        <div className="flex items-center gap-2">
          <UserAvatar label={row.original.createdByName} imageUrl={row.original.createdByAvatarUrl} size="sm" />
          <span className="text-sm text-muted-foreground">{row.original.createdByName}</span>
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
      <div className="flex justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon" className="size-8">
              <Link href={`/admin/events/${row.original.id}`}>
                <Eye className="size-4" />
                <span className="sr-only">View</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>View</TooltipContent>
        </Tooltip>
        {row.original.canArchive && (
          <ArchiveEventButton
            eventId={row.original.id}
            eventName={row.original.name}
            archived={row.original.archived}
            iconOnly
          />
        )}
        {row.original.canDelete && (
          <DeleteEventButton eventId={row.original.id} eventName={row.original.name} iconOnly />
        )}
      </div>
    ),
  },
];

export function EventsTable({ data }: { data: EventRow[] }) {
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return data.filter((row) => {
      if (!showArchived && row.archived) return false;
      if (statusFilter !== "all" && row.state !== statusFilter) return false;
      return true;
    });
  }, [data, showArchived, statusFilter]);
  const archivedCount = data.filter((row) => row.archived).length;

  return (
    <DataTable
      columns={columns}
      data={filtered}
      searchPlaceholder="Search events…"
      emptyMessage="No events yet."
      actions={
        <div className="flex items-center gap-3">
          {archivedCount > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="show-archived" className="text-sm text-muted-foreground">
                Show archived ({archivedCount})
              </Label>
              <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
            </div>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}
