"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/admin";
import {
  createCategorySchema,
  createCandidateSchema,
  updateCandidateLimitedSchema,
} from "@/lib/validation/events";
import type { EventState } from "@prisma/client";

/** Structural candidate/category changes (create, delete, renumber) are
 * only safe before any ballot could exist for the event — voting can only
 * happen while OPEN, so DRAFT/SCHEDULED is the whole safe window. This is
 * a hard rule for both ADMIN and MODERATOR, not just a UI restriction:
 * BallotSelection.candidateId cascades on delete, so removing a candidate
 * after votes exist would silently destroy cast ballots' selections. */
function assertStructuralChangesAllowed(state: EventState) {
  if (state !== "DRAFT" && state !== "SCHEDULED") {
    throw new Error(
      "Candidates and categories can only be added, removed, or renumbered before voting begins."
    );
  }
}

export async function createCategoryAction(input: unknown) {
  const admin = await requirePermission("MANAGE_CANDIDATES_FULL");
  const data = createCategorySchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUniqueOrThrow({ where: { id: data.eventId } });
    assertStructuralChangesAllowed(event.state);

    const category = await tx.candidateCategory.create({ data });
    await tx.auditLog.create({
      data: {
        eventId: data.eventId,
        actorAdminId: admin.adminUserId,
        action: "CATEGORY_CREATED",
        metadata: { name: category.name },
      },
    });
    revalidatePath(`/admin/events/${data.eventId}`);
    return category;
  });
}

export async function createCandidateAction(input: unknown) {
  const admin = await requirePermission("MANAGE_CANDIDATES_FULL");
  const data = createCandidateSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUniqueOrThrow({ where: { id: data.eventId } });
    assertStructuralChangesAllowed(event.state);

    const category = await tx.candidateCategory.findFirstOrThrow({
      where: { id: data.categoryId, eventId: data.eventId },
    });

    const candidate = await tx.candidate.create({
      data: { ...data, categoryId: category.id },
    });
    await tx.auditLog.create({
      data: {
        eventId: data.eventId,
        actorAdminId: admin.adminUserId,
        action: "CANDIDATE_CREATED",
        metadata: { fullName: candidate.fullName, candidateNumber: candidate.candidateNumber },
      },
    });
    revalidatePath(`/admin/events/${data.eventId}`);
    return candidate;
  });
}

export async function deactivateCandidateAction(candidateId: string) {
  const admin = await requirePermission("MANAGE_CANDIDATES_FULL");

  return prisma.$transaction(async (tx) => {
    const candidate = await tx.candidate.findUniqueOrThrow({ where: { id: candidateId } });
    const event = await tx.event.findUniqueOrThrow({ where: { id: candidate.eventId } });
    assertStructuralChangesAllowed(event.state);

    const updated = await tx.candidate.update({
      where: { id: candidateId },
      data: { isActive: false },
    });
    await tx.auditLog.create({
      data: {
        eventId: candidate.eventId,
        actorAdminId: admin.adminUserId,
        action: "CANDIDATE_DEACTIVATED",
        metadata: { fullName: candidate.fullName },
      },
    });
    revalidatePath(`/admin/events/${candidate.eventId}`);
    return updated;
  });
}

/** Non-structural edits (photo, tagline, display order) — safe at any
 * point except after FINALIZED, when the event record is frozen. Does
 * NOT touch candidateNumber, category, or active status. */
export async function updateCandidateLimitedAction(input: unknown) {
  const admin = await requirePermission("MANAGE_CANDIDATES_LIMITED");
  const data = updateCandidateLimitedSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const candidate = await tx.candidate.findUniqueOrThrow({ where: { id: data.candidateId } });
    const event = await tx.event.findUniqueOrThrow({ where: { id: candidate.eventId } });
    if (event.state === "FINALIZED") {
      throw new Error("This event's results have been finalized and its candidates are frozen.");
    }

    const updated = await tx.candidate.update({
      where: { id: data.candidateId },
      data: {
        tagline: data.tagline,
        displayOrder: data.displayOrder,
        photoUrl: data.photoUrl,
      },
    });
    await tx.auditLog.create({
      data: {
        eventId: candidate.eventId,
        actorAdminId: admin.adminUserId,
        action: "CANDIDATE_UPDATED",
        metadata: { fullName: candidate.fullName },
      },
    });
    revalidatePath(`/admin/events/${candidate.eventId}`);
    return updated;
  });
}
