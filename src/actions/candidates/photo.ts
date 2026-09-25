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

function extractStoragePath(publicUrl: string): string | null {
  const marker = `/object/public/${CANDIDATE_MEDIA_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  return index === -1 ? null : publicUrl.slice(index + marker.length);
}

/** validate -> upload new -> update the Prisma record -> only then
 * remove the previous image. Never delete-first: a failed upload must
 * never leave a candidate with no photo at all. */
export async function uploadCandidatePhotoAction(candidateId: string, formData: FormData) {
  const admin = await requirePermission("MANAGE_CANDIDATES_LIMITED");

  if (!supabaseAdminConfigured || !supabaseAdmin) {
    throw new Error("Photo storage is not configured on this server.");
  }

  const file = formData.get("photo");
  if (!(file instanceof File)) {
    throw new Error("No photo was provided.");
  }

  const candidate = await prisma.candidate.findUniqueOrThrow({ where: { id: candidateId } });
  const event = await prisma.event.findUniqueOrThrow({ where: { id: candidate.eventId } });
  if (event.state === "FINALIZED") {
    throw new Error("This event's results have been finalized and its candidates are frozen.");
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  let validated: { ext: string; mime: string };
  try {
    validated = validateCandidatePhoto(buffer, buffer.byteLength);
  } catch (err) {
    if (err instanceof InvalidCandidatePhotoError) throw err;
    throw new Error("Could not process the uploaded image.");
  }

  const previousPath = candidate.photoUrl ? extractStoragePath(candidate.photoUrl) : null;
  const newPath = candidatePhotoPath(candidate.eventId, candidate.id, validated.ext);

  const { error: uploadError } = await supabaseAdmin.storage
    .from(CANDIDATE_MEDIA_BUCKET)
    .upload(newPath, buffer, { contentType: validated.mime, upsert: false });
  if (uploadError) {
    throw new Error("Could not upload the image. Please try again.");
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

  return publicUrl;
}
