import type { EventRow } from "./supabase/events";

export const EVENT_TIME_ZONES = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "UTC", label: "UTC" },
] as const;

export type EventTimeZone = (typeof EVENT_TIME_ZONES)[number]["value"];

export const isValidEventTimeZone = (value: string): value is EventTimeZone => {
  return EVENT_TIME_ZONES.some((zone) => zone.value === value);
};

export const hasMinimumPublicEventDetails = (event: Pick<EventRow, "event_title" | "event_date">) => {
  return Boolean(event.event_title?.trim() || event.event_date);
};

const formatDateOnly = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

const formatTime = (time: string) => {
  const [hourText, minuteText] = time.split(":");
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const date = new Date(Date.UTC(2026, 0, 1, hour, minute));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
};

export const getEventTimeZoneLabel = (timeZone: string | null) => {
  if (!timeZone) return null;
  return EVENT_TIME_ZONES.find((zone) => zone.value === timeZone)?.label ?? timeZone;
};

export const formatEventDateTime = (
  event: Pick<EventRow, "event_date" | "event_start_time" | "event_end_time" | "time_zone">,
) => {
  const dateText = event.event_date ? formatDateOnly(event.event_date) : null;
  const startText = event.event_start_time ? formatTime(event.event_start_time) : null;
  const endText = event.event_end_time ? formatTime(event.event_end_time) : null;
  const timeZoneText = getEventTimeZoneLabel(event.time_zone);
  const timeText = startText
    ? [startText, endText].filter(Boolean).join(" - ")
    : null;
  const timeWithZone = timeText && timeZoneText ? `${timeText} ${timeZoneText}` : timeText;

  return [dateText, timeWithZone].filter(Boolean).join(" at ");
};
