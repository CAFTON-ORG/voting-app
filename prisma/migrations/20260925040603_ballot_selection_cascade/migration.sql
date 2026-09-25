-- DropForeignKey
ALTER TABLE "ballot_selections" DROP CONSTRAINT "ballot_selections_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "ballot_selections" DROP CONSTRAINT "ballot_selections_category_id_fkey";

-- AddForeignKey
ALTER TABLE "ballot_selections" ADD CONSTRAINT "ballot_selections_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "candidate_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballot_selections" ADD CONSTRAINT "ballot_selections_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
