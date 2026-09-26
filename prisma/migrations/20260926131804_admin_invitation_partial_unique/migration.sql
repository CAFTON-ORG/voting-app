-- DropIndex
-- The blanket (email, status) unique constraint incorrectly blocked a
-- second invitation to the same email from ever reaching ACCEPTED again
-- once a prior invitation to that email had already been accepted (or
-- revoked) - see the AdminInvitation model comment in schema.prisma.
DROP INDEX "admin_invitations_email_status_key";

-- CreateIndex
-- The real invariant: at most one *active* (PENDING) invitation per email
-- at a time. A partial unique index, not expressible in schema.prisma's
-- DSL, so it isn't declared as an @@unique there.
CREATE UNIQUE INDEX "admin_invitations_pending_email_key" ON "admin_invitations"("email") WHERE "status" = 'PENDING';
