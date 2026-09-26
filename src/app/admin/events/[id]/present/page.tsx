import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma/client";
import { getCandidateResults } from "@/lib/results/queries";
import { PresentationView } from "@/components/admin/presentation-view";

/** Admin-only presentation screen for a FINALIZED event's winners —
 * suitable for projecting at the event. Deliberately not public: the
 * approved results policy only covers what voters see while voting is
 * open/closed, not a decision to publish final results publicly, which
 * remains a separate future call. */
export default async function PresentResultsPage(props: PageProps<"/admin/events/[id]/present">) {
  const { id } = await props.params;
  const admin = await requireAdmin();
  if (!roleCan(admin.role, "VIEW_FINAL_RESULTS")) {
    throw new Error("You don't have permission to view results.");
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();
  if (event.state !== "FINALIZED") {
    throw new Error("Results can only be presented once an event has been finalized.");
  }

  const categories = await getCandidateResults(event.id);

  return <PresentationView eventId={event.id} eventName={event.name} categories={categories} />;
}
