"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EventRsvpFormState, submitEventRsvp } from "./actions";

type RsvpFormProps = {
  eventId: string;
  memorialSlug: string;
};

const initialState: EventRsvpFormState = {
  ok: true,
  values: {
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
  },
  errors: {},
};

const fieldClassName =
  "w-full rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/70";
const fieldErrorClassName = "text-sm text-[#7b2f2f]";
const labelClassName = "text-sm font-medium text-foreground";
const requiredLabelClassName = "text-sm font-semibold text-foreground";
const requiredAsteriskClassName = "mr-1 inline text-foreground/80";

const requiredLabel = (label: string) => (
  <>
    <span aria-hidden="true" className={requiredAsteriskClassName}>*</span>
    {label}
  </>
);

export function RsvpForm({ eventId, memorialSlug }: RsvpFormProps) {
  const [state, action, pending] = useActionState(submitEventRsvp, initialState);
  const [wantsToSpeak, setWantsToSpeak] = useState("no");
  const [attendanceChoice, setAttendanceChoice] = useState("in_person");
  const [messageLength, setMessageLength] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const router = useRouter();
  const values = state.values ?? initialState.values;

  useEffect(() => {
    if (!state.ok || !state.message) {
      setShowSuccessToast(false);
      return;
    }

    setMessageLength(0);
    setShowSuccessToast(true);

    const hideToast = setTimeout(() => {
      setShowSuccessToast(false);
    }, 2800);
    const redirect = setTimeout(() => {
      router.push(`/${memorialSlug}`);
    }, 3100);

    return () => {
      clearTimeout(hideToast);
      clearTimeout(redirect);
    };
  }, [state.ok, state.message, memorialSlug, router]);

  useEffect(() => {
    setAttendanceChoice(values?.attendance_choice ?? "in_person");
  }, [values?.attendance_choice]);

  const isAttendeeCountRequired = attendanceChoice === "in_person" || attendanceChoice === "livestream";

  return (
    <section className="mt-8 rounded-3xl border border-border/80 bg-card/80 p-6">
      <h1 className="text-2xl font-semibold">RSVP</h1>
      {showSuccessToast && state.message ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <p className="w-[min(92vw,24rem)] rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 shadow-lg animate-[toast-life_3.5s_ease_forwards]">
            {state.message}
          </p>
        </div>
      ) : null}
      <form key={state.message ? "submitted" : "active"} action={action} className="mt-6 grid gap-5">
        <input type="hidden" name="memorialSlug" value={memorialSlug} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <input
          type="hidden"
          name="additional_attendee_names"
          defaultValue={values?.additional_attendee_names || ""}
        />

        <label className="space-y-2">
          <span className={requiredLabelClassName}>{requiredLabel("Name(s)")}</span>
          <input
            name="guest_name"
            required
            maxLength={200}
            autoComplete="name"
            defaultValue={values?.guest_name}
            placeholder="John and Jane Smith"
            className={fieldClassName}
          />
          {state.errors?.guest_name ? <p className={fieldErrorClassName}>{state.errors.guest_name}</p> : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={requiredLabelClassName}>{requiredLabel("Email")}</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={values?.email}
              className={fieldClassName}
            />
            {state.errors?.email ? <p className={fieldErrorClassName}>{state.errors.email}</p> : null}
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Phone</span>
            <input
              name="phone"
              type="tel"
              maxLength={50}
              autoComplete="tel"
              defaultValue={values?.phone}
              className={fieldClassName}
            />
            {state.errors?.phone ? <p className={fieldErrorClassName}>{state.errors.phone}</p> : null}
          </label>
        </div>

        <fieldset className="space-y-3">
          <legend className={requiredLabelClassName}>{requiredLabel("Attendance")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["in_person", "Attending in person"],
              ["livestream", "Attending via livestream"],
              ["unable", "Not able to attend"],
              ["undecided", "Not sure yet"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 text-sm">
                  <input
                    type="radio"
                    name="attendance_choice"
                    value={value}
                    defaultChecked={values?.attendance_choice === value}
                    required
                    onChange={() => setAttendanceChoice(value)}
                    className="size-4 accent-[var(--accent)]"
                  />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {state.errors?.attendance_choice ? <p className={fieldErrorClassName}>{state.errors.attendance_choice}</p> : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <label className="space-y-2">
            <span className={isAttendeeCountRequired ? requiredLabelClassName : labelClassName}>
              {isAttendeeCountRequired ? requiredLabel("Attendees") : "Attendees"}
            </span>
            <input
              name="attendee_count"
              type="number"
              min={1}
              max={20}
              required={isAttendeeCountRequired}
              defaultValue={values?.attendee_count ?? "1"}
              className={fieldClassName}
            />
            {state.errors?.attendee_count ? <p className={fieldErrorClassName}>{state.errors.attendee_count}</p> : null}
          </label>
        </div>

        <fieldset className="space-y-3">
          <legend className={requiredLabelClassName}>
            {requiredLabel("Would you like the opportunity to speak?")}
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["yes", "Yes"],
              ["no", "No"],
              ["maybe", "Maybe"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 text-sm">
                <input
                  type="radio"
                  name="wants_to_speak"
                  value={value}
                  defaultChecked={values?.wants_to_speak === value}
                  required
                  onChange={() => setWantsToSpeak(value)}
                  className="size-4 accent-[var(--accent)]"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {state.errors?.wants_to_speak ? <p className={fieldErrorClassName}>{state.errors.wants_to_speak}</p> : null}
        </fieldset>

        {wantsToSpeak === "yes" || wantsToSpeak === "maybe" ? (
          <label className="space-y-2">
            <span className={labelClassName}>Speaking format</span>
            <select name="speaking_format" defaultValue={values?.speaking_format} className={fieldClassName}>
              <option value="">Select a format</option>
              <option value="in_person">In person</option>
              <option value="livestream">Via livestream</option>
              <option value="pre_recorded">Pre-recorded message</option>
              <option value="written_note">Written note read by someone else</option>
            </select>
            {state.errors?.speaking_format ? <p className={fieldErrorClassName}>{state.errors.speaking_format}</p> : null}
          </label>
        ) : null}

        <label className="space-y-2">
          <span className={labelClassName}>Message</span>
          <textarea
            name="message"
            maxLength={2000}
            defaultValue={values?.message}
            onChange={(event) => setMessageLength(event.target.value.length)}
            placeholder="Share a memory, condolence, or message"
            className={`${fieldClassName} min-h-32`}
          />
          <span className="block text-xs text-muted-foreground">{messageLength}/2000</span>
          {state.errors?.message ? <p className={fieldErrorClassName}>{state.errors.message}</p> : null}
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3">
          <input
            type="checkbox"
            name="message_share_permission"
            defaultChecked={values?.message_share_permission}
            className="size-4 accent-[var(--accent)]"
          />
          <span className={labelClassName}>Allow the family to read or share your message?</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Accessibility needs</span>
            <textarea
              name="accessibility_needs"
              maxLength={1000}
              defaultValue={values?.accessibility_needs}
              className={`${fieldClassName} min-h-28`}
            />
            {state.errors?.accessibility_needs ? <p className={fieldErrorClassName}>{state.errors.accessibility_needs}</p> : null}
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Dietary restrictions</span>
            <textarea
              name="dietary_restrictions"
              maxLength={1000}
              defaultValue={values?.dietary_restrictions}
              className={`${fieldClassName} min-h-28`}
            />
            {state.errors?.dietary_restrictions ? <p className={fieldErrorClassName}>{state.errors.dietary_restrictions}</p> : null}
          </label>
        </div>

        <label className="space-y-2">
          <span className={labelClassName}>Private note to the family</span>
          <textarea
            name="private_note"
            maxLength={2000}
            defaultValue={values?.private_note}
            className={`${fieldClassName} min-h-28`}
          />
          {state.errors?.private_note ? <p className={fieldErrorClassName}>{state.errors.private_note}</p> : null}
        </label>

        {state.errors?.form ? <p className={fieldErrorClassName}>{state.errors.form}</p> : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting..." : "Submit RSVP"}
          </Button>
        </div>
      </form>
    </section>
  );
}
