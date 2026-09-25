"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/admin/user-avatar";
import { CandidateAvatar } from "@/components/voting/candidate-avatar";
import { CategoryManager, type CategoryRow } from "@/components/admin/category-manager";
import { CandidatesGrid } from "@/components/admin/candidates-grid";
import { CandidateFormSheet, type CandidateFormValues } from "@/components/admin/candidate-form-sheet";
import { EmptyState } from "@/components/admin/empty-state";
import type { CandidateCardData } from "@/components/admin/candidate-card";
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
type VoterRow = { email: string; fullName: string | null; votedAt: Date };

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
      <TabsList className="w-full">
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
          onCreated={(categoryId) => {
            setTab("candidates");
            openCreate(categoryId);
          }}
        />
      </TabsContent>

      <TabsContent value="candidates" className="mt-4">
        <CandidatesGrid
          eventId={eventId}
          categories={categoryOptions}
          candidates={candidates}
          canManageFull={canManageFull}
          canManageLimited={canManageLimited}
          onAdd={() => openCreate()}
          onEdit={openEdit}
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
                        <Progress value={candidate.percentage} className="mt-1.5 h-1.5" />
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voter</TableHead>
                  <TableHead className="text-right">Voted at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voters.map((voter) => {
                  const label = voter.fullName || voter.email;
                  return (
                    <TableRow key={voter.email + voter.votedAt.toISOString()}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserAvatar label={label} size="sm" />
                          <div>
                            <p className="text-sm">{label}</p>
                            {voter.fullName && <p className="text-xs text-muted-foreground">{voter.email}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {voter.votedAt.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
