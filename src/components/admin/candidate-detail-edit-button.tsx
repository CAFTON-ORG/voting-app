"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CandidateFormSheet, type CandidateFormValues } from "@/components/admin/candidate-form-sheet";

export function CandidateDetailEditButton({
  eventId,
  categories,
  canEditStructural,
  initialValues,
}: {
  eventId: string;
  categories: { id: string; name: string }[];
  canEditStructural: boolean;
  initialValues: CandidateFormValues;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" />
        Edit Candidate
      </Button>
      <CandidateFormSheet
        open={open}
        onOpenChange={setOpen}
        eventId={eventId}
        categories={categories}
        initialValues={initialValues}
        canEditStructural={canEditStructural}
      />
    </>
  );
}
