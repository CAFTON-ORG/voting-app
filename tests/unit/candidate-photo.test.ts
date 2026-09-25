import { describe, it, expect } from "vitest";
import {
  validateCandidatePhoto,
  candidatePhotoPath,
  InvalidCandidatePhotoError,
} from "@/lib/storage/candidate-photo";

const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const WEBP_HEADER = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);
const NOT_AN_IMAGE = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e]); // "<html>"

describe("validateCandidatePhoto()", () => {
  it("accepts a real JPEG by its magic bytes", () => {
    expect(validateCandidatePhoto(JPEG_HEADER, JPEG_HEADER.length)).toEqual({
      ext: "jpg",
      mime: "image/jpeg",
    });
  });

  it("accepts a real PNG by its magic bytes", () => {
    expect(validateCandidatePhoto(PNG_HEADER, PNG_HEADER.length)).toEqual({
      ext: "png",
      mime: "image/png",
    });
  });

  it("accepts a real WebP by its magic bytes", () => {
    expect(validateCandidatePhoto(WEBP_HEADER, WEBP_HEADER.length)).toEqual({
      ext: "webp",
      mime: "image/webp",
    });
  });

  it("rejects a file whose content isn't actually an image, regardless of claimed type", () => {
    expect(() => validateCandidatePhoto(NOT_AN_IMAGE, NOT_AN_IMAGE.length)).toThrow(
      InvalidCandidatePhotoError
    );
  });

  it("rejects a file over the size limit even if the content is a valid image", () => {
    expect(() => validateCandidatePhoto(JPEG_HEADER, 6 * 1024 * 1024)).toThrow(
      InvalidCandidatePhotoError
    );
  });
});

describe("candidatePhotoPath()", () => {
  const eventId = "11111111-1111-1111-1111-111111111111";
  const candidateId = "22222222-2222-2222-2222-222222222222";

  it("scopes the path to the event and candidate, with a server-generated filename", () => {
    const path = candidatePhotoPath(eventId, candidateId, "jpg");
    expect(path).toMatch(
      new RegExp(`^events/${eventId}/candidates/${candidateId}/[0-9a-f-]+\\.jpg$`)
    );
  });

  it("rejects a non-UUID eventId/candidateId rather than interpolating it unchecked", () => {
    // Defense in depth: even though every real caller passes a trusted
    // Prisma ID, the function itself refuses anything that isn't
    // UUID-shaped, so a path-traversal payload can never reach the
    // Storage path even if some future caller forgot to validate first.
    expect(() => candidatePhotoPath("../../etc", candidateId, "jpg")).toThrow(
      InvalidCandidatePhotoError
    );
    expect(() => candidatePhotoPath(eventId, "../../etc", "jpg")).toThrow(
      InvalidCandidatePhotoError
    );
  });
});
