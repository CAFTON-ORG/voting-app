"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Plus, Pencil, Trash2, FolderTree, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { CandidateAvatarStack } from "@/components/shared/candidate-avatar-stack";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
} from "@/actions/candidates/mutations";
import { createCategorySchema } from "@/lib/validation/events";
import type { z } from "zod";

export type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  candidateCount: number;
  candidates: { id: string; fullName: string; photoUrl: string | null }[];
};

const categoryFormSchema = createCategorySchema.pick({ name: true, description: true });
type FormValues = z.infer<typeof categoryFormSchema>;

export function CategoryManager({
  eventId,
  categories,
  canManageFull,
  canManageLimited,
  /** Jumps straight to that category's row in the Candidates tab right
   * after it's created — the natural next step — instead of opening the
   * candidate form over top of this dialog closing. */
  onViewCandidates,
}: {
  eventId: string;
  categories: CategoryRow[];
  canManageFull: boolean;
  canManageLimited: boolean;
  onViewCandidates?: (categoryId: string) => void;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(categoryFormSchema),
    mode: "onChange",
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (dialogOpen) form.reset({ name: editing?.name ?? "", description: editing?.description ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editing?.id]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(category: CategoryRow) {
    setEditing(category);
    setDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = editing
      ? await updateCategoryAction({ categoryId: editing.id, name: values.name, description: values.description || undefined })
      : await createCategoryAction({
          eventId,
          name: values.name,
          description: values.description || undefined,
          displayOrder: categories.length,
        });
    if (result.ok) {
      toast.success(editing ? "Category updated" : "Category added");
      setDialogOpen(false);
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPending(true);
    reorderCategoriesAction({ eventId, orderedCategoryIds: next.map((c) => c.id) }).then((result) => {
      setPending(false);
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
                  <div className="mt-2 flex items-center gap-2">
                    <CandidateAvatarStack candidates={category.candidates} />
                    <p className="text-xs text-muted-foreground">
                      {category.candidateCount} candidate{category.candidateCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {onViewCandidates && (
                    <Button variant="ghost" size="sm" onClick={() => onViewCandidates(category.id)}>
                      {category.candidateCount === 0 ? (
                        <>
                          <Plus className="size-3.5" />
                          Add candidates
                        </>
                      ) : (
                        <>
                          <ListChecks className="size-3.5" />
                          View candidates
                        </>
                      )}
                    </Button>
                  )}
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
                <DialogDescription>
                  E.g. &quot;Mr. SIT&quot; — &quot;Official male candidate category for Mr. &amp; Ms. SIT 2026.&quot;
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving…" : editing ? "Save changes" : "Add Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
