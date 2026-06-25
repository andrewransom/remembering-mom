import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventPrivateDetailsRow = Database["public"]["Tables"]["event_private_details"]["Row"];
type EventPrivateDetailsEmbed = Pick<EventPrivateDetailsRow, "livestream_link" | "livestream_instructions">;
export type EventWithPrivateDetails = EventRow & {
  event_private_details: EventPrivateDetailsEmbed | EventPrivateDetailsEmbed[] | null;
};
export type EventUpdatePayload = Omit<
  Database["public"]["Tables"]["events"]["Insert"],
  "id" | "memorial_id" | "created_at" | "updated_at"
>;
export type EventPrivateDetailsUpdatePayload = Omit<
  Database["public"]["Tables"]["event_private_details"]["Insert"],
  "id" | "event_id" | "updated_at"
>;

export const getEventByMemorialId = (
  client: SupabaseClient<Database>,
  memorialId: string,
) => {
  return client
    .from("events")
    .select("id, memorial_id, event_title, event_description, event_date, event_start_time, event_end_time, time_zone, location, location_notes, map_link, is_published, created_at, updated_at, event_private_details(livestream_link, livestream_instructions)")
    .eq("memorial_id", memorialId)
    .returns<EventWithPrivateDetails[]>()
    .maybeSingle();
};

export const getPublishedEventByMemorialId = (
  client: SupabaseClient<Database>,
  memorialId: string,
) => {
  return client
    .from("events")
    .select("id, memorial_id, event_title, event_description, event_date, event_start_time, event_end_time, time_zone, location, location_notes, map_link, is_published, created_at, updated_at")
    .eq("memorial_id", memorialId)
    .eq("is_published", true)
    .returns<EventRow[]>()
    .maybeSingle();
};

export const upsertEvent = (
  client: SupabaseClient<Database>,
  memorialId: string,
  payload: EventUpdatePayload,
) => {
  return client
    .from("events")
    .upsert({ ...payload, memorial_id: memorialId }, { onConflict: "memorial_id" })
    .select("id, memorial_id, event_title, event_description, event_date, event_start_time, event_end_time, time_zone, location, location_notes, map_link, is_published, created_at, updated_at")
    .returns<EventRow[]>()
    .maybeSingle();
};

export const upsertEventPrivateDetails = (
  client: SupabaseClient<Database>,
  eventId: string,
  payload: EventPrivateDetailsUpdatePayload,
) => {
  return client
    .from("event_private_details")
    .upsert({ ...payload, event_id: eventId }, { onConflict: "event_id" })
    .select("id, event_id, livestream_link, livestream_instructions, updated_at")
    .returns<EventPrivateDetailsRow[]>()
    .maybeSingle();
};

export const getPrivateDetailsEmbed = (event: EventWithPrivateDetails) => {
  const details = event.event_private_details;
  return Array.isArray(details) ? details[0] ?? null : details;
};
