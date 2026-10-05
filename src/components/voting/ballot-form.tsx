"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ShieldCheck,
  Eye,
  CircleDot,
  ClipboardCheck,
  Lock,
  ChevronLeft,
  EyeOff,
  UserCheck,
  ScrollText,
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
import { PublicHeader } from "@/components/voting/public-header";
import { PublicFooter } from "@/components/voting/public-footer";
import { StatusCard } from "@/components/voting/status-card";
import { AuroraGlow } from "@/components/shared/aurora-glow";
import { CandidatePhoto } from "@/components/shared/candidate-photo";
import { formatDateTime } from "@/lib/format/datetime";
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
  voterAvatarUrl,
}: {
  event: EventWithBallot;
  signedInEmail: string;
  voterName?: string | null;
  voterAvatarUrl?: string | null;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("welcome");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [profileCandidate, setProfileCandidate] = useState<PublicCandidateProfile | null>(null);
  const router = useRouter();

  // Three different mechanisms can show a stale version of this page after
  // a browser back/forward navigation, and each needs its own handling:
  //
  // 1. The browser's own back/forward cache (bfcache) can restore this
  //    entire component exactly as it was - DOM and state included -
  //    without re-running anything. pageshow's `persisted` flag is how a
  //    page tells that apart from a normal load; reloading forces a real
  //    round trip through the server component again.
  // 2. Next.js's OWN client-side Router Cache is a separate mechanism, not
  //    affected by the fix above or by this project's
  //    staleTimes: { dynamic: 0 } config - Next's docs state outright that
  //    staleTimes "doesn't change back/forward caching behavior", i.e.
  //    back/forward navigation within the app always serves the cached
  //    RSC payload on purpose, to avoid layout shift/scroll loss.
  //    router.refresh() forces a fresh server-component re-render
  //    regardless of that cache - called once on mount for the common
  //    case (arriving here with a fresh or bfcache-restored page).
  // 3. Forward-navigating INTO this page from a segment the router cache
  //    already had can reuse the already-mounted component instance
  //    rather than creating a new one, so a mount-only effect never fires
  //    again for that specific transition. popstate fires on every single
  //    back/forward click regardless of whether React remounts anything,
  //    and this listener stays registered for exactly as long as the
  //    component stays mounted - which, in the one scenario it's meant to
  //    catch, is indefinitely - so it keeps firing across repeated
  //    back/forward navigation even when case 2's mount effect can't.
  useEffect(() => {
    router.refresh();

    function handlePageShow(pageShowEvent: PageTransitionEvent) {
      if (pageShowEvent.persisted) {
        window.location.reload();
      }
    }
    function handlePopState() {
      router.refresh();
    }
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registered once on mount; router's identity is stable across renders anyway.
  }, []);

  const allSelected = event.categories.every((category) => selections[category.id]);
  const completedCount = event.categories.filter((category) => selections[category.id]).length;

  function clearSelection(categoryId: string) {
    setSelections((current) => {
      const next = { ...current };
      delete next[categoryId];
      return next;
    });
  }

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
        <PublicHeader signedInEmail={signedInEmail} signedInName={voterName} signedInAvatarUrl={voterAvatarUrl} />
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
            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to how this election handles your data — see the{" "}
              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </main>

        <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ScrollText className="size-4.5" />
                Privacy Policy
              </DialogTitle>
              <DialogDescription>What this election collects, and how your vote stays anonymous.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex gap-3">
                <UserCheck className="size-4.5 shrink-0 text-muted-foreground" />
                <p>
                  Signing in shares your Google account&apos;s name and email with this election, used only to
                  confirm you&apos;re eligible and that you vote at most once.
                </p>
              </div>
              <div className="flex gap-3">
                <EyeOff className="size-4.5 shrink-0 text-muted-foreground" />
                <p>
                  Your selections are stored separately from your identity. There is no record anywhere linking
                  your account to who you voted for — not even administrators can see it.
                </p>
              </div>
              <div className="flex gap-3">
                <Lock className="size-4.5 shrink-0 text-muted-foreground" />
                <p>
                  Administrators can see <em>that</em> your account voted and when, for turnout and eligibility
                  purposes only, and can see result totals — never an individual ballot&apos;s selections.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPrivacyOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (step === "success" && submittedAt) {
    return (
      <div className="relative flex min-h-svh flex-col overflow-hidden">
        <AuroraGlow />
        <PublicHeader signedInEmail={signedInEmail} signedInName={voterName} signedInAvatarUrl={voterAvatarUrl} />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-12">
          <Stepper steps={STEP_LABELS} currentStep={STEP_NUMBER.success} />
          <div className="mx-auto mt-10 flex w-full max-w-sm flex-1 flex-col items-center justify-center">
            <StatusCard
              icon={CheckCircle2}
              tone="success"
              title="Your vote has been submitted."
              description={`Thank you for participating in ${event.name}. Your ballot was securely recorded.`}
              footer={
                <Button asChild variant="outline" className="w-full">
                  <a href={`/events/${event.slug}`}>Return to Event</a>
                </Button>
              }
            >
              {/* A voter seeing their own just-cast selections, in their
                  own private session, right after submitting - this is
                  not a ballot-secrecy concern (secrecy protects a voter's
                  choices from OTHER people, not from the voter who made
                  them), same reasoning as the Review step one screen ago.
                  Nothing here is newly disclosed or persisted anywhere -
                  `selections` is the same client-side state the voter
                  already built while filling out the ballot. */}
              <div className="mt-2 flex w-full flex-col gap-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Your selections</p>
                {event.categories.map((category) => {
                  const candidate = category.candidates.find((c) => c.id === selections[category.id]);
                  if (!candidate) return null;
                  return (
                    <div key={category.id} className="flex items-center gap-3 rounded-lg border p-2 text-left">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        <CandidatePhoto
                          photoUrl={candidate.photoUrl}
                          fullName={candidate.fullName}
                          sizes="2.5rem"
                          logoSize={16}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                          {category.name}
                        </p>
                        <p className="truncate text-sm font-medium">
                          #{candidate.candidateNumber} {candidate.fullName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {reference && (
                <div className="mt-2 w-full rounded-lg border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Reference</p>
                  <p className="font-mono text-sm font-medium">{reference}</p>
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Submitted {formatDateTime(new Date(submittedAt))}</p>
            </StatusCard>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="flex min-h-svh flex-col">
        <PublicHeader signedInEmail={signedInEmail} signedInName={voterName} signedInAvatarUrl={voterAvatarUrl} />
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 pb-28">
          <Stepper steps={STEP_LABELS} currentStep={STEP_NUMBER.review} />
          <div className="mx-auto max-w-md">
            <h1 className="font-heading mt-8 text-xl font-semibold">Review your vote</h1>
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
                      <CandidatePhoto
                        photoUrl={candidate.photoUrl}
                        fullName={candidate.fullName}
                        sizes="4rem"
                        logoSize={24}
                      />
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

        <div className="sticky bottom-0 border-t bg-background/95 px-6 py-3 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-md gap-2">
            <Button variant="outline" onClick={() => setStep("select")} disabled={pending}>
              <ChevronLeft className="size-4" />
              Back
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={pending} className="flex-1">
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
      <PublicHeader signedInEmail={signedInEmail} signedInName={voterName} signedInAvatarUrl={voterAvatarUrl} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 pb-28">
        <Stepper steps={STEP_LABELS} currentStep={STEP_NUMBER.select} />
        <h1 className="font-heading mt-8 text-xl font-semibold">{event.name}</h1>
        <div className="mt-4">
          <VotingProgress total={event.categories.length} completed={completedCount} />
        </div>

        <div className="mt-8 flex flex-col gap-10">
          {event.categories.map((category) => (
            <BallotCategorySection
              key={category.id}
              category={category}
              selectedCandidateId={selections[category.id]}
              onSelect={(candidateId) =>
                setSelections((current) => ({ ...current, [category.id]: candidateId }))
              }
              onDeselect={() => clearSelection(category.id)}
              onViewProfile={setProfileCandidate}
              toProfile={toProfile}
            />
          ))}
        </div>
      </main>

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
          if (selections[category.id] === profileCandidate.id) {
            clearSelection(category.id);
          } else {
            setSelections((current) => ({ ...current, [category.id]: profileCandidate.id }));
          }
          setProfileCandidate(null);
        }}
      />
    </div>
  );
}
