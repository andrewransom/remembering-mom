"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { EVENT_TIME_ZONES } from "@/lib/event-format";
import { getPrivateDetailsEmbed, type EventWithPrivateDetails } from "@/lib/supabase/events";
import type { MemorialRow } from "@/lib/supabase/memorials";
import type { DonationLink } from "@/lib/supabase/types";
import { updateMemorialAndEventSettingsAction } from "./actions";

type SettingsFormProps = {
  memorial: MemorialRow;
  profilePhotoUrl: string | null;
  secondaryPhotoUrl: string | null;
  event: EventWithPrivateDetails | null;
  userFirstName: string | null;
  userLastName: string | null;
};

type PhotoType = "profile" | "secondary";

type PhotoState = {
  previewUrl: string | null;
  isUploading: boolean;
  error: string | null;
};

type EventFields = {
  event_title: string;
  event_description: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  time_zone: string;
  location: string;
  location_notes: string;
  map_link: string;
  livestream_link: string;
  livestream_instructions: string;
  is_published: boolean;
};

const emptyDonationLink = (): DonationLink => ({
  link: { name: "", url: "" },
  details: [],
});

const emptyDetail = (): DonationLink["details"][number] => ({
  name: "",
  description: "",
  info_link: null,
});

const fieldClassName =
  "w-full rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/70";
const labelClassName = "text-sm font-medium text-foreground";
const helperClassName = "text-xs text-muted-foreground";

type SectionKey = "yourName" | "identity" | "event" | "photos" | "content" | "donations";

type SectionState = Record<SectionKey, boolean>;

const makeAllSectionsExpanded = (value: boolean): SectionState => ({
  yourName: value,
  identity: value,
  event: value,
  photos: value,
  content: value,
  donations: value,
});

const iconOnlyButtonClassName =
  "rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

function useConfirmingRemove() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestRemove = (key: string, remove: () => void) => {
    if (pendingKey === key) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPendingKey(null);
      remove();
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPendingKey(key);
    timeoutRef.current = setTimeout(() => setPendingKey(null), 3000);
  };

  return { pendingKey, requestRemove };
}

function PhotoUploadZone({
  label,
  photoType,
  memorialSlug,
  state,
  onStateChange,
}: {
  label: string;
  photoType: PhotoType;
  memorialSlug: string;
  state: PhotoState;
  onStateChange: (state: PhotoState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    onStateChange({ ...state, isUploading: true, error: null });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("memorialSlug", memorialSlug);
    formData.append("photoType", photoType);

    try {
      const response = await fetch("/api/upload-memorial-photo", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json() as { error?: string; publicUrl?: string };

      if (!response.ok || payload.error || !payload.publicUrl) {
        onStateChange({
          ...state,
          isUploading: false,
          error: payload.error ?? "Upload failed. Please try again.",
        });
        return;
      }

      onStateChange({
        previewUrl: payload.publicUrl,
        isUploading: false,
        error: null,
      });
    } catch {
      onStateChange({
        ...state,
        isUploading: false,
        error: "Upload failed. Please try again.",
      });
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void uploadFile(file);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div>
        <p className={labelClassName}>{label}</p>
        <p className={helperClassName}>JPEG, PNG, or WebP, under 10 MB. Saved automatically on upload.</p>
      </div>
      <div
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center transition hover:bg-muted/30"
      >
        {state.previewUrl ? (
          <img
            src={state.previewUrl}
            alt={`${label} preview`}
            className="max-h-56 rounded-xl object-contain"
          />
        ) : (
          <ImagePlus aria-hidden="true" className="size-10 text-muted-foreground" />
        )}
        <div className="flex items-center gap-2 text-sm font-medium text-accent">
          {state.isUploading ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Upload aria-hidden="true" className="size-4" />
          )}
          {state.isUploading ? "Uploading" : "Drop or choose photo"}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
      />
      {state.error ? <p className="text-sm text-[#7b2f2f]">{state.error}</p> : null}
    </div>
  );
}

export function SettingsForm({
  memorial,
  profilePhotoUrl,
  secondaryPhotoUrl,
  event,
  userFirstName,
  userLastName,
}: SettingsFormProps) {
  const privateEventDetails = event ? getPrivateDetailsEmbed(event) : null;
  const [personName] = useState(memorial.person_name);
  const initialDefaultDisplayName = [memorial.first_name, memorial.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const [memorialFirstName, setMemorialFirstName] = useState(memorial.first_name ?? "");
  const [memorialLastName, setMemorialLastName] = useState(memorial.last_name ?? "");
  const [adminFirstName, setAdminFirstName] = useState(userFirstName ?? "");
  const [adminLastName, setAdminLastName] = useState(userLastName ?? "");
  const [displayName, setDisplayName] = useState(
    memorial.display_name ?? initialDefaultDisplayName,
  );
  const [displayNameTouched, setDisplayNameTouched] = useState(Boolean(memorial.display_name));
  const [fullName, setFullName] = useState(memorial.full_name ?? "");
  const [birthDate, setBirthDate] = useState(memorial.birth_date ?? "");
  const [deathDate, setDeathDate] = useState(memorial.death_date ?? "");
  const [isPublished, setIsPublished] = useState(memorial.is_published);
  const [tributeParagraphs, setTributeParagraphs] = useState<string[]>(
    memorial.tribute_paragraphs.length > 0 ? memorial.tribute_paragraphs : [""],
  );
  const [bio, setBio] = useState(memorial.bio ?? "");
  const [donationLinks, setDonationLinks] = useState<DonationLink[]>(
    memorial.donation_links.length > 0 ? memorial.donation_links : [],
  );
  const [eventFields, setEventFields] = useState<EventFields>({
    event_title: event?.event_title ?? "",
    event_description: event?.event_description ?? "",
    event_date: event?.event_date ?? "",
    event_start_time: event?.event_start_time ?? "",
    event_end_time: event?.event_end_time ?? "",
    time_zone: event?.time_zone ?? "",
    location: event?.location ?? "",
    location_notes: event?.location_notes ?? "",
    map_link: event?.map_link ?? "",
    livestream_link: privateEventDetails?.livestream_link ?? "",
    livestream_instructions: privateEventDetails?.livestream_instructions ?? "",
    is_published: event?.is_published ?? false,
  });
  const [profilePhoto, setProfilePhoto] = useState<PhotoState>({
    previewUrl: profilePhotoUrl,
    isUploading: false,
    error: null,
  });
  const [secondaryPhoto, setSecondaryPhoto] = useState<PhotoState>({
    previewUrl: secondaryPhotoUrl,
    isUploading: false,
    error: null,
  });
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { pendingKey, requestRemove } = useConfirmingRemove();
  const [sections, setSections] = useState<SectionState>(makeAllSectionsExpanded(true));

  const toggleSection = (section: SectionKey) => {
    setSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const setAllSections = (open: boolean) => {
    setSections(makeAllSectionsExpanded(open));
  };

  const updateDonationLink = (index: number, value: DonationLink) => {
    setDonationLinks((current) => current.map((link, linkIndex) => linkIndex === index ? value : link));
  };

  const updateMemorialFirstName = (value: string) => {
    setMemorialFirstName(value);
    if (!displayNameTouched) {
      setDisplayName([value, memorialLastName].map((part) => part.trim()).filter(Boolean).join(" "));
    }
  };

  const updateMemorialLastName = (value: string) => {
    setMemorialLastName(value);
    if (!displayNameTouched) {
      setDisplayName([memorialFirstName, value].map((part) => part.trim()).filter(Boolean).join(" "));
    }
  };

  const updateEventField = <Key extends keyof EventFields>(key: Key, value: EventFields[Key]) => {
    setEventFields((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateMemorialAndEventSettingsAction(
        memorial.slug,
        {
          person_name: personName,
          first_name: memorialFirstName,
          last_name: memorialLastName,
          user_first_name: adminFirstName,
          user_last_name: adminLastName,
          display_name: displayName,
          full_name: fullName,
          birth_date: birthDate,
          death_date: deathDate,
          is_published: isPublished,
          tribute_paragraphs: tributeParagraphs,
          bio,
          donation_links: JSON.stringify(donationLinks),
        },
        eventFields,
      );

      if (result.memorialRowError || result.userMetadataError || result.eventError) {
        const parts = [];
        if (!result.memorialRowError) {
          parts.push(result.eventError ? "Memorial details saved." : "Memorial and event details saved.");
        }
        if (result.memorialRowError) parts.push(`Memorial: ${result.memorialRowError}`);
        if (result.userMetadataError) parts.push(`Your name: ${result.userMetadataError}`);
        if (result.eventError) parts.push(`Event: ${result.eventError}`);
        setMessage({ tone: "error", text: parts.join(" ") });
      } else {
        setMessage({ tone: "success", text: "Settings saved." });
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground">Edit memorial content and photos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAllSections(true)}
            className={iconOnlyButtonClassName}
            aria-label="Expand all sections"
          >
            <ChevronDown aria-hidden="true" className="size-5 rotate-[-45deg]" />
          </button>
          <button
            type="button"
            onClick={() => setAllSections(false)}
            className={iconOnlyButtonClassName}
            aria-label="Collapse all sections"
          >
            <ChevronUp aria-hidden="true" className="size-5 rotate-[-45deg]" />
          </button>
        </div>
      </header>

      {message ? (
        <div
          className={
            message.tone === "success"
              ? "rounded-xl border border-[#58745c]/30 bg-[#e6efe7] px-4 py-3 text-sm text-[#315236]"
              : "rounded-xl border border-[#7b2f2f]/30 bg-[#f6e7e7] px-4 py-3 text-sm text-[#7b2f2f]"
          }
        >
          {message.text}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/80">
        <details
          open={sections.yourName}
          onToggle={(event) => {
            const isOpen = (event.currentTarget as HTMLDetailsElement).open;
            setSections((current) => ({ ...current, yourName: isOpen }));
          }}
          className="group"
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-6 py-4"
            onClick={(event) => {
              event.preventDefault();
              toggleSection("yourName");
            }}
          >
            <div>
              <CardTitle>Your Name</CardTitle>
              <CardDescription>Your first and last name as an admin user.</CardDescription>
            </div>
            {sections.yourName ? (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            ) : (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
            )}
          </summary>
          {sections.yourName ? (
            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
              <label className="space-y-2">
                <span className={labelClassName}>First name</span>
                <input
                  className={fieldClassName}
                  value={adminFirstName}
                  onChange={(event) => setAdminFirstName(event.target.value)}
                  placeholder="First name"
                />
              </label>
              <label className="space-y-2">
                <span className={labelClassName}>Last name</span>
                <input
                  className={fieldClassName}
                  value={adminLastName}
                  onChange={(event) => setAdminLastName(event.target.value)}
                  placeholder="Last name"
                />
              </label>
            </div>
          ) : null}
        </details>
      </div>

      <div className="rounded-2xl border border-border/80">
        <details
          open={sections.identity}
          onToggle={(event) => {
            const isOpen = (event.currentTarget as HTMLDetailsElement).open;
            setSections((current) => ({ ...current, identity: isOpen }));
          }}
          className="group"
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-6 py-4"
            onClick={(event) => {
              event.preventDefault();
              toggleSection("identity");
            }}
          >
            <div>
              <CardTitle>Who you are remembering</CardTitle>
              <CardDescription>Core names, dates, and visibility.</CardDescription>
            </div>
            {sections.identity ? (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            ) : (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
            )}
          </summary>
          {sections.identity ? (
            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
              <label className="space-y-2">
                <span className={labelClassName}>First name</span>
                <input
                  className={fieldClassName}
                  value={memorialFirstName}
                  required
                  onChange={(event) => updateMemorialFirstName(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClassName}>Last name</span>
                <input
                  className={fieldClassName}
                  value={memorialLastName}
                  onChange={(event) => updateMemorialLastName(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClassName}>Display name</span>
                <input
                  className={fieldClassName}
                  value={displayName}
                  onChange={(event) => {
                    setDisplayNameTouched(true);
                    setDisplayName(event.target.value);
                  }}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClassName}>Full name</span>
                <input
                  className={fieldClassName}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClassName}>Birth date</span>
                <input
                  className={fieldClassName}
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClassName}>Death date</span>
                <input
                  className={fieldClassName}
                  value={deathDate}
                  onChange={(event) => setDeathDate(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(event) => setIsPublished(event.target.checked)}
                  className="size-4 accent-[var(--accent)]"
                />
                <span className={labelClassName}>Published</span>
              </label>
            </div>
          ) : null}
        </details>
      </div>

      <div className="rounded-2xl border border-border/80">
        <details
          open={sections.event}
          onToggle={(event) => {
            const isOpen = (event.currentTarget as HTMLDetailsElement).open;
            setSections((current) => ({ ...current, event: isOpen }));
          }}
          className="group"
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-6 py-4"
            onClick={(event) => {
              event.preventDefault();
              toggleSection("event");
            }}
          >
            <div>
              <CardTitle>Event</CardTitle>
              <CardDescription>
                Celebration details and RSVP visibility.{" "}
                <Link href={`/${memorial.slug}/admin/events`} className="text-accent underline">
                  View RSVPs in Event Management
                </Link>
              </CardDescription>
            </div>
            {sections.event ? (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            ) : (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
            )}
          </summary>
          {sections.event ? (
            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className={labelClassName}>Event title</span>
                <input
                  className={fieldClassName}
                  value={eventFields.event_title}
                  onChange={(event) => updateEventField("event_title", event.target.value)}
                  placeholder={`Celebration of Life for ${memorial.person_name}`}
                  maxLength={200}
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className={labelClassName}>Description</span>
                <textarea
                  className={`${fieldClassName} min-h-32`}
                  value={eventFields.event_description}
                  onChange={(event) => updateEventField("event_description", event.target.value)}
                  maxLength={5000}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClassName}>Date</span>
                <input
                  type="date"
                  className={fieldClassName}
                  value={eventFields.event_date}
                  onChange={(event) => updateEventField("event_date", event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClassName}>Time zone</span>
                <select
                  className={fieldClassName}
                  value={eventFields.time_zone}
                  onChange={(event) => updateEventField("time_zone", event.target.value)}
                >
                  <option value="">Select a time zone</option>
                  {EVENT_TIME_ZONES.map((zone) => (
                    <option key={zone.value} value={zone.value}>
                      {zone.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className={labelClassName}>Start time</span>
                <input
                  type="time"
                  className={fieldClassName}
                  value={eventFields.event_start_time}
                  onChange={(event) => updateEventField("event_start_time", event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClassName}>End time</span>
                <input
                  type="time"
                  className={fieldClassName}
                  value={eventFields.event_end_time}
                  onChange={(event) => updateEventField("event_end_time", event.target.value)}
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className={labelClassName}>Location</span>
                <textarea
                  className={`${fieldClassName} min-h-28`}
                  value={eventFields.location}
                  onChange={(event) => updateEventField("location", event.target.value)}
                  maxLength={2000}
                  placeholder="Venue and address"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className={labelClassName}>Location notes</span>
                <textarea
                  className={`${fieldClassName} min-h-24`}
                  value={eventFields.location_notes}
                  onChange={(event) => updateEventField("location_notes", event.target.value)}
                  maxLength={2000}
                  placeholder="Parking, accessibility, entrance instructions"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className={labelClassName}>Map link</span>
                <input
                  className={fieldClassName}
                  value={eventFields.map_link}
                  onChange={(event) => updateEventField("map_link", event.target.value)}
                  maxLength={2000}
                  placeholder="Google Maps embed URL"
                />
                <span className={helperClassName}>Use the Google Maps embed URL. Example: https://www.google.com/maps/embed?... </span>
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className={labelClassName}>Livestream link</span>
                <input
                  className={fieldClassName}
                  value={eventFields.livestream_link}
                  onChange={(event) => updateEventField("livestream_link", event.target.value)}
                  maxLength={2000}
                />
                <span className={helperClassName}>Private - never shown on the public site. Visible to admins only.</span>
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className={labelClassName}>Livestream instructions</span>
                <textarea
                  className={`${fieldClassName} min-h-24`}
                  value={eventFields.livestream_instructions}
                  onChange={(event) => updateEventField("livestream_instructions", event.target.value)}
                  maxLength={2000}
                />
                <span className={helperClassName}>Private - never shown on the public site. Visible to admins only.</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={eventFields.is_published}
                  onChange={(event) => updateEventField("is_published", event.target.checked)}
                  className="size-4 accent-[var(--accent)]"
                />
                <span className={labelClassName}>Show this event on the public memorial page</span>
              </label>
            </div>
          ) : null}
        </details>
      </div>

      <div className="rounded-2xl border border-border/80">
        <details
          open={sections.photos}
          onToggle={(event) => {
            const isOpen = (event.currentTarget as HTMLDetailsElement).open;
            setSections((current) => ({ ...current, photos: isOpen }));
          }}
          className="group"
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-6 py-4"
            onClick={(event) => {
              event.preventDefault();
              toggleSection("photos");
            }}
          >
            <div>
              <CardTitle>Photos</CardTitle>
              <CardDescription>Uploads save immediately and are not part of the Save button.</CardDescription>
            </div>
            {sections.photos ? (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            ) : (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
            )}
          </summary>
          {sections.photos ? (
            <div className="grid gap-6 px-6 pb-6 lg:grid-cols-2">
              <PhotoUploadZone
                label="Profile photo"
                photoType="profile"
                memorialSlug={memorial.slug}
                state={profilePhoto}
                onStateChange={setProfilePhoto}
              />
              <PhotoUploadZone
                label="Secondary photo"
                photoType="secondary"
                memorialSlug={memorial.slug}
                state={secondaryPhoto}
                onStateChange={setSecondaryPhoto}
              />
            </div>
          ) : null}
        </details>
      </div>

      <div className="rounded-2xl border border-border/80">
        <details
          open={sections.content}
          onToggle={(event) => {
            const isOpen = (event.currentTarget as HTMLDetailsElement).open;
            setSections((current) => ({ ...current, content: isOpen }));
          }}
          className="group"
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-6 py-4"
            onClick={(event) => {
              event.preventDefault();
              toggleSection("content");
            }}
          >
            <div>
              <CardTitle>Content</CardTitle>
              <CardDescription>Homepage tribute paragraphs and the about-page bio.</CardDescription>
            </div>
            {sections.content ? (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            ) : (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
            )}
          </summary>
          {sections.content ? (
            <div className="space-y-6 px-6 pb-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className={labelClassName}>Tribute paragraphs</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => setTributeParagraphs((current) => [...current, ""])}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Add paragraph
                  </Button>
                </div>
                {tributeParagraphs.map((paragraph, index) => {
                  const removeKey = `paragraph-${index}`;

                  return (
                    <div key={removeKey} className="space-y-2 rounded-xl border border-border bg-card/60 p-3">
                      <textarea
                        className={`${fieldClassName} min-h-28`}
                        value={paragraph}
                        onChange={(event) => setTributeParagraphs((current) =>
                          current.map((item, itemIndex) => itemIndex === index ? event.target.value : item),
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-[#7b2f2f]"
                        onClick={() => requestRemove(removeKey, () =>
                          setTributeParagraphs((current) => current.filter((_, itemIndex) => itemIndex !== index)),
                        )}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        {pendingKey === removeKey ? "Confirm remove?" : "Remove paragraph"}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <label className="block space-y-2">
                <span className={labelClassName}>Bio</span>
                <textarea
                  className={`${fieldClassName} min-h-72`}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                />
              </label>
            </div>
          ) : null}
        </details>
      </div>

      <div className="rounded-2xl border border-border/80">
        <details
          open={sections.donations}
          onToggle={(event) => {
            const isOpen = (event.currentTarget as HTMLDetailsElement).open;
            setSections((current) => ({ ...current, donations: isOpen }));
          }}
          className="group"
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-6 py-4"
            onClick={(event) => {
              event.preventDefault();
              toggleSection("donations");
            }}
          >
            <div>
              <CardTitle>Donation Links</CardTitle>
              <CardDescription>Links with empty URLs are skipped when saved.</CardDescription>
            </div>
            {sections.donations ? (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            ) : (
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
            )}
          </summary>
          {sections.donations ? (
            <div className="space-y-4 px-6 pb-6">
              {donationLinks.map((donation, donationIndex) => {
                const removeLinkKey = `donation-${donationIndex}`;

                return (
                  <div key={removeLinkKey} className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className={labelClassName}>Link name</span>
                        <input
                          className={fieldClassName}
                          value={donation.link.name}
                          onChange={(event) => updateDonationLink(donationIndex, {
                            ...donation,
                            link: { ...donation.link, name: event.target.value },
                          })}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className={labelClassName}>Link URL</span>
                        <input
                          className={fieldClassName}
                          value={donation.link.url}
                          onChange={(event) => updateDonationLink(donationIndex, {
                            ...donation,
                            link: { ...donation.link, url: event.target.value },
                          })}
                        />
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className={labelClassName}>Charity details</p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="gap-2"
                          onClick={() => updateDonationLink(donationIndex, {
                            ...donation,
                            details: [...donation.details, emptyDetail()],
                          })}
                        >
                          <Plus aria-hidden="true" className="size-4" />
                          Add charity detail
                        </Button>
                      </div>
                      {donation.details.map((detail, detailIndex) => {
                        const removeDetailKey = `donation-${donationIndex}-detail-${detailIndex}`;

                        return (
                          <div key={removeDetailKey} className="grid gap-3 rounded-xl border border-border/70 p-3">
                            <input
                              className={fieldClassName}
                              value={detail.name}
                              placeholder="Name"
                              onChange={(event) => {
                                const nextDetails = donation.details.map((item, itemIndex) =>
                                  itemIndex === detailIndex ? { ...item, name: event.target.value } : item,
                                );
                                updateDonationLink(donationIndex, { ...donation, details: nextDetails });
                              }}
                            />
                            <textarea
                              className={`${fieldClassName} min-h-24`}
                              value={detail.description}
                              placeholder="Description"
                              onChange={(event) => {
                                const nextDetails = donation.details.map((item, itemIndex) =>
                                  itemIndex === detailIndex ? { ...item, description: event.target.value } : item,
                                );
                                updateDonationLink(donationIndex, { ...donation, details: nextDetails });
                              }}
                            />
                            <input
                              className={fieldClassName}
                              value={detail.info_link ?? ""}
                              placeholder="Info link"
                              onChange={(event) => {
                                const nextDetails = donation.details.map((item, itemIndex) =>
                                  itemIndex === detailIndex ? { ...item, info_link: event.target.value } : item,
                                );
                                updateDonationLink(donationIndex, { ...donation, details: nextDetails });
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-fit gap-2 text-[#7b2f2f]"
                              onClick={() => requestRemove(removeDetailKey, () => {
                                const nextDetails = donation.details.filter((_, itemIndex) => itemIndex !== detailIndex);
                                updateDonationLink(donationIndex, { ...donation, details: nextDetails });
                              })}
                            >
                              <Trash2 aria-hidden="true" className="size-4" />
                              {pendingKey === removeDetailKey ? "Confirm remove?" : "Remove detail"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-[#7b2f2f]"
                      onClick={() => requestRemove(removeLinkKey, () =>
                        setDonationLinks((current) => current.filter((_, index) => index !== donationIndex)),
                      )}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      {pendingKey === removeLinkKey ? "Confirm remove?" : "Remove link"}
                    </Button>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                onClick={() => setDonationLinks((current) => [...current, emptyDonationLink()])}
              >
                <Plus aria-hidden="true" className="size-4" />
                Add donation link
              </Button>
            </div>
          ) : null}
        </details>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          className="gap-2"
          disabled={isPending}
          onClick={handleSubmit}
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
          {isPending ? "Saving" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
