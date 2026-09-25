import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { PageTitle } from "@/components/admin/page-title";
import { EventWizard } from "@/components/admin/event-wizard";
import { CalendarPlus } from "lucide-react";

export default async function NewEventPage() {
  const admin = await requireAdmin();
  if (!roleCan(admin.role, "MANAGE_EVENT_CONFIG")) {
    throw new Error("You don't have permission to create events.");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle icon={CalendarPlus}>New event</PageTitle>
      <EventWizard />
    </div>
  );
}
