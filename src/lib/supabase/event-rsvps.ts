import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, EventRsvpStatus } from "./types";

export type EventRsvpRow = Database["public"]["Tables"]["event_rsvps"]["Row"];
export type NewEventRsvp = Database["public"]["Tables"]["event_rsvps"]["Insert"];

export const createEventRsvp = (
  client: SupabaseClient<Database>,
  payload: NewEventRsvp,
) => {
  return client
    .from("event_rsvps")
    .insert([payload])
    .select("id")
    .returns<Pick<EventRsvpRow, "id">[]>()
    .maybeSingle();
};

export const listEventRsvpsForEvent = (
  client: SupabaseClient<Database>,
  eventId: string,
) => {
  return client
    .from("event_rsvps")
    .select("id, event_id, guest_name, email, phone, attendance_choice, attendee_count, additional_attendee_names, wants_to_speak, speaking_format, message, message_share_permission, accessibility_needs, dietary_restrictions, wants_updates, private_note, status, admin_notes, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .returns<EventRsvpRow[]>();
};

export const updateEventRsvpStatusAndNotes = (
  client: SupabaseClient<Database>,
  rsvpId: string,
  eventId: string,
  status: EventRsvpStatus,
  adminNotes: string | null,
) => {
  return client
    .from("event_rsvps")
    .update({ status, admin_notes: adminNotes })
    .eq("id", rsvpId)
    .eq("event_id", eventId)
    .select("id")
    .returns<Pick<EventRsvpRow, "id">[]>()
    .maybeSingle();
};

export const updateEventRsvp = (
  client: SupabaseClient<Database>,
  rsvpId: string,
  eventId: string,
  updates: Database["public"]["Tables"]["event_rsvps"]["Update"],
) => {
  return client
    .from("event_rsvps")
    .update(updates)
    .eq("id", rsvpId)
    .eq("event_id", eventId)
    .select("id")
    .returns<Pick<EventRsvpRow, "id">[]>()
    .maybeSingle();
};

export const deleteEventRsvp = (
  client: SupabaseClient<Database>,
  rsvpId: string,
  eventId: string,
) => {
  return client
    .from("event_rsvps")
    .delete()
    .eq("id", rsvpId)
    .eq("event_id", eventId)
    .select("id")
    .returns<Pick<EventRsvpRow, "id">[]>();
};
