"use server";

import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/admin";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  validateCandidatePhoto,
  candidatePhotoPath,
  CANDIDATE_MEDIA_BUCKET,
  InvalidCandidatePhotoError,
} from "@/lib/storage/candidate-photo";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

function extractStoragePath(publicUrl: string): string | null {
  const marker = `/object/public/${CANDIDATE_MEDIA_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  return index === -1 ? null : publicUrl.slice(index + marker.length);
}

/** validate -> upload new -> update the Prisma record -> only then
 * remove the previous image. Never delete-first: a failed upload must
 * never leave a candidate with no photo at all. */
export async function uploadCandidatePhotoAction(
  candidateId: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  try {
    const admin = await requirePermission("MANAGE_CANDIDATES_LIMITED");

    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return fail("Photo storage is not configured on this server.");
    }

    const file = formData.get("photo");
    if (!(file instanceof File)) {
      return fail("No photo was provided.");
    }

    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { id: candidateId } });
    const event = await prisma.event.findUniqueOrThrow({ where: { id: candidate.eventId } });
    if (event.state === "FINALIZED") {
      return fail("This event's results have been finalized and its candidates are frozen.");
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    let validated: { ext: string; mime: string };
    try {
      validated = validateCandidatePhoto(buffer, buffer.byteLength);
    } catch (err) {
      return fail(err instanceof InvalidCandidatePhotoError ? err.message : "Could not process the uploaded image.");
    }

    const previousPath = candidate.photoUrl ? extractStoragePath(candidate.photoUrl) : null;
    const newPath = candidatePhotoPath(candidate.eventId, candidate.id, validated.ext);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(CANDIDATE_MEDIA_BUCKET)
      .upload(newPath, buffer, { contentType: validated.mime, upsert: false });
    if (uploadError) {
      return fail("Could not upload the image. Please try again.");
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(CANDIDATE_MEDIA_BUCKET).getPublicUrl(newPath);

    await prisma.$transaction(async (tx) => {
      await tx.candidate.update({ where: { id: candidateId }, data: { photoUrl: publicUrl } });
      await tx.auditLog.create({
        data: {
          eventId: candidate.eventId,
          actorAdminId: admin.adminUserId,
          action: "CANDIDATE_PHOTO_UPDATED",
          metadata: { fullName: candidate.fullName },
        },
      });
    });

    if (previousPath) {
      await supabaseAdmin.storage.from(CANDIDATE_MEDIA_BUCKET).remove([previousPath]);
    }

    return ok({ url: publicUrl });
  } catch {
    return fail("Could not upload the photo. Please try again.");
  }
}

/** Update the record first, then delete the object — same ordering
 * principle as upload: never leave Storage and the DB pointing at
 * different things if the second step fails. Here a failed Storage
 * delete just leaves an orphaned object, which is harmless (never
 * referenced by any UI once photoUrl is cleared), vs. a failed DB update
 * leaving photoUrl pointing at a now-deleted object, which would render
 * broken. */
export async function removeCandidatePhotoAction(candidateId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_CANDIDATES_LIMITED");
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { id: candidateId } });
    const event = await prisma.event.findUniqueOrThrow({ where: { id: candidate.eventId } });
    if (event.state === "FINALIZED") {
      return fail("This event's results have been finalized and its candidates are frozen.");
    }
    if (!candidate.photoUrl) return ok(undefined);

    const path = extractStoragePath(candidate.photoUrl);

    await prisma.$transaction(async (tx) => {
      await tx.candidate.update({ where: { id: candidateId }, data: { photoUrl: null } });
      await tx.auditLog.create({
        data: {
          eventId: candidate.eventId,
          actorAdminId: admin.adminUserId,
          action: "CANDIDATE_PHOTO_REMOVED",
          metadata: { fullName: candidate.fullName },
        },
      });
    });

    if (path && supabaseAdmin) {
      await supabaseAdmin.storage.from(CANDIDATE_MEDIA_BUCKET).remove([path]);
    }

    return ok(undefined);
  } catch {
    return fail("Could not remove the photo. Please try again.");
  }
}
