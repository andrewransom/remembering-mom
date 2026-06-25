import { notFound } from "next/navigation";
import Link from "next/link";

import { EventDetails } from "@/components/event-details";
import { hasMinimumPublicEventDetails } from "@/lib/event-format";
import { getPublishedEventByMemorialId } from "@/lib/supabase/events";
import { getPublishedMemorialBySlug } from "@/lib/supabase/memorials";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RsvpForm } from "./rsvp-form";

type RsvpPageProps = {
  params: Promise<{
    memorialSlug: string;
  }>;
};

export default async function EventRsvpPage({ params }: RsvpPageProps) {
  const { memorialSlug } = await params;
  const client = await createServerSupabaseClient();
  const { data: memorial, error: memorialError } = await getPublishedMemorialBySlug(client, memorialSlug);

  if (memorialError || !memorial) {
    notFound();
  }

  const { data: event, error: eventError } = await getPublishedEventByMemorialId(client, memorial.id);

  if (eventError || !event || !hasMinimumPublicEventDetails(event)) {
    notFound();
  }

  return (
    <main className="section-shell pb-16 sm:pb-20">
      <Link
        href={`/${memorialSlug}`}
        className="mb-4 inline-block text-sm text-accent underline underline-offset-4"
      >
        ← Back to memorial page
      </Link>
      <EventDetails event={event} />
      <RsvpForm eventId={event.id} memorialSlug={memorialSlug} />
    </main>
  );
}
