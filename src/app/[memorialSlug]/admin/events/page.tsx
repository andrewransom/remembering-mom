import { notFound } from "next/navigation";
import Link from "next/link";

import { requireAuthenticatedUser } from "@/lib/auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getMemorialBySlugAdmin } from "@/lib/supabase/memorials";
import { getEventByMemorialId } from "@/lib/supabase/events";
import { listEventRsvpsForEvent } from "@/lib/supabase/event-rsvps";
import { AdminEventsClient } from "./admin-events-client";

type AdminEventsPageProps = {
  params: Promise<{
    memorialSlug: string;
  }>;
};

export default async function AdminEventsPage({ params }: AdminEventsPageProps) {
  const { memorialSlug } = await params;
  await requireAuthenticatedUser();

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error } = await getMemorialBySlugAdmin(adminClient, memorialSlug);

  if (error || !memorial) {
    notFound();
  }

  const { data: event } = await getEventByMemorialId(adminClient, memorial.id);
  const { data: rsvps, error: rsvpError } = event
    ? await listEventRsvpsForEvent(adminClient, event.id)
    : { data: [], error: null };

  if (rsvpError) {
    console.error("Failed to load event RSVPs", {
      memorialId: memorial.id,
      eventId: event?.id,
      error: rsvpError,
    });
  }

  return (
    <section className="section-shell pb-16 sm:pb-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Event Management</h1>
          <p className="mt-3 text-muted-foreground">
            Review RSVPs
          </p>
        </div>
        <Link href={`/${memorialSlug}/admin/settings`} className="text-sm font-medium text-accent underline">
          Configure event details in Settings
        </Link>
      </div>

      {!event ? (
        <div className="mt-8 rounded-2xl border border-border bg-card/80 p-6">
          <p className="text-muted-foreground">No event has been configured yet.</p>
          <Link href={`/${memorialSlug}/admin/settings`} className="mt-3 inline-block text-sm font-medium text-accent underline">
            Configure event details in Settings
          </Link>
        </div>
      ) : (
        <AdminEventsClient
          memorialSlug={memorialSlug}
          event={event}
          rsvps={rsvps ?? []}
        />
      )}
    </section>
  );
}
