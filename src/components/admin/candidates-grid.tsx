"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, Plus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CandidateCard, type CandidateCardData } from "@/components/admin/candidate-card";
import { CandidateFormSheet, type CandidateFormValues } from "@/components/admin/candidate-form-sheet";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusBadge } from "@/components/admin/status-badge";
import { CandidateAvatar } from "@/components/voting/candidate-avatar";

type CategoryOption = { id: string; name: string };

export function CandidatesGrid({
  eventId,
  categories,
  candidates,
  canManageFull,
  canManageLimited,
}: {
  eventId: string;
  categories: CategoryOption[];
  candidates: CandidateCardData[];
  canManageFull: boolean;
  canManageLimited: boolean;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CandidateFormValues | undefined>();

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (categoryFilter !== "all" && c.categoryName !== categoryFilter) return false;
      if (statusFilter === "active" && !c.isActive) return false;
      if (statusFilter === "inactive" && c.isActive) return false;
      if (search && !c.fullName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [candidates, categoryFilter, statusFilter, search]);

  function openCreate() {
    setEditing(undefined);
    setSheetOpen(true);
  }

  function openEdit(candidate: CandidateCardData) {
    const category = categories.find((c) => c.name === candidate.categoryName);
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
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Search candidates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <Button
              type="button"
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="size-7"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="size-7"
              onClick={() => setView("list")}
            >
              <List className="size-3.5" />
            </Button>
          </div>
          {canManageFull && categories.length > 0 && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-3.5" />
              Add Candidate
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {candidates.length} candidates
      </p>

      {candidates.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates yet"
          description={
            categories.length === 0
              ? "Add a category first, then add candidates to it."
              : "Add your first candidate to get started."
          }
          action={
            canManageFull &&
            categories.length > 0 && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-3.5" />
                Add Candidate
              </Button>
            )
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              canManageFull={canManageFull}
              onEdit={() => openEdit(candidate)}
            />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {filtered.map((candidate) => (
            <li key={candidate.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3">
                <CandidateAvatar photoUrl={candidate.photoUrl} fullName={candidate.fullName} className="size-9" />
                <div>
                  <p className="text-sm font-medium">
                    #{candidate.candidateNumber} {candidate.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">{candidate.categoryName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={candidate.isActive ? "ACTIVE" : "INACTIVE"} />
                {canManageLimited && (
                  <Button variant="ghost" size="sm" onClick={() => openEdit(candidate)}>
                    Edit
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Remounts the sheet (resetting its internal form state) whenever the
          edit target changes, or, for "create", whenever the category list
          itself changes — otherwise a sheet mounted while categories was
          still empty would keep defaulting its Category select to nothing
          even after the first category gets added. */}
      <CandidateFormSheet
        key={editing?.id ?? `create:${categories.map((c) => c.id).join(",")}`}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        eventId={eventId}
        categories={categories}
        initialValues={editing}
        canEditStructural={canManageFull}
      />
    </div>
  );
}
