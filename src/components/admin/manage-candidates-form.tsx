"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCategoryAction, createCandidateAction } from "@/actions/candidates/mutations";
import type { CandidateCategory } from "@prisma/client";

export function ManageCandidatesForm({
  eventId,
  categories,
}: {
  eventId: string;
  categories: CandidateCategory[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [categoryName, setCategoryName] = useState("");

  const [candidateCategoryId, setCandidateCategoryId] = useState(categories[0]?.id ?? "");
  const [candidateNumber, setCandidateNumber] = useState("");
  const [candidateName, setCandidateName] = useState("");

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createCategoryAction({ eventId, name: categoryName, displayOrder: categories.length });
        setCategoryName("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createCandidateAction({
          eventId,
          categoryId: candidateCategoryId,
          candidateNumber: Number(candidateNumber),
          fullName: candidateName,
          displayOrder: 0,
        });
        setCandidateNumber("");
        setCandidateName("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAddCategory} className="flex items-end gap-2 rounded-md border p-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="category-name" className="text-xs font-medium text-muted-foreground">
            New category (e.g. &quot;Mr. SIT&quot;)
          </label>
          <input
            id="category-name"
            required
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            className="rounded-md border p-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={pending} size="sm">
          Add Category
        </Button>
      </form>

      {categories.length > 0 && (
        <form onSubmit={handleAddCandidate} className="flex flex-col gap-2 rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Add candidate</p>
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={candidateCategoryId}
              onChange={(e) => setCandidateCategoryId(e.target.value)}
              className="rounded-md border p-2 text-sm"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              required
              placeholder="#"
              value={candidateNumber}
              onChange={(e) => setCandidateNumber(e.target.value)}
              className="w-16 rounded-md border p-2 text-sm"
            />
            <input
              required
              placeholder="Full name"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="flex-1 rounded-md border p-2 text-sm"
            />
            <Button type="submit" disabled={pending} size="sm">
              Add Candidate
            </Button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
