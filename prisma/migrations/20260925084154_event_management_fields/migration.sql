-- Additive-only: new nullable columns and FKs, no data migration, no
-- change to any existing table's existing rows. Generated via
-- `prisma migrate diff --from-config-datasource --to-schema` (reads the
-- live database directly, avoiding the shadow-database limitation
-- documented in docs/database-setup.md) and applied via
-- `prisma db execute`, not `migrate dev`.

-- AlterTable
ALTER TABLE "candidate_categories" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "bio" TEXT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "archived_at" TIMESTAMPTZ(3),
ADD COLUMN     "created_by_id" UUID,
ADD COLUMN     "updated_by_id" UUID;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
