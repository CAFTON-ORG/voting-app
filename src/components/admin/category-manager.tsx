"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
} from "@/actions/candidates/mutations";

export type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  candidateCount: number;
};

export function CategoryManager({
  eventId,
  categories,
  canManageFull,
  canManageLimited,
  onCreated,
}: {
  eventId: string;
  categories: CategoryRow[];
  canManageFull: boolean;
  canManageLimited: boolean;
  /** Called with the new category's id right after a successful create
   * (not edit) — lets the workspace guide the admin straight into adding
   * that category's first candidate instead of leaving them to find the
   * Candidates tab themselves. */
  onCreated?: (categoryId: string) => void;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  }

  function openEdit(category: CategoryRow) {
    setEditing(category);
    setName(category.name);
    setDescription(category.description ?? "");
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateCategoryAction({ categoryId: editing.id, name, description: description || undefined })
        : await createCategoryAction({ eventId, name, description: description || undefined, displayOrder: categories.length });
      if (result.ok) {
        toast.success(editing ? "Category updated" : "Category added");
        setDialogOpen(false);
        if (!editing && result.data && "id" in result.data) {
          onCreated?.(result.data.id);
        }
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    startTransition(async () => {
      const result = await reorderCategoriesAction({ eventId, orderedCategoryIds: next.map((c) => c.id) });
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canManageFull && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add Category
          </Button>
        </div>
      )}

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Add your first category to begin organizing candidates."
          action={
            canManageFull && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-3.5" />
                Add Category
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((category, index) => (
            <Card key={category.id}>
              <CardContent className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{category.name}</p>
                  {category.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{category.candidateCount} candidates</p>
                </div>
                <div className="flex items-center gap-1">
                  {canManageFull && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === 0 || pending}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === categories.length - 1 || pending}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </>
                  )}
                  {canManageLimited && (
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(category)}>
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                  {canManageFull && (
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" className="size-7 text-destructive">
                          <Trash2 className="size-3.5" />
                        </Button>
                      }
                      title={`Remove ${category.name}?`}
                      description="This also removes any candidates already added to this category. This can't be undone."
                      confirmLabel="Remove"
                      variant="destructive"
                      onConfirm={async () => {
                        const result = await deleteCategoryAction(category.id);
                        if (!result.ok) throw new Error(result.message);
                        toast.success("Category removed");
                        router.refresh();
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
              <DialogDescription>
                E.g. &quot;Mr. SIT&quot; — &quot;Official male candidate category for Mr. &amp; Ms. SIT 2026.&quot;
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category-name">Name</Label>
                <Input id="category-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category-description">Description (optional)</Label>
                <Textarea
                  id="category-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Saving…" : editing ? "Save changes" : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
