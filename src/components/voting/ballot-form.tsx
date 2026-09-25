"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { castBallotAction } from "@/actions/voting/cast-ballot";
import { RadioGroup } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Stepper } from "./stepper";
import { CandidateAvatar } from "./candidate-avatar";
import { VotingProgress } from "./voting-progress";
import { BallotCandidateCard } from "./ballot-candidate-card";
import { CandidateProfileSheet, type PublicCandidateProfile } from "./candidate-profile-sheet";
import { SignedInBar } from "@/components/auth/signed-in-bar";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import type { Event, CandidateCategory, Candidate } from "@prisma/client";

type EventWithBallot = Event & {
  categories: (CandidateCategory & { candidates: Candidate[] })[];
};

type Step = "welcome" | "select" | "review" | "success";
const STEP_LABELS = ["Select", "Review", "Submitted"];
const STEP_NUMBER: Record<Exclude<Step, "welcome">, number> = { select: 1, review: 2, success: 3 };

export function BallotForm({
  event,
  signedInEmail,
  voterName,
}: {
  event: EventWithBallot;
  signedInEmail: string;
  voterName?: string | null;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("welcome");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profileCandidate, setProfileCandidate] = useState<PublicCandidateProfile | null>(null);

  const allSelected = event.categories.every((category) => selections[category.id]);
  const completedCount = event.categories.filter((category) => selections[category.id]).length;

  function toProfile(candidate: Candidate, categoryName: string): PublicCandidateProfile {
    return {
      id: candidate.id,
      candidateNumber: candidate.candidateNumber,
      fullName: candidate.fullName,
      photoUrl: candidate.photoUrl,
      programYear: candidate.programYear,
      tagline: candidate.tagline,
      bio: candidate.bio,
      categoryName,
    };
  }

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
        setReference(result.reference);
        setConfirmOpen(false);
        setStep("success");
      } else {
        setConfirmOpen(false);
        setError(result.message);
      }
    });
  }

  if (step === "welcome") {
    return (
      <div className="flex min-h-svh flex-col">
        <PublicHeader />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-16 text-center">
          <h1 className="text-xl font-semibold">
            Welcome{voterName ? `, ${voterName.split(" ")[0]}!` : "!"}
          </h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re verified and eligible to vote in <span className="font-medium text-foreground">{event.name}</span>.
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-left text-sm text-muted-foreground">
            <li>• Review each candidate carefully.</li>
            <li>• Select one candidate per category.</li>
            <li>• Review your selections before submitting.</li>
            <li>• Submitted votes cannot be changed.</li>
          </ul>
          <Button className="mt-4" onClick={() => setStep("select")}>
            Start Voting
          </Button>
          <div className="mt-2">
            <SignedInBar email={signedInEmail} redirectTo={`/events/${event.slug}/vote`} />
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (step === "success" && submittedAt) {
    return (
      <div className="flex min-h-svh flex-col">
        <PublicHeader />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <CheckCircle2 className="size-12 text-primary" />
          <h1 className="mt-6 text-xl font-semibold text-balance">Your vote has been submitted.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Thank you for participating in <span className="font-medium text-foreground">{event.name}</span>. Your
            ballot was securely recorded.
          </p>
          {reference && (
            <div className="mt-6 rounded-lg border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="font-mono text-sm font-medium">{reference}</p>
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Submitted {new Date(submittedAt).toLocaleString()}
          </p>
          <Button asChild variant="outline" className="mt-8">
            <a href={`/events/${event.slug}`}>Return to Event</a>
          </Button>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="flex min-h-svh flex-col">
        <PublicHeader />
        <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
          <Stepper steps={STEP_LABELS} currentStep={STEP_NUMBER.review} />
          <h1 className="mt-8 text-lg font-semibold">Review your vote</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Please review your selections carefully. Once submitted, your ballot cannot be changed.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {event.categories.map((category) => {
              const candidate = category.candidates.find((c) => c.id === selections[category.id]);
              if (!candidate) return null;
              return (
                <li key={category.id} className="flex items-center gap-3 rounded-md border p-4">
                  <CandidateAvatar photoUrl={candidate.photoUrl} fullName={candidate.fullName} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {category.name}
                    </p>
                    <p className="mt-0.5 truncate font-medium">
                      #{candidate.candidateNumber} {candidate.fullName}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
                    Change
                  </Button>
                </li>
              );
            })}
          </ul>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setStep("select")} disabled={pending}>
              Back
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={pending} className="flex-1">
              Submit My Vote
            </Button>
          </div>
        </main>
        <PublicFooter />

        <Dialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Submit your vote?</DialogTitle>
              <DialogDescription>
                Once submitted, your ballot cannot be changed. Please confirm that you have reviewed your
                selections.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
                Go Back
              </Button>
              <Button onClick={handleSubmit} disabled={pending}>
                {pending ? "Submitting…" : "Confirm & Submit Vote"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 pb-28">
        <Stepper steps={STEP_LABELS} currentStep={STEP_NUMBER.select} />
        <h1 className="mt-8 text-lg font-semibold">{event.name}</h1>
        <div className="mt-4">
          <VotingProgress total={event.categories.length} completed={completedCount} />
        </div>

        <div className="mt-8 flex flex-col gap-10">
          {event.categories.map((category) => (
            <div key={category.id} id={`category-${category.id}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold tracking-wide uppercase">{category.name}</h2>
                <p className="text-xs text-muted-foreground">{category.candidates.length} candidates</p>
              </div>
              {category.description && (
                <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
              )}
              <p className="mt-1 text-xs font-medium text-muted-foreground">Select exactly 1 candidate</p>

              <RadioGroup
                className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
                value={selections[category.id] ?? ""}
                onValueChange={(value) =>
                  setSelections((current) => ({ ...current, [category.id]: value }))
                }
              >
                {category.candidates.map((candidate) => (
                  <BallotCandidateCard
                    key={candidate.id}
                    candidate={toProfile(candidate, category.name)}
                    selected={selections[category.id] === candidate.id}
                    onViewProfile={() => setProfileCandidate(toProfile(candidate, category.name))}
                  />
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />

      <div className="sticky bottom-0 border-t bg-background/95 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {completedCount} of {event.categories.length} selected
          </p>
          <Button disabled={!allSelected} onClick={() => setStep("review")}>
            Continue to Review
          </Button>
        </div>
      </div>

      <CandidateProfileSheet
        candidate={profileCandidate}
        open={profileCandidate !== null}
        onOpenChange={(open) => !open && setProfileCandidate(null)}
        isSelected={
          profileCandidate
            ? event.categories.some(
                (c) => c.candidates.some((cd) => cd.id === profileCandidate.id) && selections[c.id] === profileCandidate.id
              )
            : false
        }
        onSelect={() => {
          if (!profileCandidate) return;
          const category = event.categories.find((c) => c.candidates.some((cd) => cd.id === profileCandidate.id));
          if (!category) return;
          setSelections((current) => ({ ...current, [category.id]: profileCandidate.id }));
          setProfileCandidate(null);
        }}
      />
    </div>
  );
}
