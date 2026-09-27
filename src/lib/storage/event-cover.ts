// Same reasoning as candidate-photo.ts: pure validation/path logic, no
// secrets or side effects, safe to import from anywhere. The actual
// privileged Storage upload lives in src/actions/events/cover.ts.

// Reuses the candidate-media bucket rather than provisioning a new one -
// this is just a different path prefix within it, so no new Supabase
// Storage setup is needed for this feature.
export const CANDIDATE_MEDIA_BUCKET = "candidate-media";
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

type AllowedType = { mime: string; ext: string; magic: (bytes: Uint8Array) => boolean };

/** Same magic-byte check as candidate photos — checked against the actual
 * file bytes, never the claimed Content-Type. */
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

export class InvalidEventCoverError extends Error {}

export function validateEventCover(bytes: Uint8Array, sizeBytes: number): { ext: string; mime: string } {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new InvalidEventCoverError("Image must be 10MB or smaller.");
  }
  const match = ALLOWED_TYPES.find((type) => type.magic(bytes));
  if (!match) {
    throw new InvalidEventCoverError("Only JPEG, PNG, or WebP images are allowed.");
  }
  return { ext: match.ext, mime: match.mime };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Controlled, server-generated path — never a client-supplied filename.
 * Sibling of candidatePhotoPath's events/{eventId}/candidates/... shape,
 * under the same bucket. */
export function eventCoverPath(eventId: string, ext: string): string {
  if (!UUID_RE.test(eventId)) {
    throw new InvalidEventCoverError("Invalid event reference.");
  }
  return `events/${eventId}/cover/${crypto.randomUUID()}.${ext}`;
}
