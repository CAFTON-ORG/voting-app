"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { createCategoryAction, createCandidateAction, deleteCategoryAction } from "@/actions/candidates/mutations";
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
      const result = await createCategoryAction({ eventId, name: categoryName, displayOrder: categories.length });
      if (result.ok) {
        setCategoryName("");
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCandidateAction({
        eventId,
        categoryId: candidateCategoryId,
        candidateNumber: Number(candidateNumber),
        fullName: candidateName,
        displayOrder: 0,
      });
      if (result.ok) {
        setCandidateNumber("");
        setCandidateName("");
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  async function handleDeleteCategory(categoryId: string) {
    const result = await deleteCategoryAction(categoryId);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.message);
      throw new Error(result.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <form onSubmit={handleAddCategory} className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="category-name">New category (e.g. &quot;Mr. SIT&quot;)</Label>
              <Input id="category-name" required value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            </div>
            <Button type="submit" disabled={pending}>
              Add Category
            </Button>
          </form>
        </CardContent>
      </Card>

      {categories.length > 0 && (
        <>
          <Card>
            <CardContent>
              <form onSubmit={handleAddCandidate} className="flex flex-col gap-3">
                <p className="text-sm font-medium">Add candidate</p>
                <div className="flex flex-wrap items-end gap-2">
                  <Select value={candidateCategoryId} onValueChange={setCandidateCategoryId}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    required
                    placeholder="#"
                    value={candidateNumber}
                    onChange={(e) => setCandidateNumber(e.target.value)}
                    className="w-16"
                  />
                  <Input
                    required
                    placeholder="Full name"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={pending}>
                    Add Candidate
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <ConfirmDialog
                key={category.id}
                trigger={
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive">
                    <Trash2 className="size-3.5" />
                    Remove {category.name}
                  </Button>
                }
                title={`Remove ${category.name}?`}
                description="This also removes any candidates already added to this category. This can't be undone."
                confirmLabel="Remove"
                variant="destructive"
                onConfirm={() => handleDeleteCategory(category.id)}
              />
            ))}
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
