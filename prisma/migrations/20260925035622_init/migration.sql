-- CreateEnum
CREATE TYPE "eligibility_mode" AS ENUM ('DOMAIN_ONLY', 'DOMAIN_AND_ACCESS_CODE');

-- CreateEnum
CREATE TYPE "event_state" AS ENUM ('DRAFT', 'SCHEDULED', 'OPEN', 'PAUSED', 'CLOSED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "admin_role" AS ENUM ('ADMIN', 'MODERATOR', 'AUDITOR');

-- CreateEnum
CREATE TYPE "invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "access_code_status" AS ENUM ('UNUSED', 'USED', 'REVOKED');

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eligibility_mode" "eligibility_mode" NOT NULL DEFAULT 'DOMAIN_ONLY',
    "allowed_domains" TEXT[],
    "state" "event_state" NOT NULL DEFAULT 'DRAFT',
    "show_public_ballot_count" BOOLEAN NOT NULL DEFAULT true,
    "voting_opens_at" TIMESTAMP(3),
    "voting_closes_at" TIMESTAMP(3),
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "candidate_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "candidate_number" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "photo_url" TEXT,
    "program_year" TEXT,
    "tagline" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voter_participations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "voter_auth_user_id" UUID NOT NULL,
    "voted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voter_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ballots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ballots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ballot_selections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ballot_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,

    CONSTRAINT "ballot_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL,
    "role" "admin_role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "role" "admin_role" NOT NULL,
    "invited_by" UUID NOT NULL,
    "status" "invitation_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voting_access_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "status" "access_code_status" NOT NULL DEFAULT 'UNUSED',
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voting_access_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID,
    "actor_admin_id" UUID,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_categories_event_id_name_key" ON "candidate_categories"("event_id", "name");

-- CreateIndex
CREATE INDEX "candidates_event_id_category_id_idx" ON "candidates"("event_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_event_id_category_id_candidate_number_key" ON "candidates"("event_id", "category_id", "candidate_number");

-- CreateIndex
CREATE UNIQUE INDEX "voter_participations_event_id_voter_auth_user_id_key" ON "voter_participations"("event_id", "voter_auth_user_id");

-- CreateIndex
CREATE INDEX "ballots_event_id_idx" ON "ballots"("event_id");

-- CreateIndex
CREATE INDEX "ballot_selections_ballot_id_idx" ON "ballot_selections"("ballot_id");

-- CreateIndex
CREATE UNIQUE INDEX "ballot_selections_ballot_id_category_id_key" ON "ballot_selections"("ballot_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_auth_user_id_key" ON "admin_users"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_invitations_email_status_key" ON "admin_invitations"("email", "status");

-- CreateIndex
CREATE INDEX "voting_access_codes_event_id_status_idx" ON "voting_access_codes"("event_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "voting_access_codes_event_id_code_hash_key" ON "voting_access_codes"("event_id", "code_hash");

-- CreateIndex
CREATE INDEX "audit_logs_event_id_created_at_idx" ON "audit_logs"("event_id", "created_at");

-- AddForeignKey
ALTER TABLE "candidate_categories" ADD CONSTRAINT "candidate_categories_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "candidate_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voter_participations" ADD CONSTRAINT "voter_participations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballot_selections" ADD CONSTRAINT "ballot_selections_ballot_id_fkey" FOREIGN KEY ("ballot_id") REFERENCES "ballots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballot_selections" ADD CONSTRAINT "ballot_selections_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "candidate_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballot_selections" ADD CONSTRAINT "ballot_selections_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_access_codes" ADD CONSTRAINT "voting_access_codes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_admin_id_fkey" FOREIGN KEY ("actor_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
