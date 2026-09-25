// Deliberately no "server-only" guard here: this file is pure validation
// and path-generation logic with no secrets, no env vars, and no side
// effects — safe to import (and unit test) from anywhere. The actual
// privileged operation (the Storage upload itself) lives in
// src/actions/candidates/photo.ts, which is a "use server" Server Action.

export const CANDIDATE_MEDIA_BUCKET = "candidate-media";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

type AllowedType = { mime: string; ext: string; magic: (bytes: Uint8Array) => boolean };

/** Checked against the actual file bytes, not the claimed Content-Type —
 * a renamed .html-as-.jpg would fail this even if the browser reported
 * image/jpeg. */
const ALLOWED_TYPES: AllowedType[] = [
  {
    mime: "image/jpeg",
    ext: "jpg",
    magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    ext: "png",
    magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mime: "image/webp",
    ext: "webp",
    magic: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
];

export class InvalidCandidatePhotoError extends Error {}

/** Validates size and actual file content (magic bytes), and derives the
 * extension from the *detected* type — never from the client-supplied
 * filename or Content-Type header, both of which are trivially spoofed. */
export function validateCandidatePhoto(bytes: Uint8Array, sizeBytes: number): { ext: string; mime: string } {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new InvalidCandidatePhotoError("Image must be 5MB or smaller.");
  }
  const match = ALLOWED_TYPES.find((type) => type.magic(bytes));
  if (!match) {
    throw new InvalidCandidatePhotoError("Only JPEG, PNG, or WebP images are allowed.");
  }
  return { ext: match.ext, mime: match.mime };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Controlled, server-generated path — never a client-supplied filename
 * or path. eventId/candidateId are expected to be real Prisma IDs
 * already, but this validates their shape anyway rather than trusting
 * that invariant silently: a plain string-interpolation path is exactly
 * the kind of code that becomes a path-traversal bug the moment some
 * future caller passes an unchecked value. */
export function candidatePhotoPath(eventId: string, candidateId: string, ext: string): string {
  if (!UUID_RE.test(eventId) || !UUID_RE.test(candidateId)) {
    throw new InvalidCandidatePhotoError("Invalid event or candidate reference.");
  }
  return `events/${eventId}/candidates/${candidateId}/${crypto.randomUUID()}.${ext}`;
}
