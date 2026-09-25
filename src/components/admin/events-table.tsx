"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/admin/data-table";

const STATE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SCHEDULED: "secondary",
  OPEN: "default",
  PAUSED: "destructive",
  CLOSED: "secondary",
  FINALIZED: "outline",
};

export type EventRow = {
  id: string;
  name: string;
  state: string;
  eligibilityMode: string;
  votes: number;
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
      <Badge variant={STATE_VARIANT[row.original.state] ?? "outline"}>{row.original.state}</Badge>
    ),
  },
  {
    accessorKey: "eligibilityMode",
    header: "Mode",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.eligibilityMode}</span>,
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
];

export function EventsTable({ data }: { data: EventRow[] }) {
  return (
    <DataTable columns={columns} data={data} searchPlaceholder="Search events…" emptyMessage="No events yet." />
  );
}
