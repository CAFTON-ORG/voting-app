"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "@/components/voting/stepper";
import { CandidateAvatar } from "@/components/voting/candidate-avatar";
import {
  createEventAction,
  scheduleEventAction,
} from "@/actions/events/mutations";
import {
  createCategoryAction,
  createCandidateAction,
  deleteCategoryAction,
  deactivateCandidateAction,
} from "@/actions/candidates/mutations";

const STEP_LABELS = ["Details", "Candidates", "Schedule"];

type PreviewCategory = {
  id: string;
  name: string;
  candidates: { id: string; candidateNumber: number; fullName: string }[];
};

export function EventWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [eventId, setEventId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("s.ubaguio.edu, e.ubaguio.edu");

  // Step 2
  const [categories, setCategories] = useState<PreviewCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Step 3
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");

  function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createEventAction({
        name,
        slug,
        allowedDomains: allowedDomains.split(",").map((d) => d.trim()).filter(Boolean),
      });
      if (result.ok) {
        setEventId(result.data.id);
        setStep(2);
      } else {
        setError(result.message);
      }
    });
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !newCategoryName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createCategoryAction({
        eventId,
        name: newCategoryName.trim(),
        displayOrder: categories.length,
      });
      if (result.ok) {
        setCategories((c) => [...c, { id: result.data.id, name: newCategoryName.trim(), candidates: [] }]);
        setNewCategoryName("");
      } else {
        setError(result.message);
      }
    });
  }

  function handleRemoveCategory(categoryId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(categoryId);
      if (result.ok) {
        setCategories((c) => c.filter((cat) => cat.id !== categoryId));
      } else {
        setError(result.message);
      }
    });
  }

  function handleAddCandidate(categoryId: string, fullName: string, candidateNumber: number) {
    if (!eventId || !fullName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createCandidateAction({
        eventId,
        categoryId,
        candidateNumber,
        fullName: fullName.trim(),
        displayOrder: 0,
      });
      if (result.ok) {
        setCategories((cats) =>
          cats.map((c) =>
            c.id === categoryId
              ? { ...c, candidates: [...c.candidates, { id: result.data.id, candidateNumber, fullName: fullName.trim() }] }
              : c
          )
        );
      } else {
        setError(result.message);
      }
    });
  }

  function handleRemoveCandidate(categoryId: string, candidateId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deactivateCandidateAction(candidateId);
      if (result.ok) {
        setCategories((cats) =>
          cats.map((c) =>
            c.id === categoryId ? { ...c, candidates: c.candidates.filter((cd) => cd.id !== candidateId) } : c
          )
        );
      } else {
        setError(result.message);
      }
    });
  }

  function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    setError(null);
    startTransition(async () => {
      const result = await scheduleEventAction({
        eventId,
        votingOpensAt: new Date(opensAt),
        votingClosesAt: new Date(closesAt),
      });
      if (result.ok) {
        router.push(`/admin/events/${eventId}`);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Stepper steps={STEP_LABELS} currentStep={step} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          {step === 1 && (
            <form onSubmit={handleCreateEvent} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wizard-name">Event name</Label>
                <Input
                  id="wizard-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mr. & Ms. SIT — Netizen's Choice 2026"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wizard-slug">URL slug</Label>
                <Input
                  id="wizard-slug"
                  required
                  pattern="[a-z0-9-]+"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="mr-ms-sit-2026"
                />
                <p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens only.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wizard-domains">Allowed voter domains</Label>
                <Input
                  id="wizard-domains"
                  required
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Comma-separated, no leading &quot;@&quot;.</p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={pending} className="self-start">
                {pending ? "Creating…" : "Create & Continue"}
              </Button>
            </form>
          )}

          {step === 2 && eventId && (
            <div className="flex flex-col gap-4">
              <form onSubmit={handleAddCategory} className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="wizard-category">Category (e.g. &quot;Mr. SIT&quot;)</Label>
                  <Input
                    id="wizard-category"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={pending || !newCategoryName.trim()}>
                  <Plus className="size-4" />
                  Add
                </Button>
              </form>

              {categories.map((category) => (
                <CategoryEditor
                  key={category.id}
                  category={category}
                  pending={pending}
                  onAddCandidate={(name, number) => handleAddCandidate(category.id, name, number)}
                  onRemoveCandidate={(candidateId) => handleRemoveCandidate(category.id, candidateId)}
                  onRemoveCategory={() => handleRemoveCategory(category.id)}
                />
              ))}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                disabled={categories.length === 0}
                onClick={() => setStep(3)}
                className="self-start"
              >
                Continue to schedule
              </Button>
            </div>
          )}

          {step === 3 && eventId && (
            <form onSubmit={handleSchedule} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Optional — you can schedule this later from the event page instead.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wizard-opens">Voting opens</Label>
                <Input
                  id="wizard-opens"
                  type="datetime-local"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wizard-closes">Voting closes</Label>
                <Input
                  id="wizard-closes"
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => router.push(`/admin/events/${eventId}`)}>
                  Skip for now
                </Button>
                <Button type="submit" disabled={pending || !opensAt || !closesAt}>
                  {pending ? "Saving…" : "Schedule & Finish"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <p className="text-lg font-semibold">{name || "Untitled event"}</p>
                {allowedDomains && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {allowedDomains
                      .split(",")
                      .map((d) => d.trim())
                      .filter(Boolean)
                      .map((domain) => (
                        <Badge key={domain} variant="outline">
                          @{domain}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Candidates you add will appear here.</p>
              ) : (
                categories.map((category) => (
                  <div key={category.id}>
                    <p className="text-sm font-medium">{category.name}</p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {category.candidates.map((candidate) => (
                        <li key={candidate.id} className="flex items-center gap-2 text-sm">
                          <CandidateAvatar photoUrl={null} fullName={candidate.fullName} className="size-7" />
                          #{candidate.candidateNumber} {candidate.fullName}
                        </li>
                      ))}
                      {category.candidates.length === 0 && (
                        <li className="text-xs text-muted-foreground">No candidates yet.</li>
                      )}
                    </ul>
                  </div>
                ))
              )}
              {opensAt && closesAt && (
                <p className="text-xs text-muted-foreground">
                  Voting: {new Date(opensAt).toLocaleString()} — {new Date(closesAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CategoryEditor({
  category,
  pending,
  onAddCandidate,
  onRemoveCandidate,
  onRemoveCategory,
}: {
  category: PreviewCategory;
  pending: boolean;
  onAddCandidate: (name: string, number: number) => void;
  onRemoveCandidate: (candidateId: string) => void;
  onRemoveCategory: () => void;
}) {
  const [candidateName, setCandidateName] = useState("");
  const nextNumber = category.candidates.length + 1;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">{category.name}</CardTitle>
        <Button type="button" variant="ghost" size="icon" onClick={onRemoveCategory} disabled={pending}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {category.candidates.map((candidate) => (
            <li key={candidate.id} className="flex items-center justify-between text-sm">
              <span>
                #{candidate.candidateNumber} {candidate.fullName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={pending}
                onClick={() => onRemoveCandidate(candidate.id)}
              >
                <Minus className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor={`candidate-${category.id}`} className="sr-only">
              Candidate name
            </Label>
            <Input
              id={`candidate-${category.id}`}
              placeholder="Candidate full name"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={pending || !candidateName.trim()}
            onClick={() => {
              onAddCandidate(candidateName, nextNumber);
              setCandidateName("");
            }}
          >
            <Plus className="size-4" />
            Add #{nextNumber}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
