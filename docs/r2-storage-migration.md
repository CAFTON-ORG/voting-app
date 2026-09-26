# Proposal: candidate photo storage on Cloudflare R2

Status: **proposal only** — nothing in this doc is wired in. No new
dependency has been installed and no live storage calls have changed.
This exists so the tradeoffs and the actual code diff are on the table
before deciding to do it, per the project's standing rule against adding
infrastructure without confirming it's needed first.

## Why this would be worth doing

Candidate photos currently live in a Supabase Storage bucket
(`candidate-media`, created by `prisma/migrations/.../migration.sql`'s
`insert into storage.buckets`). That's fine at today's scale, but two
things make R2 worth considering if photo traffic grows:

- **Egress is free on R2.** Supabase Storage (backed by S3-compatible
  storage with standard egress pricing beyond its bundled allowance) charges
  for bandwidth once you're past the free tier; R2 charges $0 for egress
  regardless of volume. For an election with thousands of voters all
  loading the same candidate photos in a short window, egress is the
  dominant cost driver, not storage.
- **Decoupling media from the app's database provider.** Right now,
  losing Supabase entirely (not just the database) would also take the
  photos with it. Moving media to a separate provider means the two
  failure domains are independent.

Neither of these is currently a real problem for this app's traffic —
this is a "worth knowing the path exists" proposal, not a "fix a broken
thing" one.

## Current architecture (for reference)

- `src/lib/storage/candidate-photo.ts` — pure functions, no I/O:
  `validateCandidatePhoto()` (magic-byte + size check) and
  `candidatePhotoPath()` (server-generated, UUID-validated path).
- `src/actions/candidates/photo.ts` — the only place that touches
  Storage: `uploadCandidatePhotoAction` (validate → upload new → update
  `Candidate.photoUrl` → delete the old object) and
  `removeCandidatePhotoAction` (clear the DB field → delete the object).
  Both go through `supabaseAdmin.storage.from(CANDIDATE_MEDIA_BUCKET)`.
- `Candidate.photoUrl` stores a **full public URL**, not a bare path —
  this detail is what makes the migration below incremental rather than
  a hard cutover (see "Migration path").

## Proposed architecture

Cloudflare R2 exposes an S3-compatible API, so the standard approach is
the AWS SDK v3 (`@aws-sdk/client-s3`) pointed at R2's endpoint instead of
AWS — no Cloudflare-specific SDK needed.

```
Admin uploads photo
        │
        ▼
uploadCandidatePhotoAction (unchanged business logic:
  validate → upload → update DB → delete old)
        │
        ▼
src/lib/storage/r2-client.ts  (new — replaces the
  supabaseAdmin.storage calls)
        │
        ▼
Cloudflare R2 bucket (S3-compatible PUT/DELETE)
        │
        ▼
Public URL served via an R2 custom domain
  (e.g. media.yourdomain.com/events/.../photo.jpg)
```

### New environment variables

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=candidate-media
R2_PUBLIC_BASE_URL=https://media.yourdomain.com
```

The API token should be scoped to **Object Read & Write on this one
bucket only** (Cloudflare dashboard → R2 → Manage API Tokens), never an
account-wide token — same "least privilege, server-only secret" posture
the app already uses for `SUPABASE_SERVICE_ROLE_KEY`.

`R2_PUBLIC_BASE_URL` should be a custom domain mapped to the bucket
(Cloudflare's R2 dashboard supports this in a few clicks), not the
default `<bucket>.r2.dev` subdomain — the `.dev` domain is rate-limited
and meant for testing, not production traffic.

### New file: `src/lib/storage/r2-client.ts`

```ts
import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function uploadToR2(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
  await r2.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: path, Body: bytes, ContentType: contentType })
  );
  return `${process.env.R2_PUBLIC_BASE_URL}/${path}`;
}

export async function removeFromR2(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await r2.send(
    new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: paths.map((Key) => ({ Key })) } })
  );
}
```

### Changed file: `src/actions/candidates/photo.ts`

Only the Storage calls change — `validateCandidatePhoto`,
`candidatePhotoPath`, the permission check, the FINALIZED guard, and the
upload-then-update-then-delete-old ordering all stay exactly as they are
today (that ordering is what guarantees a failed upload never leaves a
candidate with no photo, and a failed delete of the old object is just a
harmless orphan — both invariants are storage-provider-independent).

```ts
// before
const { error: uploadError } = await supabaseAdmin.storage
  .from(CANDIDATE_MEDIA_BUCKET)
  .upload(newPath, buffer, { contentType: validated.mime, upsert: false });
if (uploadError) return fail("Could not upload the image. Please try again.");
const { data: { publicUrl } } = supabaseAdmin.storage.from(CANDIDATE_MEDIA_BUCKET).getPublicUrl(newPath);

// after
let publicUrl: string;
try {
  publicUrl = await uploadToR2(newPath, buffer, validated.mime);
} catch {
  return fail("Could not upload the image. Please try again.");
}
```

```ts
// before
if (previousPath) {
  await supabaseAdmin.storage.from(CANDIDATE_MEDIA_BUCKET).remove([previousPath]);
}

// after
if (previousPath) {
  await removeFromR2([previousPath]);
}
```

`extractStoragePath()` (which parses the bucket-relative path back out of
a full `photoUrl`) needs its marker string updated from
`/object/public/${CANDIDATE_MEDIA_BUCKET}/` (Supabase's URL shape) to
`${R2_PUBLIC_BASE_URL}/` (R2's URL shape is just base + key, no `/object/
public/` segment) — everything else about that function is unchanged.

## Migration path (no hard cutover needed)

Because `Candidate.photoUrl` stores a **full URL**, not a relative path,
old and new photos can coexist indefinitely without a backfill:

1. Ship the code change above. New uploads and replacements go to R2;
   their `photoUrl` values point at `R2_PUBLIC_BASE_URL`.
2. Existing candidates keep their current Supabase-hosted `photoUrl`
   values untouched, and keep rendering correctly — nothing reads or
   assumes a particular storage provider from the URL shape anywhere
   else in the app (`next/image`'s `src` just takes whatever URL is
   there).
3. Optionally, later, run a one-time backfill script that downloads each
   remaining Supabase-hosted photo, re-uploads it to R2 under the same
   path scheme, and updates `photoUrl` — only needed if/when you want to
   fully decommission the Supabase bucket. Until then, Supabase Storage
   just keeps serving the photos nobody has re-uploaded since the switch.

## What this proposal deliberately does not include

- A storage-provider abstraction/interface (`StorageAdapter`) — with
  exactly one call site (`photo.ts`) and no near-term plan to support
  *both* providers at runtime, an interface would be an abstraction with
  a single implementation, which is exactly the kind of premature
  generalization this codebase avoids elsewhere. If a second use case for
  file storage shows up later, that's the right time to extract one.
- Signed/expiring URLs — candidate photos are intentionally public (same
  as today), so there's no need for R2's presigned-URL machinery.
- Any change to `next.config.ts`'s `images.remotePatterns` — whichever
  domain actually gets used, add it there; this doc doesn't guess at your
  real custom domain.
