"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/admin";
import {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
  createCandidateSchema,
  updateCandidateLimitedSchema,
  updateCandidateStructuralSchema,
} from "@/lib/validation/events";
import { ok, fail, toFriendlyMessage, type ActionResult } from "@/lib/actions/result";
import type { EventState, Prisma } from "@prisma/client";

/** Structural candidate/category changes (create, delete, renumber,
 * reassign category) are only safe before any ballot could exist for the
 * event — voting can only happen while OPEN, so DRAFT/SCHEDULED is the
 * whole safe window. This is a hard rule for both ADMIN and MODERATOR,
 * not just a UI restriction: BallotSelection.candidateId cascades on
 * delete, so removing a candidate after votes exist would silently
 * destroy cast ballots' selections. */
function assertStructuralChangesAllowed(state: EventState) {
  if (state !== "DRAFT" && state !== "SCHEDULED") {
    throw new Error(
      "Candidates and categories can only be added, removed, or renumbered before voting begins."
    );
  }
}

export async function createCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requirePermission("MANAGE_CANDIDATES_FULL");
    const data = createCategorySchema.parse(input);

    const category = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: data.eventId } });
      assertStructuralChangesAllowed(event.state);

      const created = await tx.candidateCategory.create({ data });
      await tx.auditLog.create({
        data: {
          eventId: data.eventId,
          actorAdminId: admin.adminUserId,
          action: "CATEGORY_CREATED",
          metadata: { name: created.name },
        },
      });
      return created;
    });
    revalidatePath(`/admin/events/${data.eventId}`);
    return ok({ id: category.id });
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not add the category."));
  }
}

/** Name/description can be edited anytime — same reasoning as the
 * candidate "limited" fields: renaming a category doesn't change what a
 * ballot references. */
export async function updateCategoryAction(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_CANDIDATES_LIMITED");
    const data = updateCategorySchema.parse(input);

    const eventId = await prisma.$transaction(async (tx) => {
      const category = await tx.candidateCategory.findUniqueOrThrow({ where: { id: data.categoryId } });
      const event = await tx.event.findUniqueOrThrow({ where: { id: category.eventId } });
      if (event.state === "FINALIZED") {
        throw new Error("This event's results have been finalized and its categories are frozen.");
      }
      await tx.candidateCategory.update({
        where: { id: data.categoryId },
        data: { name: data.name, description: data.description },
      });
      await tx.auditLog.create({
        data: {
          eventId: category.eventId,
          actorAdminId: admin.adminUserId,
          action: "CATEGORY_UPDATED",
          metadata: { name: data.name },
        },
      });
      return category.eventId;
    });
    revalidatePath(`/admin/events/${eventId}`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not update the category."));
  }
}

export async function reorderCategoriesAction(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_CANDIDATES_LIMITED");
    const data = reorderCategoriesSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: data.eventId } });
      if (event.state === "FINALIZED") {
        throw new Error("This event's results have been finalized and its categories are frozen.");
      }
      await Promise.all(
        data.orderedCategoryIds.map((categoryId, index) =>
          tx.candidateCategory.update({
            where: { id: categoryId, eventId: data.eventId },
            data: { displayOrder: index },
          })
        )
      );
      await tx.auditLog.create({
        data: {
          eventId: data.eventId,
          actorAdminId: admin.adminUserId,
          action: "CATEGORIES_REORDERED",
          metadata: {},
        },
      });
    });
    revalidatePath(`/admin/events/${data.eventId}`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not save the new order."));
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_CANDIDATES_FULL");
    await prisma.$transaction(async (tx) => {
      const category = await tx.candidateCategory.findUniqueOrThrow({ where: { id: categoryId } });
      const event = await tx.event.findUniqueOrThrow({ where: { id: category.eventId } });
      assertStructuralChangesAllowed(event.state);

      await tx.candidateCategory.delete({ where: { id: categoryId } });
      await tx.auditLog.create({
        data: {
          eventId: category.eventId,
          actorAdminId: admin.adminUserId,
          action: "CATEGORY_DELETED",
          metadata: { name: category.name },
        },
      });
      revalidatePath(`/admin/events/${category.eventId}`);
    });
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not remove the category."));
  }
}

/** One more than the highest number already used in this category, or 1
 * if it has none yet — candidate numbers are never client input on
 * create, only ever assigned this way, so two candidates in the same
 * category can never collide by an admin's typo. */
async function nextCandidateNumber(tx: Prisma.TransactionClient, categoryId: string): Promise<number> {
  const result = await tx.candidate.aggregate({ where: { categoryId }, _max: { candidateNumber: true } });
  return (result._max.candidateNumber ?? 0) + 1;
}

export async function createCandidateAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requirePermission("MANAGE_CANDIDATES_FULL");
    const data = createCandidateSchema.parse(input);

    const candidate = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUniqueOrThrow({ where: { id: data.eventId } });
      assertStructuralChangesAllowed(event.state);

      const category = await tx.candidateCategory.findFirstOrThrow({
        where: { id: data.categoryId, eventId: data.eventId },
      });

      const created = await tx.candidate.create({
        data: {
          ...data,
          categoryId: category.id,
          candidateNumber: await nextCandidateNumber(tx, category.id),
          createdById: admin.adminUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          eventId: data.eventId,
          actorAdminId: admin.adminUserId,
          action: "CANDIDATE_CREATED",
          metadata: { fullName: created.fullName, candidateNumber: created.candidateNumber },
        },
      });
      return created;
    });
    revalidatePath(`/admin/events/${data.eventId}`);
    return ok({ id: candidate.id });
  } catch (err) {
    return fail(
      toFriendlyMessage(
        err,
        "Could not add the candidate. Check that the candidate number isn't already used in this category."
      )
    );
  }
}

/** Renumbering/recategorizing — the structural window only. */
export async function updateCandidateStructuralAction(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_CANDIDATES_FULL");
    const data = updateCandidateStructuralSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.findUniqueOrThrow({ where: { id: data.candidateId } });
      const event = await tx.event.findUniqueOrThrow({ where: { id: candidate.eventId } });
      assertStructuralChangesAllowed(event.state);

      await tx.candidateCategory.findFirstOrThrow({
        where: { id: data.categoryId, eventId: candidate.eventId },
      });

      await tx.candidate.update({
        where: { id: data.candidateId },
        data: { categoryId: data.categoryId, candidateNumber: data.candidateNumber },
      });
      await tx.auditLog.create({
        data: {
          eventId: candidate.eventId,
          actorAdminId: admin.adminUserId,
          action: "CANDIDATE_UPDATED",
          metadata: { fullName: candidate.fullName, candidateNumber: data.candidateNumber },
        },
      });
    });
    revalidatePath(`/admin/events`);
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not update the candidate's number/category."));
  }
}

export async function deactivateCandidateAction(candidateId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_CANDIDATES_FULL");
    await prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.findUniqueOrThrow({ where: { id: candidateId } });
      const event = await tx.event.findUniqueOrThrow({ where: { id: candidate.eventId } });
      assertStructuralChangesAllowed(event.state);

      await tx.candidate.update({ where: { id: candidateId }, data: { isActive: false } });
      await tx.auditLog.create({
        data: {
          eventId: candidate.eventId,
          actorAdminId: admin.adminUserId,
          action: "CANDIDATE_DEACTIVATED",
          metadata: { fullName: candidate.fullName },
        },
      });
      revalidatePath(`/admin/events/${candidate.eventId}`);
    });
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not deactivate the candidate."));
  }
}

/** Non-structural edits (name, program/year, photo, display order) — safe
 * at any point except after FINALIZED, when the event record is frozen.
 * Does NOT touch candidateNumber, category, or active status. */
export async function updateCandidateLimitedAction(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_CANDIDATES_LIMITED");
    const data = updateCandidateLimitedSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.findUniqueOrThrow({ where: { id: data.candidateId } });
      const event = await tx.event.findUniqueOrThrow({ where: { id: candidate.eventId } });
      if (event.state === "FINALIZED") {
        throw new Error("This event's results have been finalized and its candidates are frozen.");
      }

      await tx.candidate.update({
        where: { id: data.candidateId },
        data: {
          fullName: data.fullName,
          programYear: data.programYear,
          displayOrder: data.displayOrder,
          photoUrl: data.photoUrl,
        },
      });
      await tx.auditLog.create({
        data: {
          eventId: candidate.eventId,
          actorAdminId: admin.adminUserId,
          action: "CANDIDATE_UPDATED",
          metadata: { fullName: data.fullName ?? candidate.fullName },
        },
      });
      revalidatePath(`/admin/events/${candidate.eventId}`);
      revalidatePath(`/admin/events/${candidate.eventId}/candidates/${candidate.id}`);
    });
    return ok(undefined);
  } catch (err) {
    return fail(toFriendlyMessage(err, "Could not save changes."));
  }
}
