import { Database } from "./types";
import type {
  EventAttendanceChoice,
  EventSpeakingFormat,
  EventSpeakingIntent,
} from "./types";

export const MAX_MESSAGE_CHARS = {
  memory: 2000,
  condolences: 5000,
  eventRsvp: 2000,
} as const;

export const MAX_NAME_CHARS = {
  memoryAuthor: 200,
  condolencesSender: 200,
  eventRsvpGuest: 200,
} as const;

export const MAX_SOURCE_CHARS = 200;
export const MAX_EVENT_TEXT_CHARS = {
  phone: 50,
  additionalAttendeeNames: 2000,
  accessibilityNeeds: 1000,
  dietaryRestrictions: 1000,
  privateNote: 2000,
  adminNotes: 5000,
} as const;

export type NewMemory = Database["public"]["Tables"]["memories"]["Insert"];
export type NewCondolence = Database["public"]["Tables"]["condolences"]["Insert"];
export type NewEventRsvp = Database["public"]["Tables"]["event_rsvps"]["Insert"];

type TextValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: string; value: string };

const normalizeText = (value: string) => value.trim();

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ATTENDANCE_CHOICES = new Set<EventAttendanceChoice>([
  "in_person",
  "livestream",
  "unable",
  "undecided",
]);
const SPEAKING_INTENTS = new Set<EventSpeakingIntent>(["yes", "no", "maybe"]);
const SPEAKING_FORMATS = new Set<EventSpeakingFormat>([
  "in_person",
  "livestream",
  "pre_recorded",
  "written_note",
]);

export const isValidIsoDate = (value: string) => {
  if (!ISO_DATE_RE.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
};

export const isValidMemorialSlug = (slug: string) => {
  return slug.length >= 2 && slug.length <= 80 && SLUG_RE.test(slug);
};

export const trimAndValidateName = (name: string): TextValidationResult => {
  const trimmed = normalizeText(name);
  if (!trimmed) return { ok: false, reason: "from_name_required", value: "" };
  if (trimmed.length > MAX_NAME_CHARS.condolencesSender) {
    return { ok: false, reason: "from_name_too_long", value: trimmed };
  }

  return { ok: true, value: trimmed };
};

export const trimAndValidateEmail = (email: string): TextValidationResult => {
  const trimmed = normalizeText(email);
  if (!trimmed) return { ok: false, reason: "email_required", value: "" };
  if (!EMAIL_RE.test(trimmed)) return { ok: false, reason: "email_invalid", value: trimmed };

  return { ok: true, value: trimmed };
};

export const trimAndValidateGuestName = (name: string): TextValidationResult => {
  const trimmed = normalizeText(name);
  if (!trimmed) return { ok: false, reason: "guest_name_required", value: "" };
  if (trimmed.length > MAX_NAME_CHARS.eventRsvpGuest) {
    return { ok: false, reason: "guest_name_too_long", value: trimmed };
  }

  return { ok: true, value: trimmed };
};

export const isValidAttendeeCount = (value: number) => {
  return Number.isInteger(value) && value >= 1 && value <= 20;
};

export const trimAndValidateMemoryMessage = (message: string): TextValidationResult => {
  const trimmed = normalizeText(message);
  if (!trimmed) return { ok: false, reason: "memory_message_required", value: "" };
  if (trimmed.length > MAX_MESSAGE_CHARS.memory) {
    return { ok: false, reason: "memory_message_too_long", value: trimmed };
  }

  return { ok: true, value: trimmed };
};

export const trimAndValidateCondolenceMessage = (message: string): TextValidationResult => {
  const trimmed = normalizeText(message);
  if (!trimmed) return { ok: false, reason: "condolence_message_required", value: "" };
  if (trimmed.length > MAX_MESSAGE_CHARS.condolences) {
    return { ok: false, reason: "condolence_message_too_long", value: trimmed };
  }

  return { ok: true, value: trimmed };
};

export const mapInputToMemory = (
  memorialId: string,
  authorName: string,
  message: string,
  photoPaths: string[] = [],
): { ok: true; value: NewMemory } | { ok: false; reason: string } => {
  const normalizedAuthor = normalizeText(authorName);
  if (!normalizedAuthor) return { ok: false, reason: "author_name_required" };
  if (normalizedAuthor.length > MAX_NAME_CHARS.memoryAuthor) {
    return { ok: false, reason: "author_name_too_long" };
  }

  const normalizedMessage = trimAndValidateMemoryMessage(message);
  if (!normalizedMessage.ok) return { ok: false, reason: normalizedMessage.reason };

  return {
    ok: true,
    value: {
      memorial_id: memorialId,
      author_name: normalizedAuthor,
      message: normalizedMessage.value,
      photo_path: photoPaths[0] ?? null,
      photo_paths: photoPaths,
    },
  };
};

export const mapInputToCondolence = (
  memorialId: string,
  fromName: string,
  message: string,
  dateReceived: string | null = null,
  source: string | null = null,
): { ok: true; value: NewCondolence } | { ok: false; reason: string } => {
  const normalizedName = trimAndValidateName(fromName);
  if (!normalizedName.ok) return { ok: false, reason: normalizedName.reason };

  const normalizedMessage = trimAndValidateCondolenceMessage(message);
  if (!normalizedMessage.ok) return { ok: false, reason: normalizedMessage.reason };

  const normalizedDate = dateReceived?.trim() || null;
  if (normalizedDate !== null) {
    if (!isValidIsoDate(normalizedDate)) {
      return { ok: false, reason: "date_received_invalid" };
    }
  }

  const normalizedSource = source?.trim() || null;
  if (normalizedSource && normalizedSource.length > MAX_SOURCE_CHARS) {
    return { ok: false, reason: "source_too_long" };
  }

  return {
    ok: true,
    value: {
      memorial_id: memorialId,
      from_name: normalizedName.value,
      source: normalizedSource,
      message: normalizedMessage.value,
      date_received: normalizedDate,
    },
  };
};

export const mapInputToEventRsvp = (
  eventId: string,
  fields: {
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
  },
): { ok: true; value: NewEventRsvp } | { ok: false; reason: string } => {
  const guestName = trimAndValidateGuestName(fields.guest_name);
  if (!guestName.ok) return { ok: false, reason: guestName.reason };

  const email = trimAndValidateEmail(fields.email);
  if (!email.ok) return { ok: false, reason: email.reason };

  const phone = normalizeText(fields.phone) || null;
  if (phone && phone.length > MAX_EVENT_TEXT_CHARS.phone) {
    return { ok: false, reason: "phone_too_long" };
  }

  const attendanceChoice = normalizeText(fields.attendance_choice);
  if (!ATTENDANCE_CHOICES.has(attendanceChoice as EventAttendanceChoice)) {
    return { ok: false, reason: "attendance_choice_invalid" };
  }

  const positiveAttendance = attendanceChoice === "in_person" || attendanceChoice === "livestream";
  const normalizedAttendeeCount = fields.attendee_count.trim();

  if (positiveAttendance && !normalizedAttendeeCount) {
    return { ok: false, reason: "attendee_count_invalid" };
  }

  const attendeeCount = normalizedAttendeeCount
    ? Number.parseInt(normalizedAttendeeCount, 10)
    : 1;

  if (normalizedAttendeeCount && (!/^\d+$/.test(normalizedAttendeeCount) || !isValidAttendeeCount(attendeeCount))) {
    return { ok: false, reason: "attendee_count_invalid" };
  }

  const additionalAttendeeNames = normalizeText(fields.additional_attendee_names) || null;
  if (
    additionalAttendeeNames
    && additionalAttendeeNames.length > MAX_EVENT_TEXT_CHARS.additionalAttendeeNames
  ) {
    return { ok: false, reason: "additional_attendee_names_too_long" };
  }

  const wantsToSpeak = normalizeText(fields.wants_to_speak);
  if (!SPEAKING_INTENTS.has(wantsToSpeak as EventSpeakingIntent)) {
    return { ok: false, reason: "wants_to_speak_invalid" };
  }

  const speakingFormat = normalizeText(fields.speaking_format) || null;
  if (speakingFormat && !SPEAKING_FORMATS.has(speakingFormat as EventSpeakingFormat)) {
    return { ok: false, reason: "speaking_format_invalid" };
  }

  const message = normalizeText(fields.message) || null;
  if (message && message.length > MAX_MESSAGE_CHARS.eventRsvp) {
    return { ok: false, reason: "event_message_too_long" };
  }

  const accessibilityNeeds = normalizeText(fields.accessibility_needs) || null;
  if (accessibilityNeeds && accessibilityNeeds.length > MAX_EVENT_TEXT_CHARS.accessibilityNeeds) {
    return { ok: false, reason: "accessibility_needs_too_long" };
  }

  const dietaryRestrictions = normalizeText(fields.dietary_restrictions) || null;
  if (dietaryRestrictions && dietaryRestrictions.length > MAX_EVENT_TEXT_CHARS.dietaryRestrictions) {
    return { ok: false, reason: "dietary_restrictions_too_long" };
  }

  const privateNote = normalizeText(fields.private_note) || null;
  if (privateNote && privateNote.length > MAX_EVENT_TEXT_CHARS.privateNote) {
    return { ok: false, reason: "private_note_too_long" };
  }

  return {
    ok: true,
    value: {
      event_id: eventId,
      guest_name: guestName.value,
      email: email.value,
      phone,
      attendance_choice: attendanceChoice as EventAttendanceChoice,
      attendee_count: attendeeCount,
      additional_attendee_names: additionalAttendeeNames,
      wants_to_speak: wantsToSpeak as EventSpeakingIntent,
      speaking_format: speakingFormat as EventSpeakingFormat | null,
      message,
      message_share_permission: fields.message_share_permission,
      accessibility_needs: accessibilityNeeds,
      dietary_restrictions: dietaryRestrictions,
      wants_updates: fields.wants_updates,
      private_note: privateNote,
      status: "pending_review",
    },
  };
};
