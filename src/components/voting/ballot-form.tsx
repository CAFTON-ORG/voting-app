"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  Check,
  CheckCircle2,
  ShieldCheck,
  Eye,
  CircleDot,
  ClipboardCheck,
  Lock,
  ChevronLeft,
} from "lucide-react";
import { castBallotAction } from "@/actions/voting/cast-ballot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Stepper } from "./stepper";
import { VotingProgress } from "./voting-progress";
import { BallotCategorySection } from "./ballot-category-section";
import { CandidateProfileSheet, type PublicCandidateProfile } from "./candidate-profile-sheet";
import { SignedInBar } from "@/components/auth/signed-in-bar";
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { AuroraGlow } from "@/components/shared/aurora-glow";
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
    const instructions = [
      { icon: Eye, text: "Review each candidate carefully." },
      { icon: CircleDot, text: "Select one candidate per category." },
      { icon: ClipboardCheck, text: "Review your selections before submitting." },
      { icon: Lock, text: "Submitted votes cannot be changed." },
    ];
    return (
      <div className="relative flex min-h-svh flex-col">
        <AuroraGlow />
        <PublicHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
          <div className="text-center">
            <Badge
              variant="outline"
              className="mb-3 border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300"
            >
              <ShieldCheck className="size-3.5" />
              Verified voter
            </Badge>
            <h1 className="font-heading text-2xl font-semibold">
              Welcome{voterName ? `, ${voterName.split(" ")[0]}!` : "!"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;re eligible to vote in <span className="font-medium text-foreground">{event.name}</span>.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Before you begin</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {instructions.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm">{text}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col items-center gap-3">
            <Button size="lg" className="w-full" onClick={() => setStep("select")}>
              Start Voting
            </Button>
            <SignedInBar email={signedInEmail} redirectTo={`/events/${event.slug}/vote`} />
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (step === "success" && submittedAt) {
    return (
      <div className="relative flex min-h-svh flex-col">
        <AuroraGlow />
        <PublicHeader />
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
          <Stepper steps={STEP_LABELS} currentStep={STEP_NUMBER.success} />
          <div className="mx-auto mt-12 flex max-w-md flex-col items-center text-center">
            <CheckCircle2 className="size-12 text-primary motion-safe:animate-[fade-up_0.5s_ease-out]" />
            <h1 className="font-heading mt-6 text-2xl font-semibold text-balance">Your vote has been submitted.</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Thank you for participating in <span className="font-medium text-foreground">{event.name}</span>.
              Your ballot was securely recorded.
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
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="flex min-h-svh flex-col">
        <PublicHeader />
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 pb-28">
          <Stepper steps={STEP_LABELS} currentStep={STEP_NUMBER.review} />
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={() => setStep("select")}
              disabled={pending}
              className="mt-8 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
              Back to Candidates
            </button>
            <h1 className="font-heading mt-4 text-xl font-semibold">Review your vote</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Please review your selections carefully. Once submitted, your ballot cannot be changed.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {event.categories.map((category) => {
                const candidate = category.candidates.find((c) => c.id === selections[category.id]);
                if (!candidate) return null;
                return (
                  <li key={category.id} className="flex items-center gap-4 rounded-lg border p-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {candidate.photoUrl ? (
                        <Image src={candidate.photoUrl} alt={candidate.fullName} fill className="object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-lg font-semibold text-muted-foreground">
                          {candidate.fullName
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase())
                            .join("")}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {category.name}
                      </p>
                      <p className="mt-0.5 truncate font-medium">
                        #{candidate.candidateNumber} {candidate.fullName}
                      </p>
                      {candidate.programYear && (
                        <p className="truncate text-xs text-muted-foreground">{candidate.programYear}</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setStep("select")}>
                      Change
                    </Button>
                  </li>
                );
              })}
            </ul>
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          </div>
        </main>
        <PublicFooter />

        <div className="sticky bottom-0 border-t bg-background/95 px-6 py-3 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-md">
            <Button onClick={() => setConfirmOpen(true)} disabled={pending} className="w-full">
              Submit My Vote
            </Button>
          </div>
        </div>

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
        <h1 className="font-heading mt-8 text-xl font-semibold">{event.name}</h1>
        <div className="mt-4">
          <VotingProgress total={event.categories.length} completed={completedCount} />
        </div>

        {event.categories.length > 1 && (
          <nav aria-label="Jump to category" className="mt-4 flex flex-wrap gap-2">
            {event.categories.map((category) => (
              <a
                key={category.id}
                href={`#category-${category.id}`}
                className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                {selections[category.id] && <Check className="mr-1 inline size-3 text-primary" />}
                {category.name}
              </a>
            ))}
          </nav>
        )}

        <div className="mt-8 flex flex-col gap-10">
          {event.categories.map((category) => (
            <BallotCategorySection
              key={category.id}
              category={category}
              selectedCandidateId={selections[category.id]}
              onSelect={(candidateId) =>
                setSelections((current) => ({ ...current, [category.id]: candidateId }))
              }
              onViewProfile={setProfileCandidate}
              toProfile={toProfile}
            />
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
