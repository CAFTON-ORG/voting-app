"use client";

import { useState, useTransition } from "react";
import { castBallotAction } from "@/actions/voting/cast-ballot";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import type { Event, CandidateCategory, Candidate } from "@prisma/client";

type EventWithBallot = Event & {
  categories: (CandidateCategory & { candidates: Candidate[] })[];
};

type Step = "select" | "review" | "success";

export function BallotForm({ event }: { event: EventWithBallot }) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("select");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const allSelected = event.categories.every((category) => selections[category.id]);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await castBallotAction({
        eventId: event.id,
        selections: event.categories.map((category) => ({
          categoryId: category.id,
          candidateId: selections[category.id],
        })),
      });
      if (result.ok) {
        setSubmittedAt(result.submittedAt);
        setStep("success");
      } else {
        setError(result.message);
      }
    });
  }

  if (step === "success" && submittedAt) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-24 text-center">
        <h1 className="text-xl font-semibold text-balance">
          Your vote has been successfully submitted.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{event.name}</p>
        <p className="mt-6 text-xs text-muted-foreground">
          Submitted {new Date(submittedAt).toLocaleString()}
        </p>
        <p className="mt-1 text-sm">Thank you for participating.</p>
        <p className="mt-16 text-xs text-muted-foreground">
          Voting Technology Partner — <span className="font-medium text-foreground">CAFTON</span>
        </p>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-lg font-semibold">Review your vote</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Once your ballot is submitted, your vote cannot be changed.
        </p>
        <ul className="mt-6 flex flex-col gap-3">
          {event.categories.map((category) => {
            const candidate = category.candidates.find((c) => c.id === selections[category.id]);
            return (
              <li key={category.id} className="rounded-md border p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {category.name}
                </p>
                <p className="mt-1 font-medium">
                  #{candidate?.candidateNumber} {candidate?.fullName}
                </p>
              </li>
            );
          })}
        </ul>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => setStep("select")} disabled={pending}>
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={pending} className="flex-1">
            {pending ? "Submitting…" : "Confirm & Submit Vote"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-lg font-semibold">{event.name}</h1>
      <div className="mt-6 flex flex-col gap-8">
        {event.categories.map((category) => (
          <div key={category.id}>
            <p className="text-sm font-medium">{category.name}</p>
            <RadioGroup
              className="mt-3 flex flex-col gap-2"
              value={selections[category.id] ?? ""}
              onValueChange={(value) =>
                setSelections((current) => ({ ...current, [category.id]: value }))
              }
            >
              {category.candidates.map((candidate) => {
                const selected = selections[category.id] === candidate.id;
                return (
                  <label
                    key={candidate.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                      selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={candidate.id} />
                    <span>
                      <span className="font-medium">#{candidate.candidateNumber}</span>{" "}
                      {candidate.fullName}
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          </div>
        ))}
      </div>
      <Button className="mt-8 w-full" disabled={!allSelected} onClick={() => setStep("review")}>
        Review Ballot
      </Button>
    </div>
  );
}
