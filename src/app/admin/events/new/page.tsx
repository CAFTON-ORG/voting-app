import { requireAdmin } from "@/lib/auth/admin";
import { roleCan } from "@/lib/auth/permissions";
import { CreateEventForm } from "@/components/admin/create-event-form";

export default async function NewEventPage() {
  const admin = await requireAdmin();
  if (!roleCan(admin.role, "MANAGE_EVENT_CONFIG")) {
    throw new Error("You don't have permission to create events.");
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-xl font-semibold">New event</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Starts in DRAFT. Add categories and candidates, then schedule it to move to SCHEDULED.
      </p>
      <div className="mt-6">
        <CreateEventForm />
      </div>
    </div>
  );
}
