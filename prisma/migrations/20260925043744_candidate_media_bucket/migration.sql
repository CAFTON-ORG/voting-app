-- Storage bucket for candidate/event photos. Public read (candidate
-- photos are public information), no write policies at all — uploads
-- only ever happen through the service-role client in a Server Action
-- (src/actions/candidates/photo.ts), which bypasses Storage RLS the same
-- way Prisma bypasses table RLS. Ordinary authenticated users, including
-- MODERATOR/AUDITOR admins without MANAGE_CANDIDATES_LIMITED, have no
-- Storage-level path to upload, replace, or delete anything — the
-- Server Action's requirePermission() check is what's actually gating
-- this, consistent with docs/security-boundaries.md.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-media',
  'candidate-media',
  true,
  5242880, -- 5MB, matches src/lib/storage/candidate-photo.ts's own check
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
