"use server";

import { headers } from "next/headers";

import { hasMinimumPublicEventDetails } from "@/lib/event-format";
import { createEventRsvp } from "@/lib/supabase/event-rsvps";
import { getPublishedEventByMemorialId } from "@/lib/supabase/events";
import { getPublishedMemorialBySlug } from "@/lib/supabase/memorials";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { isValidMemorialSlug, mapInputToEventRsvp } from "@/lib/supabase/validation";

const SUBMISSION_WINDOW_MS = 60_000;
const SUBMISSION_LIMIT = 5;

type SubmissionWindow = {
  start: number;
  count: number;
};

const submissionRateState = new Map<string, SubmissionWindow>();

type EventRsvpFieldErrors = {
  guest_name?: string;
  email?: string;
  phone?: string;
  attendance_choice?: string;
  attendee_count?: string;
  additional_attendee_names?: string;
  wants_to_speak?: string;
  speaking_format?: string;
  message?: string;
  accessibility_needs?: string;
  dietary_restrictions?: string;
  private_note?: string;
  form?: string;
};

export type EventRsvpFormValues = {
  guest_name: string;
  email: string;
  phone: string;
  attendance_choice: string;
  attendee_count: string;
  additional_attendee_names: string;
  wants_to_speak: string;
  speaking_format: string;
  message: string;
  message_share_permission: boolean;
  accessibility_needs: string;
  dietary_restrictions: string;
  wants_updates: boolean;
  private_note: string;
};

export type EventRsvpFormState = {
  ok: boolean;
  errors?: EventRsvpFieldErrors;
  values?: EventRsvpFormValues;
  message?: string;
};

const emptyValues: EventRsvpFormValues = {
  guest_name: "",
  email: "",
  phone: "",
  attendance_choice: "in_person",
  attendee_count: "1",
  additional_attendee_names: "",
  wants_to_speak: "no",
  speaking_format: "",
  message: "",
  message_share_permission: false,
  accessibility_needs: "",
  dietary_restrictions: "",
  wants_updates: false,
  private_note: "",
};

const getClientIp = async () => {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  return requestHeaders.get("x-real-ip") || "unknown";
};

const isRateLimited = (key: string) => {
  const now = Date.now();
  const current = submissionRateState.get(key);

  if (!current || now - current.start > SUBMISSION_WINDOW_MS) {
    submissionRateState.set(key, { start: now, count: 1 });
    return false;
  }

  current.count += 1;
  return current.count > SUBMISSION_LIMIT;
};

const valuesFromFormData = (formData: FormData): EventRsvpFormValues => ({
  guest_name: String(formData.get("guest_name") || "").trim(),
  email: String(formData.get("email") || "").trim(),
  phone: String(formData.get("phone") || "").trim(),
  attendance_choice: String(formData.get("attendance_choice") || "").trim(),
  attendee_count: String(formData.get("attendee_count") || "").trim(),
  additional_attendee_names: String(formData.get("additional_attendee_names") || "").trim(),
  wants_to_speak: String(formData.get("wants_to_speak") || "").trim(),
  speaking_format: String(formData.get("speaking_format") || "").trim(),
  message: String(formData.get("message") || "").trim(),
  message_share_permission: formData.get("message_share_permission") === "on",
  accessibility_needs: String(formData.get("accessibility_needs") || "").trim(),
  dietary_restrictions: String(formData.get("dietary_restrictions") || "").trim(),
  wants_updates: formData.get("wants_updates") === "on",
  private_note: String(formData.get("private_note") || "").trim(),
});

const mapValidationError = (reason: string): EventRsvpFieldErrors => {
  if (reason === "guest_name_required") return { guest_name: "Please enter your name." };
  if (reason === "guest_name_too_long") return { guest_name: "Name must be 200 characters or fewer." };
  if (reason === "email_required") return { email: "Please enter your email address." };
  if (reason === "email_invalid") return { email: "Please enter a valid email address." };
  if (reason === "phone_too_long") return { phone: "Phone must be 50 characters or fewer." };
  if (reason === "attendance_choice_invalid") return { attendance_choice: "Please choose an attendance option." };
  if (reason === "attendee_count_invalid") return { attendee_count: "Attendee count must be between 1 and 20." };
  if (reason === "additional_attendee_names_too_long") {
    return { additional_attendee_names: "Additional attendee names must be 2000 characters or fewer." };
  }
  if (reason === "wants_to_speak_invalid") return { wants_to_speak: "Please choose whether you want to speak." };
  if (reason === "speaking_format_invalid") return { speaking_format: "Please choose a valid speaking format." };
  if (reason === "event_message_too_long") return { message: "Message must be 2000 characters or fewer." };
  if (reason === "accessibility_needs_too_long") {
    return { accessibility_needs: "Accessibility needs must be 1000 characters or fewer." };
  }
  if (reason === "dietary_restrictions_too_long") {
    return { dietary_restrictions: "Dietary restrictions must be 1000 characters or fewer." };
  }
  if (reason === "private_note_too_long") return { private_note: "Private note must be 2000 characters or fewer." };

  return { form: "Unable to submit this RSVP right now." };
};

export const submitEventRsvp = async (
  _state: EventRsvpFormState,
  formData: FormData,
): Promise<EventRsvpFormState> => {
  const memorialSlug = String(formData.get("memorialSlug") || "").trim();
  const honeypot = String(formData.get("website") || "").trim();
  const values = valuesFromFormData(formData);

  if (!isValidMemorialSlug(memorialSlug)) {
    return { ok: false, values, errors: { form: "This memorial page is not valid." } };
  }

  if (honeypot) {
    return { ok: true, values: emptyValues, errors: {}, message: "Thank you - your RSVP has been received." };
  }

  const clientIp = await getClientIp();
  if (isRateLimited(`${memorialSlug}:${clientIp}`)) {
    return {
      ok: false,
      values,
      errors: { form: "Too many submissions. Please wait a moment before trying again." },
    };
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getPublishedMemorialBySlug(adminClient, memorialSlug);
  if (memorialError || !memorial) {
    return { ok: false, values, errors: { form: "This memorial could not be found." } };
  }

  const { data: event, error: eventError } = await getPublishedEventByMemorialId(adminClient, memorial.id);
  if (eventError || !event || !hasMinimumPublicEventDetails(event)) {
    return { ok: false, values, errors: { form: "This event is not currently accepting RSVPs." } };
  }

  const mapped = mapInputToEventRsvp(event.id, values);
  if (!mapped.ok) {
    return { ok: false, values, errors: mapValidationError(mapped.reason) };
  }

  const { error } = await createEventRsvp(adminClient, mapped.value);
  if (error) {
    return {
      ok: false,
      values,
      errors: { form: "Could not submit your RSVP. Please try again." },
    };
  }

  return {
    ok: true,
    values: emptyValues,
    errors: {},
    message: "Thank you - your RSVP has been received.",
  };
};
