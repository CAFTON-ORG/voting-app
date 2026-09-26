-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "ballot_selections_candidate_id_idx" ON "ballot_selections"("candidate_id");

