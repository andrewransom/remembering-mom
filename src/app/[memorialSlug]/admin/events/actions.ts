"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { deleteEventRsvp, updateEventRsvp } from "@/lib/supabase/event-rsvps";
import { getEventByMemorialId } from "@/lib/supabase/events";
import { getMemorialBySlugAdmin } from "@/lib/supabase/memorials";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import type { EventRsvpStatus } from "@/lib/supabase/types";
import {
  MAX_EVENT_TEXT_CHARS,
  MAX_MESSAGE_CHARS,
  isValidAttendeeCount,
  isValidMemorialSlug,
  trimAndValidateEmail,
  trimAndValidateGuestName,
} from "@/lib/supabase/validation";

const RSVP_STATUSES = new Set<EventRsvpStatus>([
  "pending_review",
  "confirmed",
  "changed",
  "cancelled",
  "duplicate",
]);
const ATTENDANCE_CHOICES = new Set(["in_person", "livestream", "unable", "undecided"]);
const SPEAKING_INTENTS = new Set(["yes", "no", "maybe"]);
const SPEAKING_FORMATS = new Set(["in_person", "livestream", "pre_recorded", "written_note"]);

export type EventRsvpUpdateState = {
  ok: boolean;
  error?: string;
  message?: string;
  notificationId?: string;
};

export type EventRsvpDeleteState = {
  ok: boolean;
  error?: string;
  deletedId?: string | null;
  notificationId?: string;
};

const createNotificationId = () => crypto.randomUUID();

const getEventForSlug = async (memorialSlug: string) => {
  if (!isValidMemorialSlug(memorialSlug)) {
    return { error: "Could not identify this memorial." };
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, memorialSlug);
  if (memorialError || !memorial) {
    return { error: "Could not load this memorial." };
  }

  const { data: event, error: eventError } = await getEventByMemorialId(adminClient, memorial.id);
  if (eventError || !event) {
    return { error: "Could not load this event." };
  }

  return { adminClient, event };
};

export const updateEventRsvpAction = async (
  _state: EventRsvpUpdateState,
  formData: FormData,
): Promise<EventRsvpUpdateState> => {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const memorialSlug = String(formData.get("memorialSlug") || "").trim();
  const rsvpId = String(formData.get("rsvpId") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const adminNotes = String(formData.get("admin_notes") || "").trim();
  const guestName = trimAndValidateGuestName(String(formData.get("guest_name") || ""));
  const email = trimAndValidateEmail(String(formData.get("email") || ""));
  const rawPhone = String(formData.get("phone") || "").trim();
  const attendanceChoice = String(formData.get("attendance_choice") || "").trim();
  const attendeeCountText = String(formData.get("attendee_count") || "").trim();
  const additionalAttendeeNames = String(formData.get("additional_attendee_names") || "").trim();
  const wantsToSpeak = String(formData.get("wants_to_speak") || "").trim();
  const speakingFormat = String(formData.get("speaking_format") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const accessibilityNeeds = String(formData.get("accessibility_needs") || "").trim();
  const dietaryRestrictions = String(formData.get("dietary_restrictions") || "").trim();
  const privateNote = String(formData.get("private_note") || "").trim();
  const wantsUpdates = String(formData.get("wants_updates") || "") === "on";
  const messageSharePermission = String(formData.get("message_share_permission") || "") === "on";

  if (!rsvpId) {
    return { ok: false, error: "Could not identify this RSVP.", notificationId: createNotificationId() };
  }

  if (!guestName.ok) {
    return { ok: false, error: "Please enter a valid guest name.", notificationId: createNotificationId() };
  }
  if (!email.ok) {
    return { ok: false, error: "Please enter a valid email address.", notificationId: createNotificationId() };
  }
  if (rawPhone && rawPhone.length > MAX_EVENT_TEXT_CHARS.phone) {
    return { ok: false, error: "Phone must be 50 characters or fewer.", notificationId: createNotificationId() };
  }
  if (!ATTENDANCE_CHOICES.has(attendanceChoice)) {
    return { ok: false, error: "Please choose a valid attendance option.", notificationId: createNotificationId() };
  }
  if (!/^\d+$/.test(attendeeCountText)) {
    return { ok: false, error: "Attendee count must be a whole number.", notificationId: createNotificationId() };
  }
  const attendeeCount = Number.parseInt(attendeeCountText, 10);
  if (!isValidAttendeeCount(attendeeCount)) {
    return { ok: false, error: "Attendee count must be between 1 and 20.", notificationId: createNotificationId() };
  }
  if (additionalAttendeeNames && additionalAttendeeNames.length > MAX_EVENT_TEXT_CHARS.additionalAttendeeNames) {
    return { ok: false, error: "Additional attendee names must be 2000 characters or fewer.", notificationId: createNotificationId() };
  }
  if (!SPEAKING_INTENTS.has(wantsToSpeak)) {
    return { ok: false, error: "Please choose a valid speaking preference.", notificationId: createNotificationId() };
  }
  if (speakingFormat && !SPEAKING_FORMATS.has(speakingFormat)) {
    return { ok: false, error: "Please choose a valid speaking format.", notificationId: createNotificationId() };
  }
  if (message.length > MAX_MESSAGE_CHARS.eventRsvp) {
    return { ok: false, error: "Message must be 2000 characters or fewer.", notificationId: createNotificationId() };
  }
  if (accessibilityNeeds && accessibilityNeeds.length > MAX_EVENT_TEXT_CHARS.accessibilityNeeds) {
    return { ok: false, error: "Accessibility needs must be 1000 characters or fewer.", notificationId: createNotificationId() };
  }
  if (dietaryRestrictions && dietaryRestrictions.length > MAX_EVENT_TEXT_CHARS.dietaryRestrictions) {
    return { ok: false, error: "Dietary restrictions must be 1000 characters or fewer.", notificationId: createNotificationId() };
  }
  if (privateNote.length > MAX_EVENT_TEXT_CHARS.privateNote) {
    return { ok: false, error: "Private note must be 2000 characters or fewer.", notificationId: createNotificationId() };
  }
  if (!RSVP_STATUSES.has(status as EventRsvpStatus)) {
    return { ok: false, error: "Choose a valid status.", notificationId: createNotificationId() };
  }

  if (adminNotes.length > MAX_EVENT_TEXT_CHARS.adminNotes) {
    return { ok: false, error: "Admin notes must be 5000 characters or fewer.", notificationId: createNotificationId() };
  }

  const eventResult = await getEventForSlug(memorialSlug);
  if ("error" in eventResult) {
    return { ok: false, error: eventResult.error, notificationId: createNotificationId() };
  }

  const { data, error } = await updateEventRsvp(
    eventResult.adminClient,
    rsvpId,
    eventResult.event.id,
    {
      guest_name: guestName.value,
      email: email.value,
      phone: rawPhone || null,
      attendance_choice: attendanceChoice as "in_person" | "livestream" | "unable" | "undecided",
      attendee_count: attendeeCount,
      additional_attendee_names: additionalAttendeeNames || null,
      wants_to_speak: wantsToSpeak as "yes" | "no" | "maybe",
      speaking_format: (speakingFormat || null) as
        | "in_person"
        | "livestream"
        | "pre_recorded"
        | "written_note"
        | null,
      message: message || null,
      message_share_permission: messageSharePermission,
      accessibility_needs: accessibilityNeeds || null,
      dietary_restrictions: dietaryRestrictions || null,
      wants_updates: wantsUpdates,
      private_note: privateNote || null,
      status: status as EventRsvpStatus,
      admin_notes: adminNotes || null,
    },
  );
  

  if (error || !data) {
    return { ok: false, error: "Could not update this RSVP. Please try again.", notificationId: createNotificationId() };
  }

  revalidatePath(`/${memorialSlug}/admin/events`);
  return { ok: true, message: "RSVP updated.", notificationId: createNotificationId() };
};

export const deleteEventRsvpAction = async (
  _state: EventRsvpDeleteState,
  formData: FormData,
): Promise<EventRsvpDeleteState> => {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const memorialSlug = String(formData.get("memorialSlug") || "").trim();
  const rsvpId = String(formData.get("rsvpId") || "").trim();

  if (!rsvpId) {
    return { ok: false, error: "Could not identify this RSVP.", notificationId: createNotificationId() };
  }

  const eventResult = await getEventForSlug(memorialSlug);
  if ("error" in eventResult) {
    return { ok: false, error: eventResult.error, notificationId: createNotificationId() };
  }

  const { data, error } = await deleteEventRsvp(eventResult.adminClient, rsvpId, eventResult.event.id);

  if (error) {
    return { ok: false, error: "Could not delete this RSVP. Please try again.", notificationId: createNotificationId() };
  }

  if (!data || data.length === 0) {
    return { ok: false, error: "This RSVP no longer exists.", notificationId: createNotificationId() };
  }

  revalidatePath(`/${memorialSlug}/admin/events`);
  return { ok: true, deletedId: rsvpId, notificationId: createNotificationId() };
};
