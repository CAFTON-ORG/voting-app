"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/admin";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  validateEventCover,
  eventCoverPath,
  CANDIDATE_MEDIA_BUCKET,
  InvalidEventCoverError,
} from "@/lib/storage/event-cover";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

function extractStoragePath(publicUrl: string): string | null {
  const marker = `/object/public/${CANDIDATE_MEDIA_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  return index === -1 ? null : publicUrl.slice(index + marker.length);
}

/** Mirrors uploadCandidatePhotoAction's own ordering: validate -> upload
 * new -> update the record -> only then remove the previous cover, so a
 * failed upload never leaves an event with no cover at all. Editable
 * anytime except FINALIZED, same window as the rest of editEventAction's
 * fields - a cover image doesn't affect ballot integrity. */
export async function uploadEventCoverAction(
  eventId: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");

    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return fail("Photo storage is not configured on this server.");
    }

    const file = formData.get("cover");
    if (!(file instanceof File)) {
      return fail("No image was provided.");
    }

    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    if (event.state === "FINALIZED") {
      return fail("This event's results have been finalized and its details are frozen.");
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    let validated: { ext: string; mime: string };
    try {
      validated = validateEventCover(buffer, buffer.byteLength);
    } catch (err) {
      return fail(err instanceof InvalidEventCoverError ? err.message : "Could not process the uploaded image.");
    }

    const previousPath = event.coverImageUrl ? extractStoragePath(event.coverImageUrl) : null;
    const newPath = eventCoverPath(event.id, validated.ext);

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
      await tx.event.update({ where: { id: eventId }, data: { coverImageUrl: publicUrl, updatedById: admin.adminUserId } });
      await tx.auditLog.create({
        data: {
          eventId,
          actorAdminId: admin.adminUserId,
          action: "EVENT_COVER_UPDATED",
          metadata: { name: event.name },
        },
      });
    });

    if (previousPath) {
      await supabaseAdmin.storage.from(CANDIDATE_MEDIA_BUCKET).remove([previousPath]);
    }

    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/");

    return ok({ url: publicUrl });
  } catch {
    return fail("Could not upload the cover image. Please try again.");
  }
}

export async function removeEventCoverAction(eventId: string): Promise<ActionResult> {
  try {
    const admin = await requirePermission("MANAGE_EVENT_CONFIG");
    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    if (event.state === "FINALIZED") {
      return fail("This event's results have been finalized and its details are frozen.");
    }
    if (!event.coverImageUrl) return ok(undefined);

    const path = extractStoragePath(event.coverImageUrl);

    await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id: eventId }, data: { coverImageUrl: null, updatedById: admin.adminUserId } });
      await tx.auditLog.create({
        data: {
          eventId,
          actorAdminId: admin.adminUserId,
          action: "EVENT_COVER_REMOVED",
          metadata: { name: event.name },
        },
      });
    });

    if (path && supabaseAdmin) {
      await supabaseAdmin.storage.from(CANDIDATE_MEDIA_BUCKET).remove([path]);
    }

    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/");

    return ok(undefined);
  } catch {
    return fail("Could not remove the cover image. Please try again.");
  }
}
