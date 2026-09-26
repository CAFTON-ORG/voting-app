"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { uploadCandidatePhotoAction } from "@/actions/candidates/photo";
import { CandidatePhotoUpload } from "@/components/admin/candidate-photo-upload";
import { CandidatePhotoPicker } from "@/components/admin/candidate-photo-picker";

type CategoryOption = { id: string; name: string; candidateCount: number };

export type CandidateFormValues = {
  id: string;
  categoryId: string;
  candidateNumber: number;
  fullName: string;
  programYear: string;
  photoUrl: string | null;
};

const COURSES = ["BSCS", "BSIT", "BSCPE", "ACT"] as const;
const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;

/** programYear is stored as one "COURSE - Nth Year" string (no schema
 * change needed, and every existing display of candidate.programYear
 * keeps working unchanged) — these two just compose/decompose that string
 * for the two dropdowns. A programYear that predates this format (free
 * text) just doesn't pre-fill either dropdown, rather than guessing. */
function parseProgramYear(programYear: string): { course: string; yearLevel: string } {
  const [rawCourse, rawYearLevel] = programYear.split(" - ").map((s) => s.trim());
  return {
    course: (COURSES as readonly string[]).includes(rawCourse) ? rawCourse : "",
    yearLevel: (YEAR_LEVELS as readonly string[]).includes(rawYearLevel) ? rawYearLevel : "",
  };
}

function composeProgramYear(course: string, yearLevel: string): string | undefined {
  if (course && yearLevel) return `${course} - ${yearLevel}`;
  return course || yearLevel || undefined;
}

const candidateFormSchema = z.object({
  categoryId: z.uuid({ error: "Choose a category" }),
  // Only rendered/used in edit mode with structural permission — on
  // create, the number is never asked for, always assigned server-side,
  // and its default value is "" (see defaults() below). z.coerce.number()
  // on its own turns "" into 0 (Number("") === 0, not NaN), which then
  // fails .positive() - silently blocking every create submission
  // regardless of what else was filled in, since this field is never
  // rendered in create mode for the resulting error to attach to. The
  // preprocess step treats "" the same as an actually-absent value.
  candidateNumber: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().positive("Must be a positive number").optional()
  ),
  fullName: z.string().trim().min(1, "Full name is required").max(200, "Keep it under 200 characters"),
  course: z.string().trim().min(1, "Course is required"),
  yearLevel: z.string().trim().min(1, "Year level is required"),
});
// candidateNumber is z.coerce.number(), so its *input* type (what the raw
// <input> can hand the resolver, including an in-progress empty string) is
// `unknown` while its *output* type (what onSubmit receives after
// successful coercion) is `number | undefined` — the two need separate
// type params on useForm, or TS sees a real number where the form only
// ever has an unvalidated draft.
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
   * — see assertStructuralChangesAllowed in the server action. On create,
   * the candidate number is never asked for at all — it's always the next
   * free number in the category, assigned server-side. */
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
  // Create has no candidateId yet to upload a photo against - the picked
  // file is held here and only uploaded after createCandidateAction
  // succeeds and hands back a real id. Edit mode uploads immediately
  // instead (see CandidatePhotoUpload below), so this is unused there.
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);

  function defaults(): FormInput {
    const { course, yearLevel } = parseProgramYear(initialValues?.programYear ?? "");
    return {
      categoryId: initialValues?.categoryId ?? presetCategoryId ?? categories[0]?.id ?? "",
      candidateNumber: initialValues?.candidateNumber ?? "",
      fullName: initialValues?.fullName ?? "",
      course,
      yearLevel,
    };
  }

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(candidateFormSchema),
    mode: "onChange",
    defaultValues: defaults(),
  });

  // Preview-only, for the disabled "Number" field on create - the real
  // number is always assigned server-side (see nextCandidateNumber() in
  // the Server Action), so this just shows what it will be, recomputed as
  // the category selection changes since each category numbers separately.
  const watchedCategoryId = useWatch({ control: form.control, name: "categoryId" });
  const selectedCategory = categories.find((c) => c.id === watchedCategoryId);
  const nextCandidateNumber = (selectedCategory?.candidateCount ?? 0) + 1;

  // The same Sheet instance is reused across "add" clicks for different
  // presetCategoryId values and across "edit" clicks for different
  // candidates, so the form must re-sync whenever it opens rather than
  // only on mount.
  useEffect(() => {
    if (open) {
      form.reset(defaults());
      // react-hook-form's own reset() isn't a plain useState setter the
      // linter recognizes, but this is the exact same one-time-per-open
      // sync as that reset - resetting the deferred create-mode photo
      // pick alongside it, not a reactive derivation of other state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingPhoto(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues?.id]);

  async function onSubmit(values: FormOutput) {
    const programYear = composeProgramYear(values.course, values.yearLevel);

    if (isEdit && initialValues) {
      const results = await Promise.all([
        updateCandidateLimitedAction({
          candidateId: initialValues.id,
          fullName: values.fullName,
          programYear,
        }),
        canEditStructural &&
        values.candidateNumber !== undefined &&
        values.candidateNumber !== initialValues.candidateNumber
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
        fullName: values.fullName,
        programYear,
        displayOrder: 0,
      });
      if (!result.ok) {
        form.setError("root", { message: result.message });
        return;
      }
      if (pendingPhoto) {
        const formData = new FormData();
        formData.set("photo", pendingPhoto);
        const photoResult = await uploadCandidatePhotoAction(result.data.id, formData);
        if (!photoResult.ok) {
          // The candidate itself was created successfully - a failed
          // photo upload shouldn't undo that or block closing the sheet,
          // just say so; the photo can always be added from the edit form.
          toast.warning(`Candidate added, but the photo couldn't be uploaded: ${photoResult.message}`);
          onOpenChange(false);
          router.refresh();
          return;
        }
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
          <form
            onSubmit={form.handleSubmit(onSubmit, () => {
              // With course/year now required, a submit blocked purely by
              // client-side validation (as opposed to a server rejection,
              // which already shows via the root-error banner below) had
              // no top-level feedback at all - just small text under
              // whichever fields were empty, easy to miss in a sidebar
              // form. This makes "why isn't this submitting" impossible to
              // mistake for the button being broken.
              toast.error("Please fill in the highlighted fields before continuing.");
            })}
            className="flex h-full flex-col"
          >
            <SheetHeader>
              <SheetTitle>{isEdit ? "Edit candidate" : "Add candidate"}</SheetTitle>
              <SheetDescription>
                {isEdit
                  ? canEditStructural
                    ? "Full details, including category and number."
                    : "Number and category are locked once voting could have started."
                  : "The candidate number is assigned automatically."}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 px-4">
              <div className="flex flex-col gap-1.5">
                <Label>Photo</Label>
                {isEdit && initialValues ? (
                  <CandidatePhotoUpload candidateId={initialValues.id} currentPhotoUrl={initialValues.photoUrl} />
                ) : (
                  <CandidatePhotoPicker file={pendingPhoto} onChange={setPendingPhoto} />
                )}
              </div>
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
                {isEdit ? (
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
                ) : (
                  <div className="flex w-24 flex-col gap-1.5">
                    <Label>Number</Label>
                    <Input disabled value={`#${nextCandidateNumber}`} />
                  </div>
                )}
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
              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="course"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Course</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COURSES.map((course) => (
                            <SelectItem key={course} value={course}>
                              {course}
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
                  name="yearLevel"
                  render={({ field }) => (
                    <FormItem className="w-32">
                      <FormLabel>Year level</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {YEAR_LEVELS.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
