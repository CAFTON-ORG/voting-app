"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import {
  createCandidateAction,
  updateCandidateLimitedAction,
  updateCandidateStructuralAction,
} from "@/actions/candidates/mutations";
import { createCandidateSchema } from "@/lib/validation/events";
import { CandidatePhotoUpload } from "@/components/admin/candidate-photo-upload";
import type { z } from "zod";

type CategoryOption = { id: string; name: string };

export type CandidateFormValues = {
  id: string;
  categoryId: string;
  candidateNumber: number;
  fullName: string;
  programYear: string;
  tagline: string;
  bio: string;
  photoUrl: string | null;
};

const candidateFormSchema = createCandidateSchema.pick({
  categoryId: true,
  candidateNumber: true,
  fullName: true,
  programYear: true,
  tagline: true,
  bio: true,
});
// candidateNumber is z.coerce.number(), so its *input* type (what the raw
// <input> can hand the resolver, including an in-progress empty string) is
// `unknown` while its *output* type (what onSubmit receives after
// successful coercion) is `number` — the two need separate type params on
// useForm, or TS sees a real number where the form only ever has one.
type FormInput = z.input<typeof candidateFormSchema>;
type FormOutput = z.output<typeof candidateFormSchema>;

export function CandidateFormSheet({
  open,
  onOpenChange,
  eventId,
  categories,
  /** Omit for "create"; pass the candidate's current values for "edit". */
  initialValues,
  /** "Create" only — preselects a category, e.g. right after that category
   * was just added, so the natural next step (add its first candidate)
   * doesn't require re-picking it from the dropdown. */
  presetCategoryId,
  /** Structural fields (number/category) are only editable in this window
   * — see assertStructuralChangesAllowed in the server action. */
  canEditStructural,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  categories: CategoryOption[];
  initialValues?: CandidateFormValues;
  presetCategoryId?: string;
  canEditStructural: boolean;
}) {
  const isEdit = Boolean(initialValues);
  const router = useRouter();

  function defaults(): FormInput {
    return {
      categoryId: initialValues?.categoryId ?? presetCategoryId ?? categories[0]?.id ?? "",
      candidateNumber: initialValues?.candidateNumber ?? "",
      fullName: initialValues?.fullName ?? "",
      programYear: initialValues?.programYear ?? "",
      tagline: initialValues?.tagline ?? "",
      bio: initialValues?.bio ?? "",
    };
  }

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(candidateFormSchema),
    mode: "onChange",
    defaultValues: defaults(),
  });

  // The same Sheet instance is reused across "add" clicks for different
  // presetCategoryId values and across "edit" clicks for different
  // candidates, so the form must re-sync whenever it opens rather than
  // only on mount.
  useEffect(() => {
    if (open) form.reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues?.id]);

  async function onSubmit(values: FormOutput) {
    if (isEdit && initialValues) {
      const results = await Promise.all([
        updateCandidateLimitedAction({
          candidateId: initialValues.id,
          fullName: values.fullName,
          programYear: values.programYear || undefined,
          tagline: values.tagline || undefined,
          bio: values.bio || undefined,
        }),
        canEditStructural &&
        (values.categoryId !== initialValues.categoryId || values.candidateNumber !== initialValues.candidateNumber)
          ? updateCandidateStructuralAction({
              candidateId: initialValues.id,
              categoryId: values.categoryId,
              candidateNumber: values.candidateNumber,
            })
          : Promise.resolve({ ok: true as const, data: undefined }),
      ]);
      const failed = results.find((r) => !r.ok);
      if (failed && !failed.ok) {
        form.setError("root", { message: failed.message });
        return;
      }
      toast.success("Candidate updated");
    } else {
      const result = await createCandidateAction({
        eventId,
        categoryId: values.categoryId,
        candidateNumber: values.candidateNumber,
        fullName: values.fullName,
        programYear: values.programYear || undefined,
        tagline: values.tagline || undefined,
        bio: values.bio || undefined,
        displayOrder: 0,
      });
      if (!result.ok) {
        form.setError("root", { message: result.message });
        return;
      }
      toast.success("Candidate added");
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{isEdit ? "Edit candidate" : "Add candidate"}</SheetTitle>
              <SheetDescription>
                {canEditStructural
                  ? "Full details, including category and number."
                  : "Number and category are locked once voting could have started."}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 px-4">
              {isEdit && initialValues && (
                <div className="flex flex-col gap-1.5">
                  <Label>Photo</Label>
                  <CandidatePhotoUpload candidateId={initialValues.id} currentPhotoUrl={initialValues.photoUrl} />
                </div>
              )}
              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!canEditStructural}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="candidateNumber"
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormLabel>Number</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          disabled={!canEditStructural}
                          name={field.name}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          value={field.value as string | number}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="programYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program/Year (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline (optional)</FormLabel>
                    <FormControl>
                      <Input maxLength={280} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biography (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={5} maxLength={2000} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
              )}
            </div>
            <SheetFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add Candidate"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
