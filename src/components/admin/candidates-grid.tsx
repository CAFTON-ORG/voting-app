"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CandidateCard, type CandidateCardData } from "@/components/admin/candidate-card";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusBadge } from "@/components/admin/status-badge";
import { CandidateAvatar } from "@/components/voting/candidate-avatar";

type CategoryOption = { id: string; name: string };

const PAGE_SIZE = 8;
const SCROLL_STEP = 320;

export function CandidatesGrid({
  eventId,
  categories,
  candidates,
  canManageFull,
  canManageLimited,
  onAdd,
  onEdit,
  /** Seeds the category filter — used to jump straight to one category's
   * candidates from its card in the Categories tab, e.g. right after it's
   * created. Pass a changing `key` from the caller (see EventWorkspaceTabs)
   * so a second jump re-applies even if the admin had since cleared it. */
  initialCategoryFilter,
}: {
  eventId: string;
  categories: CategoryOption[];
  candidates: CandidateCardData[];
  canManageFull: boolean;
  canManageLimited: boolean;
  onAdd: () => void;
  onEdit: (candidate: CandidateCardData) => void;
  initialCategoryFilter?: string;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter ?? "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (categoryFilter !== "all" && c.categoryName !== categoryFilter) return false;
      if (statusFilter === "active" && !c.isActive) return false;
      if (statusFilter === "inactive" && c.isActive) return false;
      if (search && !c.fullName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [candidates, categoryFilter, statusFilter, search]);

  // Only the list view paginates — the grid scrolls horizontally instead
  // (see updateEdges/scrollBy below), so it never needs a page count.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  function updateCategoryFilter(value: string) {
    setCategoryFilter(value);
    setPage(1);
  }
  function updateStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function updateEdges() {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  function scrollBy(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
  }

  const showGridNav = view === "grid" && filtered.length > 0 && !(atStart && atEnd);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Search candidates…"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={categoryFilter} onValueChange={updateCategoryFilter}>
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
          <Select value={statusFilter} onValueChange={updateStatusFilter}>
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
            <Button size="sm" onClick={onAdd}>
              <Plus className="size-3.5" />
              Add Candidate
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {candidates.length} candidates
        </p>
        {showGridNav && (
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="icon" className="size-7" onClick={() => scrollBy(-1)} disabled={atStart}>
              <ChevronLeft className="size-3.5" />
              <span className="sr-only">Scroll left</span>
            </Button>
            <Button type="button" variant="outline" size="icon" className="size-7" onClick={() => scrollBy(1)} disabled={atEnd}>
              <ChevronRight className="size-3.5" />
              <span className="sr-only">Scroll right</span>
            </Button>
          </div>
        )}
      </div>

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
              <Button size="sm" onClick={onAdd}>
                <Plus className="size-3.5" />
                Add Candidate
              </Button>
            )
          }
        />
      ) : view === "grid" ? (
        <div
          ref={scrollerRef}
          onScroll={updateEdges}
          className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto scroll-smooth px-1 pb-2"
        >
          {filtered.map((candidate) => (
            <div key={candidate.id} className="w-44 shrink-0 sm:w-48">
              <CandidateCard candidate={candidate} canManageFull={canManageFull} onEdit={() => onEdit(candidate)} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <ul className="flex flex-col divide-y rounded-lg border">
            {paged.map((candidate) => (
              <li key={candidate.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3">
                  <CandidateAvatar photoUrl={candidate.photoUrl} fullName={candidate.fullName} className="size-9" />
                  <div>
                    <Link
                      href={`/admin/events/${eventId}/candidates/${candidate.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      #{candidate.candidateNumber} {candidate.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{candidate.categoryName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={candidate.isActive ? "ACTIVE" : "INACTIVE"} />
                  {canManageLimited && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(candidate)}>
                      Edit
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {safePage} of {pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={safePage >= pageCount}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
