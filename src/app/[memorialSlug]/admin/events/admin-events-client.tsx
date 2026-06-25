"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { formatEventDateTime } from "@/lib/event-format";
import type { EventRsvpRow } from "@/lib/supabase/event-rsvps";
import { getPrivateDetailsEmbed, type EventWithPrivateDetails } from "@/lib/supabase/events";
import type { EventRsvpStatus } from "@/lib/supabase/types";
import {
  EventRsvpDeleteState,
  EventRsvpUpdateState,
  deleteEventRsvpAction,
  updateEventRsvpAction,
} from "./actions";

type AdminEventsClientProps = {
  memorialSlug: string;
  event: EventWithPrivateDetails;
  rsvps: EventRsvpRow[];
};

const updateInitialState: EventRsvpUpdateState = { ok: false };
const deleteInitialState: EventRsvpDeleteState = { ok: false };
const fieldClassName =
  "w-full rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/70";
const iconButtonClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/70 text-foreground/75 transition hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const STATUS_LABELS: Record<EventRsvpStatus, string> = {
  pending_review: "Pending review",
  confirmed: "Confirmed",
  changed: "Changed",
  cancelled: "Cancelled",
  duplicate: "Duplicate",
};

const ATTENDANCE_LABELS: Record<EventRsvpRow["attendance_choice"], string> = {
  in_person: "In person",
  livestream: "Livestream",
  unable: "Unable",
  undecided: "Undecided",
};

const ATTENDANCE_FILTER_LABELS: Record<"all" | EventRsvpRow["attendance_choice"], string> = {
  all: "All",
  in_person: "In Person",
  livestream: "Livestream",
  unable: "Not Attending",
  undecided: "Not Attending",
};

const ATTENDANCE_FILTER_VALUES = ["all", "in_person", "livestream", "unable"] as const;

type AttendanceFilterValue = (typeof ATTENDANCE_FILTER_VALUES)[number];

const SPEAKING_LABELS: Record<EventRsvpRow["wants_to_speak"], string> = {
  yes: "Yes",
  no: "No",
  maybe: "Maybe",
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function AdminEventsClient({ memorialSlug, event, rsvps }: AdminEventsClientProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const privateDetails = getPrivateDetailsEmbed(event);
  const [filter, setFilter] = useState<EventRsvpStatus | "all">("all");
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilterValue>("all");
  const [editingRsvp, setEditingRsvp] = useState<EventRsvpRow | null>(null);
  const [updateState, updateFormAction, updatePending] = useActionState(updateEventRsvpAction, updateInitialState);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteEventRsvpAction, deleteInitialState);
  const stats = useMemo(() => {
    const parsedAttendeeCount = (attendeeCount: number | string | null) => {
      const parsed = Number.parseInt(String(attendeeCount ?? ""), 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    return rsvps.reduce(
      (acc, rsvp) => {
        const attendees = parsedAttendeeCount(rsvp.attendee_count);
        if (rsvp.attendance_choice === "in_person") {
          acc.inPersonAttendees += attendees;
        }
        if (rsvp.attendance_choice === "livestream") {
          acc.livestreamAttendees += attendees;
        }
        if (rsvp.attendance_choice === "unable") {
          acc.regrets += attendees;
        }
        if (
          rsvp.wants_to_speak === "yes"
          && (rsvp.attendance_choice === "in_person" || rsvp.attendance_choice === "livestream")
        ) {
          acc.speakers += 1;
        }
        return acc;
      },
      {
        totalResponses: rsvps.length,
        inPersonAttendees: 0,
        livestreamAttendees: 0,
        regrets: 0,
        speakers: 0,
      },
    );
  }, [rsvps]);
  const filteredRsvps = useMemo(() => {
    return rsvps.filter((rsvp) => {
      if (filter !== "all" && rsvp.status !== filter) return false;
      if (attendanceFilter !== "all" && rsvp.attendance_choice !== attendanceFilter) return false;
      return true;
    });
  }, [filter, attendanceFilter, rsvps]);

  const downloadCsv = () => {
    const toCsvCell = (value: string | number | boolean | null | undefined) => {
      const cellValue = value == null ? "" : String(value);
      const escaped = cellValue.replace(/"/g, "\"\"");
      return `"${escaped}"`;
    };

    const csvHeaders = [
      "ID",
      "Guest Name",
      "Email",
      "Phone",
      "Additional Attendee Names",
      "Attendance Choice",
      "Attendee Count",
      "Wants Updates",
      "Wants to Speak",
      "Speaking Format",
      "Message",
      "Message Share Permission",
      "Accessibility Needs",
      "Dietary Restrictions",
      "Private Note",
      "Admin Notes",
      "Status",
      "Submitted",
    ];
    const csvRows = filteredRsvps.map((rsvp) => [
      toCsvCell(rsvp.id),
      toCsvCell(rsvp.guest_name),
      toCsvCell(rsvp.email),
      toCsvCell(rsvp.phone),
      toCsvCell(rsvp.additional_attendee_names || ""),
      toCsvCell(ATTENDANCE_LABELS[rsvp.attendance_choice]),
      toCsvCell(rsvp.attendee_count),
      toCsvCell(rsvp.wants_updates ? "Yes" : "No"),
      toCsvCell(SPEAKING_LABELS[rsvp.wants_to_speak]),
      toCsvCell(rsvp.speaking_format || ""),
      toCsvCell(rsvp.message || ""),
      toCsvCell(rsvp.message_share_permission ? "Yes" : "No"),
      toCsvCell(rsvp.accessibility_needs || ""),
      toCsvCell(rsvp.dietary_restrictions || ""),
      toCsvCell(rsvp.private_note || ""),
      toCsvCell(rsvp.admin_notes || ""),
      toCsvCell(STATUS_LABELS[rsvp.status]),
      toCsvCell(formatDateTime(rsvp.created_at)),
    ].join(","));
    const csv = [csvHeaders.map((header) => `"${header}"`).join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `event-rsvps-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openEditDialog = (rsvp: EventRsvpRow) => {
    setEditingRsvp(rsvp);
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  };

  useEffect(() => {
    if (updateState.ok && updateState.message) {
      dialogRef.current?.close();
    }
  }, [updateState]);

  return (
    <section className="w-full py-4 sm:py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{event.event_title || "Event Management"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
            <p className="font-medium">{formatEventDateTime(event) || "Date/time not recorded"}</p>
            {event.location ? <p className="whitespace-pre-line text-sm">{event.location}</p> : null}
            {privateDetails?.livestream_link ? (
              <p className="break-words text-sm">
                <span className="font-medium">Livestream: </span>
                {privateDetails.livestream_link}
              </p>
            ) : null}
            {privateDetails?.livestream_instructions ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {privateDetails.livestream_instructions}
              </p>
            ) : null}
          </section>

          <section className="grid grid-cols-5 gap-3">
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total responses</p>
              <p className="mt-2 text-xl font-semibold">{stats.totalResponses}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">In Person Attendees</p>
              <p className="mt-2 text-xl font-semibold">{stats.inPersonAttendees}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Livestream Attendees</p>
              <p className="mt-2 text-xl font-semibold">{stats.livestreamAttendees}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Regrets</p>
              <p className="mt-2 text-xl font-semibold">{stats.regrets}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Speakers</p>
              <p className="mt-2 text-xl font-semibold">{stats.speakers}</p>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium">Status</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as EventRsvpStatus | "all")}
                className="h-10 rounded-xl border border-border bg-card/80 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/70"
              >
                <option value="all">All</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium">Attendance</span>
              <select
                value={attendanceFilter}
                onChange={(event) => setAttendanceFilter(event.target.value as AttendanceFilterValue)}
                className="h-10 rounded-xl border border-border bg-card/80 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/70"
              >
                {ATTENDANCE_FILTER_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {ATTENDANCE_FILTER_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={downloadCsv}
              className="text-sm font-medium text-accent underline"
            >
              Export to CSV
            </button>
          </div>

          <dialog
            ref={dialogRef}
            className="m-auto w-[min(92vw,46rem)] rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/35"
          >
            {editingRsvp ? (
              <form key={editingRsvp.id} className="space-y-4 p-6" action={updateFormAction}>
                <input type="hidden" name="memorialSlug" value={memorialSlug} />
                <input type="hidden" name="rsvpId" value={editingRsvp.id} />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">RSVP from {editingRsvp.guest_name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{editingRsvp.email}</p>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()}>
                    Close
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Guest name</span>
                    <input
                      name="guest_name"
                      required
                      defaultValue={editingRsvp.guest_name}
                      maxLength={200}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Email</span>
                    <input
                      name="email"
                      type="email"
                      required
                      defaultValue={editingRsvp.email}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Phone</span>
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={editingRsvp.phone || ""}
                      maxLength={50}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Attendance</span>
                    <select name="attendance_choice" defaultValue={editingRsvp.attendance_choice} className={fieldClassName}>
                      <option value="in_person">In person</option>
                      <option value="livestream">Livestream</option>
                      <option value="unable">Not able to attend</option>
                      <option value="undecided">Not sure yet</option>
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Attendees</span>
                    <input
                      name="attendee_count"
                      type="number"
                      min={1}
                      max={20}
                      required
                      defaultValue={editingRsvp.attendee_count}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Would you like the opportunity to speak?</span>
                    <select name="wants_to_speak" defaultValue={editingRsvp.wants_to_speak} className={fieldClassName}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="maybe">Maybe</option>
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Speaking format</span>
                    <select name="speaking_format" defaultValue={editingRsvp.speaking_format || ""} className={fieldClassName}>
                      <option value="">Select a format</option>
                      <option value="in_person">In person</option>
                      <option value="livestream">Via livestream</option>
                      <option value="pre_recorded">Pre-recorded message</option>
                      <option value="written_note">Written note</option>
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Want to share message publicly</span>
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3">
                      <input
                        type="checkbox"
                        name="message_share_permission"
                        defaultChecked={editingRsvp.message_share_permission}
                        className="size-4 accent-[var(--accent)]"
                      />
                      <span className="text-sm text-foreground">Allow the family to read or share your message?</span>
                    </div>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Send updates</span>
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3">
                      <input
                        type="checkbox"
                        name="wants_updates"
                        defaultChecked={editingRsvp.wants_updates}
                        className="size-4 accent-[var(--accent)]"
                      />
                      <span className="text-sm text-foreground">Allow email updates?</span>
                    </div>
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Additional attendee names</span>
                  <textarea
                    name="additional_attendee_names"
                    defaultValue={editingRsvp.additional_attendee_names || ""}
                    rows={3}
                    className={`${fieldClassName} min-h-24`}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Message</span>
                  <textarea
                    name="message"
                    defaultValue={editingRsvp.message || ""}
                    rows={4}
                    className={`${fieldClassName} min-h-24`}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Accessibility needs</span>
                  <textarea
                    name="accessibility_needs"
                    defaultValue={editingRsvp.accessibility_needs || ""}
                    rows={3}
                    className={`${fieldClassName} min-h-20`}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Dietary restrictions</span>
                  <textarea
                    name="dietary_restrictions"
                    defaultValue={editingRsvp.dietary_restrictions || ""}
                    rows={3}
                    className={`${fieldClassName} min-h-20`}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Private note</span>
                  <textarea
                    name="private_note"
                    defaultValue={editingRsvp.private_note || ""}
                    rows={3}
                    className={`${fieldClassName} min-h-20`}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Status</span>
                  <select name="status" defaultValue={editingRsvp.status} className={fieldClassName}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Admin notes</span>
                  <textarea
                    name="admin_notes"
                    rows={5}
                    maxLength={5000}
                    defaultValue={editingRsvp.admin_notes ?? ""}
                    className={`${fieldClassName} min-h-32`}
                  />
                </label>

                {updateState.error ? <p className="text-sm text-[#7b2f2f]">{updateState.error}</p> : null}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatePending}>
                    {updatePending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            ) : null}
          </dialog>

          {filteredRsvps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No RSVPs match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border border-border text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Guest</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Attendance</th>
                    <th className="px-3 py-2"># Attendees</th>
                    <th className="px-3 py-2">Wants to speak</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRsvps.map((rsvp) => (
                    <tr key={rsvp.id} className="border-b border-border align-top last:border-b-0">
                      <td className="px-3 py-4 font-medium">{rsvp.guest_name}</td>
                      <td className="px-3 py-4">{rsvp.email}</td>
                      <td className="px-3 py-4">{rsvp.phone || "Not recorded"}</td>
                      <td className="px-3 py-4">{ATTENDANCE_LABELS[rsvp.attendance_choice]}</td>
                      <td className="px-3 py-4">{rsvp.attendee_count}</td>
                      <td className="px-3 py-4">{SPEAKING_LABELS[rsvp.wants_to_speak]}</td>
                      <td className="px-3 py-4">{STATUS_LABELS[rsvp.status]}</td>
                      <td className="px-3 py-4">{formatDateTime(rsvp.created_at)}</td>
                      <td className="px-3 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={iconButtonClassName}
                            aria-label={`Edit RSVP from ${rsvp.guest_name}`}
                            title="Edit"
                            onClick={() => openEditDialog(rsvp)}
                          >
                            <Pencil aria-hidden="true" size={16} />
                          </button>
                          <form
                            action={deleteFormAction}
                            onSubmit={(event) => {
                              if (!window.confirm(`Delete RSVP from ${rsvp.guest_name}? This cannot be undone.`)) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="memorialSlug" value={memorialSlug} />
                            <input type="hidden" name="rsvpId" value={rsvp.id} />
                            <button
                              type="submit"
                              className={`${iconButtonClassName} text-[#7b2f2f] hover:text-[#6b2727]`}
                              disabled={deletePending}
                              aria-label={`Delete RSVP from ${rsvp.guest_name}`}
                              title="Delete"
                            >
                              <Trash2 aria-hidden="true" size={16} />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Toast
        id={updateState.notificationId}
        message={updateState.error || updateState.message}
        tone={updateState.error ? "error" : "success"}
      />
      <Toast
        id={deleteState.notificationId}
        message={deleteState.error || (deleteState.ok ? "RSVP deleted." : null)}
        tone={deleteState.error ? "error" : "success"}
      />
    </section>
  );
}
