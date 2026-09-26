"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Crown, Maximize, Minimize } from "lucide-react";
import { cn } from "cn";
import { CandidatePhoto } from "@/components/shared/candidate-photo";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Reveal } from "@/components/shared/reveal";
import { CAFTON_WEBSITE_URL } from "@/lib/site";

type ResultCandidate = {
  id: string;
  candidateNumber: number;
  fullName: string;
  photoUrl: string | null;
  votes: number;
  percentage: number;
};
type ResultCategory = { id: string; name: string; totalVotes: number; candidates: ResultCandidate[] };

function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  async function toggle() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
    >
      {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
      {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
    </Button>
  );
}

function WinnerCard({ winner }: { winner: ResultCandidate }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 scale-125 rounded-full bg-amber-400/25 blur-2xl motion-safe:animate-[fade-up_1s_ease-out_backwards]"
        />
        <div className="relative size-40 overflow-hidden rounded-full ring-4 ring-amber-400 ring-offset-4 ring-offset-neutral-950 sm:size-48">
          <CandidatePhoto
            photoUrl={winner.photoUrl}
            fullName={winner.fullName}
            sizes="12rem"
            className="bg-neutral-800"
            initialsClassName="text-4xl text-white"
          />
        </div>
        <div className="absolute -top-3 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center rounded-full bg-amber-400 text-neutral-950 shadow-lg">
          <Crown className="size-5.5 fill-current" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase">Winner</p>
        <p className="font-heading mt-1 text-2xl font-semibold text-white sm:text-3xl">{winner.fullName}</p>
        <p className="mt-1 text-sm text-white/50">#{winner.candidateNumber}</p>
        <p className="mt-2 text-sm text-white/70">
          <span className="font-semibold text-white">{winner.votes}</span> votes ·{" "}
          <span className="font-semibold text-white">{winner.percentage}%</span>
        </p>
        <Progress
          value={winner.percentage}
          className="mt-3 h-1.5 w-40 bg-white/10 sm:w-48"
          indicatorClassName="bg-amber-400"
        />
      </div>
    </div>
  );
}

function RunnerUpRow({ candidate }: { candidate: ResultCandidate }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-neutral-800">
        <CandidatePhoto
          photoUrl={candidate.photoUrl}
          fullName={candidate.fullName}
          sizes="2.75rem"
          initialsClassName="text-sm text-white/70"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white/80">
          #{candidate.candidateNumber} {candidate.fullName}
        </p>
        <p className="text-xs text-white/40">
          {candidate.votes} votes · {candidate.percentage}%
        </p>
        <Progress value={candidate.percentage} className="mt-1.5 h-1 bg-white/10" indicatorClassName="bg-white/40" />
      </div>
    </div>
  );
}

export function PresentationView({
  eventId,
  eventName,
  categories,
}: {
  eventId: string;
  eventName: string;
  categories: ResultCategory[];
}) {
  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-10 text-white sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <Link
          href={`/admin/events/${eventId}`}
          className="flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ChevronLeft className="size-4" />
          Back
        </Link>
        <div className="flex items-center gap-2 text-white/50">
          <Logo size={18} aria-hidden="true" />
          <span className="text-xs font-semibold tracking-[0.2em] uppercase">Cafton</span>
        </div>
        <FullscreenToggle />
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-col items-center text-center sm:mt-10">
        <p className="text-xs font-semibold tracking-[0.3em] text-white/40 uppercase">Official Results</p>
        <h1 className="font-heading mt-3 text-4xl font-semibold text-balance sm:text-5xl">{eventName}</h1>
      </div>

      {/* Two columns on wide screens/projectors — with only a couple of
          categories (Mr./Ms. SIT), stacking them vertically wasted the
          full width of a presentation screen and forced scrolling to see
          both. lg:divide-x gives each column a clear boundary without a
          heavier border treatment. */}
      <div className="mx-auto mt-14 grid w-full max-w-6xl grid-cols-1 gap-x-4 gap-y-16 sm:mt-20 lg:grid-cols-2 lg:divide-x lg:divide-white/10">
        {categories.map((category) => {
          const topVotes = Math.max(0, ...category.candidates.map((c) => c.votes));
          const winners = category.candidates.filter((c) => c.votes === topVotes && topVotes > 0);
          const runnersUp = category.candidates.filter((c) => !winners.includes(c));

          return (
            <Reveal key={category.id} className="lg:px-10">
              <div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="h-px w-12 bg-white/20" aria-hidden="true" />
                  <p className="text-sm font-semibold tracking-[0.25em] text-white/60 uppercase">
                    {category.name}
                  </p>
                </div>

                {winners.length === 0 ? (
                  <p className="mt-8 text-center text-sm text-white/40">No votes were cast in this category.</p>
                ) : (
                  <div
                    className={cn(
                      "mt-10 flex flex-wrap justify-center gap-x-16 gap-y-10",
                      winners.length === 1 && "sm:gap-x-0"
                    )}
                  >
                    {winners.map((winner) => (
                      <WinnerCard key={winner.id} winner={winner} />
                    ))}
                  </div>
                )}

                {runnersUp.length > 0 && (
                  <div className="mx-auto mt-12 flex w-full max-w-md flex-col gap-4 border-t border-white/10 pt-8">
                    <p className="text-center text-xs font-medium tracking-wide text-white/30 uppercase">
                      Also on the ballot
                    </p>
                    <div className="flex flex-col gap-3">
                      {runnersUp.map((candidate) => (
                        <RunnerUpRow key={candidate.id} candidate={candidate} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>

      <p className="mx-auto mt-24 max-w-4xl text-center text-xs text-white/30">
        Voting Technology Partner —{" "}
        <a
          href={CAFTON_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-white/50 underline underline-offset-2 hover:text-white/70"
        >
          CAFTON
        </a>
      </p>
    </div>
  );
}
