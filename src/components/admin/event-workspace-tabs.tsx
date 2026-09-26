"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/admin/user-avatar";
import { CandidateAvatar } from "@/components/voting/candidate-avatar";
import { CategoryManager, type CategoryRow } from "@/components/admin/category-manager";
import { CandidatesGrid } from "@/components/admin/candidates-grid";
import { CandidateFormSheet, type CandidateFormValues } from "@/components/admin/candidate-form-sheet";
import { DataTable, SortableHeader } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import type { CandidateCardData } from "@/components/admin/candidate-card";
import { getPercentageColor } from "@/lib/format/progress-color";
import { BarChart3, Users } from "lucide-react";

type CategoryOption = { id: string; name: string };
type ResultCandidate = {
  id: string;
  candidateNumber: number;
  fullName: string;
  photoUrl: string | null;
  votes: number;
  percentage: number;
};
type ResultCategory = { id: string; name: string; totalVotes: number; candidates: ResultCandidate[] };
type VoterRow = { email: string; fullName: string | null; avatarUrl: string | null; votedAt: Date };
type VoterTableRow = VoterRow & { id: string };

// Paginated via DataTable rather than rendered as one flat .map() — an
// event with a large electorate would otherwise put every voter row in the
// DOM (and the initial HTML payload) at once. See getVoterParticipations'
// own row cap for the corresponding query-side limit.
const voterColumns: ColumnDef<VoterTableRow>[] = [
  {
    accessorKey: "email",
    header: ({ column }) => (
      <SortableHeader label="Voter" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
    ),
    cell: ({ row }) => {
      const label = row.original.fullName || row.original.email;
      return (
        <div className="flex items-center gap-2">
          <UserAvatar label={label} imageUrl={row.original.avatarUrl} size="sm" />
          <div>
            <p className="text-sm">{label}</p>
            {row.original.fullName && <p className="text-xs text-muted-foreground">{row.original.email}</p>}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "votedAt",
    header: ({ column }) => (
      <div className="text-right">
        <SortableHeader label="Voted at" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground">{row.original.votedAt.toLocaleString()}</div>
    ),
  },
];

function TabCount({ count }: { count: number }) {
  return (
    <span className="ml-1.5 rounded-full bg-background px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground group-data-[state=active]/tabs-list:text-foreground">
      {count}
    </span>
  );
}

export function EventWorkspaceTabs({
  eventId,
  categories,
  candidates,
  canManageFull,
  canManageLimited,
  results,
  votingEverActive,
  canSeeVoters,
  voters,
}: {
  eventId: string;
  categories: CategoryRow[];
  candidates: CandidateCardData[];
  canManageFull: boolean;
  canManageLimited: boolean;
  results: ResultCategory[] | null;
  votingEverActive: boolean;
  canSeeVoters: boolean;
  voters: VoterRow[] | null;
}) {
  const [tab, setTab] = useState("categories");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CandidateFormValues | undefined>();
  const [presetCategoryId, setPresetCategoryId] = useState<string | undefined>();
  const [categoryJump, setCategoryJump] = useState<{ categoryName: string; token: number } | undefined>();

  const categoryOptions: CategoryOption[] = categories.map((c) => ({ id: c.id, name: c.name }));

  function openCreate(categoryId?: string) {
    setEditing(undefined);
    setPresetCategoryId(categoryId);
    setSheetOpen(true);
  }

  function openEdit(candidate: CandidateCardData) {
    const category = categoryOptions.find((c) => c.name === candidate.categoryName);
    setEditing({
      id: candidate.id,
      categoryId: category?.id ?? "",
      candidateNumber: candidate.candidateNumber,
      fullName: candidate.fullName,
      programYear: candidate.programYear ?? "",
      tagline: candidate.tagline ?? "",
      bio: candidate.bio ?? "",
      photoUrl: candidate.photoUrl,
    });
    setPresetCategoryId(undefined);
    setSheetOpen(true);
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="categories">
          Categories
          <TabCount count={categories.length} />
        </TabsTrigger>
        <TabsTrigger value="candidates">
          Candidates
          <TabCount count={candidates.length} />
        </TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
        {canSeeVoters && (
          <TabsTrigger value="voters">
            Voters
            <TabCount count={voters?.length ?? 0} />
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="categories" className="mt-4">
        <CategoryManager
          eventId={eventId}
          categories={categories}
          canManageFull={canManageFull}
          canManageLimited={canManageLimited}
          onViewCandidates={(categoryId) => {
            const category = categories.find((c) => c.id === categoryId);
            if (!category) return;
            setCategoryJump((prev) => ({ categoryName: category.name, token: (prev?.token ?? 0) + 1 }));
            setTab("candidates");
          }}
        />
      </TabsContent>

      <TabsContent value="candidates" className="mt-4">
        <CandidatesGrid
          key={categoryJump?.token}
          eventId={eventId}
          categories={categoryOptions}
          candidates={candidates}
          canManageFull={canManageFull}
          canManageLimited={canManageLimited}
          onAdd={() => openCreate()}
          onEdit={openEdit}
          initialCategoryFilter={categoryJump?.categoryName}
        />
      </TabsContent>

      <TabsContent value="results" className="mt-4">
        {!results && (
          <EmptyState
            icon={BarChart3}
            title={votingEverActive ? "Live results are hidden" : "Results not available yet"}
            description={
              votingEverActive
                ? "Your role does not include live results while voting is open."
                : "Results will appear here once voting has started."
            }
          />
        )}
        {results && (
          <div className="flex flex-col gap-6">
            {results.map((category) => (
              <div key={category.id}>
                <p className="text-sm font-medium">{category.name}</p>
                <div className="mt-2 flex flex-col gap-3">
                  {category.candidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center gap-3">
                      <CandidateAvatar photoUrl={candidate.photoUrl} fullName={candidate.fullName} className="size-9 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm">
                            #{candidate.candidateNumber} {candidate.fullName}
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant="secondary">{candidate.votes} votes</Badge>
                            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                              {candidate.percentage}%
                            </span>
                          </div>
                        </div>
                        <Progress
                          value={candidate.percentage}
                          className="mt-1.5 h-1.5"
                          indicatorClassName={getPercentageColor(candidate.percentage)}
                        />
                      </div>
                    </div>
                  ))}
                  {category.candidates.length === 0 && (
                    <p className="text-sm text-muted-foreground">No active candidates in this category.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {canSeeVoters && (
        <TabsContent value="voters" className="mt-4">
          {voters && voters.length > 0 ? (
            <DataTable
              columns={voterColumns}
              data={voters.map((voter) => ({ ...voter, id: voter.email }))}
              searchPlaceholder="Search voters…"
              emptyMessage="No voters match your search."
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No one has voted yet"
              description="Participation will show up here as voters cast their ballots."
            />
          )}
        </TabsContent>
      )}

      {/* See candidates-grid.tsx's previous comment: remounts whenever the
          edit target, preset category, or category list changes so the
          form's internal state can't go stale between opens. */}
      <CandidateFormSheet
        key={editing?.id ?? `create:${presetCategoryId ?? ""}:${categoryOptions.map((c) => c.id).join(",")}`}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        eventId={eventId}
        categories={categoryOptions}
        initialValues={editing}
        presetCategoryId={presetCategoryId}
        canEditStructural={canManageFull}
      />
    </Tabs>
  );
}
