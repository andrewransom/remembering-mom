# Milestone 10: Celebration of Life Event and RSVP

## Goal

Let a family configure a single memorial event (e.g. "Celebration of Life for Jenny"), announce it on the public memorial page, and collect RSVPs from invitees — including attendance, speaking interest, accessibility/dietary needs, and a private message to the family. Admins review RSVPs and track status/notes on the existing `/admin/events` page. Event fields are edited from the existing "Event" section on `/admin/settings`.

This closes out the placeholders added in the previous session: the "Event" section in `settings-form.tsx` and the `/admin/events` page.

## Decisions

This plan reflects a grilled-and-resolved design. Recorded here so the rationale isn't lost:

| Question | Answer |
|---|---|
| Data model shape | New `events` table, 1:1 with `memorials` (unique `memorial_id`). Keeps event concerns out of the `memorials` table and leaves room to drop the uniqueness constraint later if multi-event support is ever needed. |
| Event count | One event per memorial for this milestone. No event picker/list UI. |
| Where details are shown | Homepage shows title, description, date/time, time zone, and in-person location directly (a real section, not just a teaser). The RSVP page repeats the same details above the form. |
| Livestream link/instructions | Stored in a **separate admin-only table** (`event_private_details`), not on `events` itself. RLS grants `anon` no select access to that table at all — Row Level Security is row-scoped, not column-scoped, so a private field cannot safely live on a table that also has a public-read policy. See Step 1 and the Security note below. |
| Event publish flag | `events.is_published` (default `false`), independent of `memorials.is_published`. The homepage section and RSVP page only appear once both the memorial and the event are published. |
| Email/SMS sending | Out of scope. No outbound email integration exists in this codebase. RSVP captures `email`, `phone`, and a "send me updates" opt-in as data only — the family follows up manually. |
| Duplicate RSVPs | Always insert a new row. No identity matching by email. Admin manually marks a row `duplicate` via RSVP Status. |
| RSVP Status | Fixed select, drives a filter in the admin list. Values: `pending_review` (default), `confirmed`, `changed`, `cancelled`, `duplicate`. |
| RSVP auth | Fully public, no auth — same trust model as `/[slug]/memories`. Honeypot + rate limit reused. |
| RSVP message vs. Memories | Kept entirely separate from the `memories` table. RSVP messages have their own permission-to-share field but are not surfaced anywhere publicly in this milestone (no admin-curated public display step exists yet — see Not Included). |
| Attendee count | Free-form integer, 1–20 (abuse guard only, no real-world minimum/maximum implied by requirements). |
| Routes | `/[slug]/event/rsvp` only — generic `event` segment (not the display title), matching the existing `/about`, `/memories`, `/condolences` convention. No separate `/[slug]/event` details page; the homepage section already covers "event details." |
| Time zone | Fixed `<select>` of common IANA zone identifiers (e.g. `America/New_York`), not free text — guarantees consistent formatting wherever the time is rendered. |
| Location | Single free-text block (venue + address together), matching how this app already treats addresses/dates as display text everywhere else. No structured address fields. |
| Admin RSVP delete | Allowed, with a confirmation step (same two-click pattern used elsewhere, or `window.confirm` like condolences delete). |
| Attendance Choice options | "Attending in person", "Attending via livestream", "Not able to attend", "Not sure yet". |
| Settings save atomicity | The memorial-fields write and the event-fields write are separate `update`/`upsert` statements (different tables, not wrapped in a DB transaction by Supabase's REST/JS client). The save action runs them **sequentially**, not via `Promise.all`, and returns a structured result so the UI can tell the admin exactly which half saved if one fails. See Step 5b/5c. |
| Event-table validation | DB check constraints mirror the app-level length/format limits (matching how `memories`/`condolences` already constrain `author_name`/`message`/`source` at the DB layer), since `anon` has insert access to `event_rsvps` and could otherwise bypass the form entirely via direct API calls. See Step 1. |

## Data Model

### New table: `events`

1:1 with `memorials` via a unique `memorial_id`. Contains only fields that are safe to expose to public visitors of a published event — see `event_private_details` below for the livestream fields.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| memorial_id | uuid | FK to `memorials.id`, **unique** (enforces 1:1) |
| event_title | text | nullable; UI default suggestion "Celebration of Life for {person_name}" but stored value can be null until configured |
| event_description | text | nullable |
| event_date | date | nullable |
| event_start_time | time | nullable |
| event_end_time | time | nullable |
| time_zone | text | nullable; IANA identifier from a fixed list (e.g. `America/New_York`) |
| location | text | nullable; free-text venue + address block |
| location_notes | text | nullable; parking, accessibility, entrance instructions |
| is_published | boolean | default `false`; gates public visibility independent of `memorials.is_published` |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()`, maintained by the existing `set_updated_at` trigger (added in Milestone 9) |

### New table: `event_private_details`

1:1 with `events` via a unique `event_id`. **Security-critical split:** Row Level Security is row-scoped, not column-scoped — a `select` policy that allows `anon` to read a published `events` row would also expose every column on that row, including a livestream link, regardless of which columns the app's own query happens to request. Putting the livestream fields on their own table lets that table have **no public select policy at all**, so a direct Supabase REST/PostgREST call from an anonymous client cannot retrieve them under any circumstance — not just "the app doesn't ask for them."

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| event_id | uuid | FK to `events.id`, **unique** (enforces 1:1) |
| livestream_link | text | nullable; admin-only, never rendered publicly |
| livestream_instructions | text | nullable; admin-only, never rendered publicly |
| updated_at | timestamptz | default `now()`, maintained by the `set_updated_at` trigger |

### New table: `event_rsvps`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| event_id | uuid | FK to `events.id` |
| guest_name | text | required, max 200, DB check constraint |
| email | text | required, DB check constraint enforces a basic `@`/`.` shape (defense in depth — full RFC validation stays in app code) |
| phone | text | nullable, max 50, DB check constraint |
| attendance_choice | text | required; DB check constraint restricts to `in_person`, `livestream`, `unable`, `undecided` |
| attendee_count | integer | required; DB check constraint restricts to 1–20 |
| additional_attendee_names | text | nullable, max 2000, DB check constraint |
| wants_to_speak | text | required; DB check constraint restricts to `yes`, `no`, `maybe` |
| speaking_format | text | nullable; DB check constraint restricts to `in_person`, `livestream`, `pre_recorded`, `written_note` — only meaningful when `wants_to_speak` is `yes` or `maybe` |
| message | text | nullable, max 2000, DB check constraint |
| message_share_permission | boolean | default `false` |
| accessibility_needs | text | nullable, max 1000, DB check constraint |
| dietary_restrictions | text | nullable, max 1000, DB check constraint |
| wants_updates | boolean | default `false` |
| private_note | text | nullable, max 2000, DB check constraint |
| status | text | default `pending_review`; DB check constraint restricts to `pending_review`, `confirmed`, `changed`, `cancelled`, `duplicate` |
| admin_notes | text | nullable, max 5000, DB check constraint |
| created_at | timestamptz | default `now()` |

No `updated_at` is needed — admin edits (status/notes) don't need a separate audit timestamp for this milestone. All length/format limits mirror the existing pattern in `memories`/`condolences` (`char_length(trim(...))` checks) — see Step 1.

## Steps

### 1. Database migration

Create `supabase/migrations/202606200001_celebration_of_life_event.sql`:

```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null unique references public.memorials(id) on delete cascade,
  event_title text check (event_title is null or char_length(trim(event_title)) between 1 and 200),
  event_description text check (event_description is null or char_length(event_description) <= 5000),
  event_date date,
  event_start_time time,
  event_end_time time,
  time_zone text check (
    time_zone is null or time_zone in (
      'America/New_York', 'America/Chicago', 'America/Denver',
      'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'UTC'
    )
  ),
  location text check (location is null or char_length(location) <= 2000),
  location_notes text check (location_notes is null or char_length(location_notes) <= 2000),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

-- Livestream fields live on their own table with NO public select policy at all.
-- RLS is row-scoped, not column-scoped: a select policy permitting anon to read a
-- published `events` row would expose every column on that row, including a
-- livestream link, no matter what columns the app's own query asks for. Splitting
-- the table is what actually enforces "never shown publicly" at the data layer.
create table public.event_private_details (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  livestream_link text check (livestream_link is null or char_length(livestream_link) <= 2000),
  livestream_instructions text check (livestream_instructions is null or char_length(livestream_instructions) <= 2000),
  updated_at timestamptz not null default now()
);

create trigger event_private_details_set_updated_at
before update on public.event_private_details
for each row execute function public.set_updated_at();

create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_name text not null check (char_length(trim(guest_name)) between 1 and 200),
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone text check (phone is null or char_length(trim(phone)) <= 50),
  attendance_choice text not null check (attendance_choice in ('in_person', 'livestream', 'unable', 'undecided')),
  attendee_count integer not null check (attendee_count between 1 and 20),
  additional_attendee_names text check (additional_attendee_names is null or char_length(additional_attendee_names) <= 2000),
  wants_to_speak text not null check (wants_to_speak in ('yes', 'no', 'maybe')),
  speaking_format text check (speaking_format in ('in_person', 'livestream', 'pre_recorded', 'written_note')),
  message text check (message is null or char_length(message) <= 2000),
  message_share_permission boolean not null default false,
  accessibility_needs text check (accessibility_needs is null or char_length(accessibility_needs) <= 1000),
  dietary_restrictions text check (dietary_restrictions is null or char_length(dietary_restrictions) <= 1000),
  wants_updates boolean not null default false,
  private_note text check (private_note is null or char_length(private_note) <= 2000),
  status text not null default 'pending_review' check (status in ('pending_review', 'confirmed', 'changed', 'cancelled', 'duplicate')),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 5000),
  created_at timestamptz not null default now()
);

create index event_rsvps_event_id_idx on public.event_rsvps (event_id);

alter table public.events enable row level security;
alter table public.event_private_details enable row level security;
alter table public.event_rsvps enable row level security;

-- events: public can read a published event for a published memorial.
-- Safe because this table no longer contains the livestream columns.
create policy "events_select_public"
on public.events
for select
to anon, authenticated
using (
  is_published = true
  and exists (
    select 1 from public.memorials m
    where m.id = events.memorial_id and m.is_published = true
  )
);

-- events: authenticated can manage all rows (matches memorials_manage_authenticated)
create policy "events_manage_authenticated"
on public.events
for all
to authenticated
using (true)
with check (true);

-- event_private_details: deliberately NO policy for `anon` in either direction.
-- Only authenticated admins may read or write livestream details.
create policy "event_private_details_manage_authenticated"
on public.event_private_details
for all
to authenticated
using (true)
with check (true);

-- event_rsvps: public can insert for a published event on a published memorial.
-- Also pins admin-only fields to their untouched default at insert time: an
-- anon insert policy permits writing ANY column in the insert list, so without
-- this an API caller could submit an RSVP pre-marked status = 'confirmed' or
-- with admin_notes already filled in. status/admin_notes can only be changed
-- afterwards by an authenticated admin via event_rsvps_manage_authenticated.
create policy "event_rsvps_insert_public"
on public.event_rsvps
for insert
to anon
with check (
  status = 'pending_review'
  and admin_notes is null
  and exists (
    select 1 from public.events e
    join public.memorials m on m.id = e.memorial_id
    where e.id = event_rsvps.event_id
      and e.is_published = true
      and m.is_published = true
  )
);

-- event_rsvps: authenticated can select/update/delete all (matches condolences pattern)
create policy "event_rsvps_manage_authenticated"
on public.event_rsvps
for all
to authenticated
using (true)
with check (true);
```

Apply via `supabase db push` or the Supabase MCP `apply_migration` tool.

**Defense in depth:** the public `events` table never has livestream columns at all (eliminated at the schema level, not just the query level — see the `event_private_details` split above). The public query functions in Step 3 additionally use explicit column lists rather than `select("*")`, consistent with the rest of this codebase.

**Why DB-level check constraints matter here:** `event_rsvps_insert_public` grants `anon` direct insert access via the Supabase REST API, not just through this app's form. Without DB constraints, a direct API call bypasses every app-level length/format/enum check in Step 4 entirely. The constraints above mirror the existing `char_length(trim(...))` pattern already used for `memories.author_name`/`message` and `condolences.from_name`/`message`/`source`.

**Why the insert policy also pins `status`/`admin_notes`:** an `anon` insert grant covers the entire row being inserted, not just the columns the app's form happens to expose. Without the `status = 'pending_review' and admin_notes is null` clause in `with check`, a direct API caller could submit an RSVP that arrives already `confirmed` or with fabricated `admin_notes`, undermining the entire admin review workflow in Step 8. The application's own insert (Step 7c) also explicitly sets `status: "pending_review"` and omits `admin_notes` rather than relying on the column defaults — belt-and-suspenders with the DB constraint, same reasoning as the explicit column lists elsewhere in this app.

**Why `events.time_zone` has a DB check too:** `events` has no `anon` write access at all (only `events_manage_authenticated`), so this isn't a public-API abuse concern the way the `event_rsvps` constraints are — it's a typo/bug guard. An invalid or freehand zone string saved by an admin (e.g. via a future direct API/script edit, or a client-side bug that bypasses the `<select>`) would silently break `formatEventDateTime`'s zone-aware rendering on both the homepage and the RSVP page with no error surfaced anywhere. Constraining it at the DB layer, matching every other enum-like column in this schema, costs one `check (... in (...))` clause and converts a silent rendering bug into an immediate, loud write failure. The allowed list must be kept in sync with the `<select>` options in Step 5b and the server-side validation list in Step 5c.

### 2. Update TypeScript types

Add to `src/lib/supabase/types.ts`:

- `EventAttendanceChoice = "in_person" | "livestream" | "unable" | "undecided"`
- `EventSpeakingIntent = "yes" | "no" | "maybe"`
- `EventSpeakingFormat = "in_person" | "livestream" | "pre_recorded" | "written_note"`
- `EventRsvpStatus = "pending_review" | "confirmed" | "changed" | "cancelled" | "duplicate"`
- `events` table Row/Insert/Update (mirrors the public-safe column list above — no livestream fields; `id`, `created_at`, `updated_at` optional on Insert).
- `event_private_details` table Row/Insert/Update (`livestream_link`, `livestream_instructions`, keyed by `event_id`).
- `event_rsvps` table Row/Insert/Update (mirrors the column list above; `id`, `created_at`, `status`, `message_share_permission`, `wants_updates` have defaults so are optional on Insert).

### 3. Query helpers

Create `src/lib/supabase/events.ts`:

```ts
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventPrivateDetailsRow = Database["public"]["Tables"]["event_private_details"]["Row"];

// Admin: the public-safe event row plus a left-joined event_private_details row
// (or null if no private-details row exists yet). Used by Settings and Admin Events pages.
export const getEventByMemorialId = (client, memorialId) => {
  /* select("*, event_private_details(livestream_link, livestream_instructions)") ... */
};

// Public: queries ONLY the `events` table, which structurally cannot contain
// livestream fields. No exclusion list needed — there is nothing to exclude.
export const getPublishedEventByMemorialId = (client, memorialId) => { /* ... */ };

// Used by the settings save action — events is 1:1 with memorials, so upsert on memorial_id.
export const upsertEvent = (client, memorialId, payload) => { /* .upsert(..., { onConflict: "memorial_id" }) */ };

// Separate upsert for the private-details row, keyed by event_id (the event row
// must already exist — call this after upsertEvent resolves the event id).
export const upsertEventPrivateDetails = (client, eventId, payload) => {
  /* .upsert(..., { onConflict: "event_id" }) */
};
```

Create `src/lib/supabase/event-rsvps.ts`:

```ts
export type EventRsvpRow = Database["public"]["Tables"]["event_rsvps"]["Row"];

export const createEventRsvp = (client, eventId, payload) => { /* insert, return single row */ };
export const listEventRsvpsForEvent = (client, eventId) => { /* select *, order by created_at desc */ };
export const updateEventRsvpStatusAndNotes = (client, rsvpId, eventId, status, adminNotes) => { /* update ... .eq("id", rsvpId).eq("event_id", eventId) */ };
export const deleteEventRsvp = (client, rsvpId, eventId) => { /* delete ... .eq("id", rsvpId).eq("event_id", eventId).select() */ };
```

Scoping every admin mutation by both `rsvp.id` and `event_id` (derived from the authenticated admin's own slug → memorial → event lookup) prevents one memorial's admin session from touching another memorial's RSVPs by guessing an RSVP id — mirrors how `condolences` mutations scope by `memorial_id`.

### 4. Validation helpers

Add to `src/lib/supabase/validation.ts`:

```ts
export const MAX_MESSAGE_CHARS = {
  memory: 2000,
  condolences: 5000,
  eventRsvp: 2000,
} as const; // extend existing object

export const MAX_NAME_CHARS = {
  memoryAuthor: 200,
  condolencesSender: 200,
  eventRsvpGuest: 200,
} as const; // extend existing object

// Same shape as the `email` column's DB check constraint in Step 1 — kept in
// sync deliberately so a value the app accepts never gets rejected by the DB.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const trimAndValidateEmail = (email: string): TextValidationResult => {
  const trimmed = normalizeText(email);
  if (!trimmed) return { ok: false, reason: "email_required", value: "" };
  if (!EMAIL_RE.test(trimmed)) return { ok: false, reason: "email_invalid", value: trimmed };
  return { ok: true, value: trimmed };
};

// `trimAndValidateName` is condolence-specific today (its "too long" reason
// string and length limit are both hardcoded to `MAX_NAME_CHARS.condolencesSender`).
// Add a dedicated guest-name validator rather than reusing it as-is, so RSVP
// field errors map to RSVP-specific reason strings:
export const trimAndValidateGuestName = (name: string): TextValidationResult => {
  const trimmed = normalizeText(name);
  if (!trimmed) return { ok: false, reason: "guest_name_required", value: "" };
  if (trimmed.length > MAX_NAME_CHARS.eventRsvpGuest) {
    return { ok: false, reason: "guest_name_too_long", value: trimmed };
  }
  return { ok: true, value: trimmed };
};

export const isValidAttendeeCount = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= 20;

export const mapInputToEventRsvp = (
  eventId: string,
  fields: { /* raw string fields from formData */ },
): { ok: true; value: NewEventRsvp } | { ok: false; reason: string } => {
  // validates guest_name (trimAndValidateGuestName),
  // email (trimAndValidateEmail), attendance_choice against the fixed enum,
  // attendee_count via isValidAttendeeCount, wants_to_speak against its enum,
  // speaking_format against its enum (only checked if provided),
  // message length via MAX_MESSAGE_CHARS.eventRsvp, accessibility/dietary/private_note length caps.
};
```

Follow the existing `TextValidationResult` / `reason` string pattern so the action layer can map reasons to field-specific error messages, exactly as `mapInputToCondolence` does today.

### 5. Settings page — Event section

#### 5a. `src/app/[memorialSlug]/admin/settings/page.tsx`

Fetch the event row alongside the memorial: `getEventByMemorialId(adminClient, memorial.id)`. Pass it to `<SettingsForm>` as `event={event}` (it may be `null` if no row exists yet — the form treats all fields as empty/defaults in that case).

#### 5b. `src/app/[memorialSlug]/admin/settings/settings-form.tsx`

Replace the placeholder "Event" `<details>` section (currently just a "Coming soon" paragraph) with real fields, keeping the same collapsible-section pattern used by every other section:

- `event_title` — text input, placeholder `"Celebration of Life for {person_name}"`.
- `event_description` — textarea.
- `event_date` — `<input type="date">`.
- `event_start_time` / `event_end_time` — `<input type="time">`, end time optional.
- `time_zone` — `<select>` with a short fixed list: US Eastern/Central/Mountain/Pacific, Alaska, Hawaii, plus UTC (`America/New_York`, `America/Chicago`, `America/Denver`, `America/Los_Angeles`, `America/Anchorage`, `Pacific/Honolulu`, `UTC`). Render the friendly label, store the IANA value.
- `location` — textarea (venue + address as free text).
- `location_notes` — textarea, optional.
- `livestream_link` — text input, with a helper note: "Private — never shown on the public site. Visible to admins only."
- `livestream_instructions` — textarea, same private helper note.
- `is_published` (event) — toggle/checkbox, labeled "Show this event on the public memorial page", separate from the memorial's own `is_published` toggle in the Identity section.

State is a single `eventFields` object in component state, initialized from the `event` prop (or all-empty defaults if `event` is `null`). `livestream_link`/`livestream_instructions` come from the joined `event_private_details` row (see Step 3) and are saved via a separate call within the same action (see 5c) — the form itself doesn't need to know they live in a different table.

**Save button behavior — sequential, not parallel:** the memorial-fields write and the event-fields write hit two different tables via two separate Supabase calls; the Supabase JS client does not wrap unrelated `update`/`upsert` calls in a single transaction, so running them with `Promise.all` can leave one saved and the other failed with no way to tell the admin which. Instead, `handleSubmit` calls a **single** combined server action, `updateMemorialAndEventSettingsAction`, that performs both writes **sequentially** (memorial first, then event) inside one function and returns a structured result:

```ts
type SettingsSaveResult = {
  memorialRowError?: string;
  userMetadataError?: string;
  eventError?: string;
};
```

**Three independent writes, not two.** `updateMemorialSettingsAction` today already performs two separate Supabase calls — the `memorials` row update, then an `auth.admin.updateUserById` call for the admin's own first/last name metadata (see the existing implementation) — and either can fail independently of the other. Collapsing both into a single `memorialError` would let a user-metadata failure read as "your memorial didn't save" when the memorial row update in fact succeeded, which is the wrong message to show. `SettingsSaveResult` therefore tracks all three outcomes separately:

- `memorialRowError` — the `memorials` table update failed. The event write is **not attempted** (matches the existing rationale: an event row tied to a memorial whose own fields failed to save is not a useful state to create).
- `userMetadataError` — the admin's name failed to save, independent of whether the memorial row or event succeeded. Does not block the event write.
- `eventError` — the `events`/`event_private_details` writes failed. Only reachable once the memorial row write succeeded (regardless of `userMetadataError`).

The form shows each error against its own section if present (memorial fields, "Your Name" section, event section respectively), and shows one success message only when all three are unset. Because none of the three writes is wrapped in a shared DB transaction, the UI must make partial state legible rather than implying an all-or-nothing save — e.g. "Memorial and event details saved. Your name could not be saved: {userMetadataError}" rather than a single generic failure banner. Re-running Save after fixing the issue safely re-applies all attempted writes (all are idempotent `update`/`upsert`s keyed by id, not inserts).

#### 5c. Server action — `src/app/[memorialSlug]/admin/settings/actions.ts`

Extend the existing file (rather than adding a separate `event-actions.ts`) so the single combined action lives next to `updateMemorialSettingsAction` and can call it directly without an extra network hop:

```ts
"use server";

export async function updateMemorialAndEventSettingsAction(
  slug: string,
  memorialData: MemorialUpdatePayload,
  eventData: EventUpdatePayload,
): Promise<SettingsSaveResult>;
```

- `requireAuthenticatedUser()` once, up front.
- Validates `slug` via `isValidMemorialSlug`; if invalid, returns `{ memorialRowError: "...", eventError: "..." }` (the same message in both, since nothing downstream can proceed without a valid slug).
- Performs the `memorials` row update first (the existing logic from `updateMemorialSettingsAction`, factored out so this action and the old export share it). If it fails, returns `{ memorialRowError }` only, and **does not attempt either the user-metadata write or the event write** — both depend on having a successfully-saved memorial id/row to be meaningful.
- If the row update succeeds, attempts the user-metadata write next (existing `auth.admin.updateUserById` logic). If it fails, records `userMetadataError` but **continues on to the event write** — the two are unrelated, and a metadata failure shouldn't block saving event details.
- Proceeds to the event write regardless of the metadata outcome:
  - Coerces empty optional strings to `null` (same `?.trim() || null` pattern as `updateMemorialSettingsAction`).
  - Validates `time_zone` against the fixed allowed list server-side too (don't trust the client `<select>` alone).
  - Validates `event_date` (if provided) is a valid ISO date using the existing `isValidIsoDate`-style check.
  - Calls `upsertEvent(adminClient, memorial.id, payload)`, then `upsertEventPrivateDetails(adminClient, event.id, { livestream_link, livestream_instructions })`.
  - If either event-table write fails, records `eventError`.
- `revalidatePath` for `/${slug}`, `/${slug}/event/rsvp`, `/${slug}/admin/settings`, `/${slug}/admin/events` after any successful write (row, metadata, or event), so the page reflects whichever parts actually saved.
- Returns `{}` (no errors set) only when the row update, metadata update, and event writes all succeed.

### 6. Homepage — "Celebration of Life" section

In `src/app/[memorialSlug]/page.tsx`:

- Fetch the published event: `getPublishedEventByMemorialId(client, memorial.id)`.
- Render a new section **above** the existing "In lieu of flowers" donation section, only when the event row exists, `event.is_published` is true, and at minimum `event_title` or `event_date` is set (guards against an empty published row showing a blank section if an admin toggles `is_published` before filling anything in — note this doesn't replace the publish toggle, it's a defensive minimum so a half-empty section never renders).
- Section content:
  - Heading: `event.event_title || "Celebration of Life"`.
  - `event.event_description`, rendered as a paragraph (split on `\n\n` like the bio page, for multi-paragraph descriptions).
  - A formatted date/time line: format `event_date` with `Intl.DateTimeFormat` (e.g. "Saturday, August 15, 2026"), combined with `event_start_time`–`event_end_time` formatted in `time_zone` (e.g. "2:00 PM – 4:00 PM Eastern Time"). Omit parts that are null. Add a small helper `formatEventDateTime(event)` colocated with this page or in a shared `src/lib/event-format.ts` if reused by the RSVP page (it will be — put it there).

    **Timezone correctness — `event_date` is a date-only Postgres value with no time-of-day component.** `new Date("2026-08-15")` parses as UTC midnight, and `Intl.DateTimeFormat` without an explicit `timeZone` then renders it in the *server's or viewer's local* zone — for any viewer west of UTC (all of North America), that shifts the displayed date back one day (e.g. shows "Friday, August 14"). `formatEventDateTime` must do one of:
    - Format the date-only portion with `timeZone: "UTC"` explicitly (treating the stored calendar date as authoritative, independent of the event's own `time_zone` field and the viewer's locale), **or**
    - Parse `event_date`'s year/month/day components manually (`const [y, m, d] = event_date.split("-").map(Number)`) and construct the display string without going through a `Date` object at all.
    The event's own `event_start_time`/`event_end_time` strings, by contrast, should be formatted *using* `time_zone` (that's the whole point of storing it) — but always by combining the literal date+time strings into a `Date` constructed with an explicit UTC offset or via `Temporal`-style explicit zone math, never by letting the runtime guess a zone from context. Do not rely on `new Date(dateString)` plus an implicit local zone anywhere in this helper.
  - `event.location`, rendered as a `<p>` (preserve line breaks with `whitespace-pre-line`).
  - `event.location_notes`, rendered smaller/muted below location, if present.
  - An "RSVP" button linking to `/${slug}/event/rsvp`, styled consistently with the existing "Share a Memory" / "Read about" buttons (reuse `buttonVariants`).
- **Do not render `livestream_link` or `livestream_instructions` anywhere on this page.**

### 7. Public RSVP page — `/[slug]/event/rsvp`

#### 7a. `src/app/[memorialSlug]/event/rsvp/page.tsx`

Server component:
- Fetch the memorial via `getPublishedMemorialBySlug`; `notFound()` if missing.
- Fetch the event via `getPublishedEventByMemorialId`; `notFound()` if missing, not published, or if `event_title`/`event_date` are both empty (same minimum-completeness guard as the homepage — keeps a stray direct link from reaching a blank page if the event was unpublished after being linked).
- Render the same event-details block as the homepage section (reuse `formatEventDateTime` and a shared `<EventDetails>` component to avoid duplicating the date/time/location formatting JSX in two places).
- Render `<RsvpForm eventId={event.id} memorialSlug={slug} />` below the details.

#### 7b. `src/app/[memorialSlug]/event/rsvp/rsvp-form.tsx`

`"use client"`, built with `useActionState` (same pattern as the condolences form), **not** a redirect-based flow like memory submission (no thank-you/preview-cookie step is needed — RSVPs don't have an associated photo to preview).

Fields, in order:
- `guest_name` — required text input.
- `email` — required text input, `type="email"`.
- `phone` — optional text input, `type="tel"`.
- `attendance_choice` — required radio group: "Attending in person", "Attending via livestream", "Not able to attend", "Not sure yet".
- `attendee_count` — required number input, min 1, max 20, default 1.
- `additional_attendee_names` — optional textarea, only meaningfully relevant if `attendee_count > 1` (don't hide it conditionally — just leave it visible with a hint, to keep the form simple and avoid layout jank).
- `wants_to_speak` — required radio group: "Yes", "No", "Maybe".
- `speaking_format` — optional select, only rendered/enabled when `wants_to_speak` is "Yes" or "Maybe" (client-side conditional render): "In person", "Via livestream", "Pre-recorded message", "Written note read by someone else".
- `message` — optional textarea, "Share a memory, condolence, or message" with a 2000-char counter.
- `message_share_permission` — checkbox: "You may display this message publicly" (only relevant if `message` is non-empty; no hard validation tying them together — an unchecked box with no message is harmless).
- `accessibility_needs` — optional textarea.
- `dietary_restrictions` — optional textarea.
- `wants_updates` — checkbox: "Send me updates about this event."
- `private_note` — optional textarea: "A private note to the family (not shared publicly)."
- Hidden `website` field as the honeypot (same name/pattern as the memories form).

On successful submit, show an inline confirmation message ("Thank you — your RSVP has been received.") and clear the form (matching the condolences create-success pattern of resetting `values` to empty strings). No redirect.

#### 7c. Server action — `src/app/[memorialSlug]/event/rsvp/actions.ts`

```ts
"use server";

export const submitEventRsvp = async (
  _state: EventRsvpFormState,
  formData: FormData,
): Promise<EventRsvpFormState> => { /* ... */ };
```

Mirrors `submitMemory`'s shape closely:
- Reads `memorialSlug` from a hidden field; validates via `isValidMemorialSlug`.
- Honeypot check (`website` field non-empty → return success-looking state without inserting, or simply `redirect` back to the same page — either is fine since there's no thank-you page to redirect to; returning an inert success state is simplest here).
- Rate limit per `${memorialSlug}:${clientIp}`, same in-module `Map`-based limiter as `submitMemory` (module-scoped state is acceptable here exactly as it already is for memories — this is a single-instance Next.js deployment, not a concern to abstract away).
- Looks up the memorial via `getPublishedMemorialBySlug`, then the event via `getPublishedEventByMemorialId`. Errors if either is missing or the event isn't published — return a form-level error, this should be unreachable via the UI but guards against a stale/shared link.
- Validates fields via `mapInputToEventRsvp`.
- Calls `createEventRsvp`.
- On success, returns `{ ok: true, message: "Thank you — your RSVP has been received." }` and clears `values`.
- On failure, returns `{ ok: false, errors, values }` preserving entered values (same as every other form in this app).

### 8. Admin Events page — RSVP list and management

#### 8a. `src/app/[memorialSlug]/admin/events/page.tsx`

Replace the placeholder body:
- `requireAuthenticatedUser()`, fetch memorial via `getMemorialBySlugAdmin`, `notFound()` if missing.
- Fetch the event via `getEventByMemorialId` (the public-safe event row plus the joined `event_private_details` row — admin context, per Step 3).
- Fetch RSVPs via `listEventRsvpsForEvent(adminClient, event.id)` (empty array if no event row yet).
- If no event row exists yet, render a short prompt: "No event has been configured yet." with a link to `/${slug}/admin/settings` (the requested link from Event Management → Settings).
- Otherwise render `<AdminEventsClient>` with the event summary (including the livestream link/instructions from `event_private_details`, visible only here and on Settings, for the admin's own reference) and the RSVP list.

#### 8b. `src/app/[memorialSlug]/admin/events/admin-events-client.tsx`

`"use client"`, structured like `condolences-client.tsx`:
- A status filter `<select>` above the table: "All", "Pending review", "Confirmed", "Changed", "Cancelled", "Duplicate" — client-side filter over the already-fetched list (no need for a server round-trip given expected volume for a single memorial's event).
- Table columns: Guest, Email, Phone, Attendance, # Attendees, Wants to speak, Status, Submitted, Actions.
- Each row's "Actions" cell opens an edit dialog (same `<dialog>` pattern as condolences) showing the full RSVP detail — additional attendee names, speaking format, message, share-permission flag, accessibility/dietary notes, private note — plus editable `status` `<select>` and `admin_notes` textarea. Save calls `updateEventRsvpAction`.
- A delete button per row, requiring confirmation (`window.confirm`, matching the condolences delete pattern exactly, per your decision) before submitting `deleteEventRsvpAction`.
- Use the existing `<Toast>` component for save/delete success and error feedback, matching `condolences-client.tsx`.

#### 8c. Server actions — `src/app/[memorialSlug]/admin/events/actions.ts`

Mirrors `condolences/actions.ts` structure exactly:

```ts
"use server";

export const updateEventRsvpAction = async (_state, formData) => { /* requireAuthenticatedUser, validate status enum, update status + admin_notes, revalidatePath */ };
export const deleteEventRsvpAction = async (_state, formData) => { /* requireAuthenticatedUser, delete, revalidatePath */ };
```

Both scope the mutation by looking up the memorial → event → rsvp chain (via slug and rsvp id passed as hidden form fields) so an admin can only act on RSVPs belonging to the memorial they're viewing — defense in depth even though `event_rsvps_manage_authenticated` currently allows any authenticated user to touch any row (same single-owner caveat already documented in Milestone 9 for `memorials_manage_authenticated`).

`revalidatePath(`/${slug}/admin/events`)` after both actions.

### 9. Admin nav — no changes needed

`src/app/[memorialSlug]/admin/nav.tsx` already has the "Event" tab pointing at `/admin/events`. No change required.

### 10. Settings ↔ Event Management cross-link

- On `/admin/events`, when no event row exists (or even when one does), include a visible link: "Configure event details in Settings →" pointing at `/${slug}/admin/settings`.
- On the Settings "Event" section, add a small note/link near the section header: "View RSVPs in Event Management →" pointing at `/${slug}/admin/events`.

This satisfies the requirement that Event Management and Settings are linked to each other, not just both reachable from the admin nav.

### 11. Docs update

Update `docs/requirements.md`:
- Under **Pages**, add `/<name-slug>/event/rsvp` (public RSVP form) and document that `/<name-slug>/admin/events` now manages real RSVP data (today it's listed only implicitly — add it explicitly with the `/admin/settings` and `/admin/memories` siblings).
- Under **Database Schema**, add the `events`, `event_private_details`, and `event_rsvps` tables with their columns (mirror the tables in this doc's Data Model section).
- Under **Storage**, no changes — this feature adds no storage buckets/paths.
- Under **RLS Summary**, add: `events`: public can select published rows for published memorials; authenticated can manage all rows. `event_private_details`: no public access in either direction; authenticated can manage all rows. `event_rsvps`: public can insert only for a published event on a published memorial; authenticated select/update/delete all.

## Acceptance Checks

- [ ] `supabase db push` applies the migration cleanly; `events`, `event_private_details`, and `event_rsvps` tables exist with the documented columns, checks, and RLS policies.
- [ ] Settings → Event section lets an admin fill in all event fields and save; values persist and reload correctly.
- [ ] Saving Settings still saves all existing memorial fields and the admin's own name correctly when the memorial row, user-metadata, and event writes all succeed.
- [ ] If the event write fails (e.g. a constraint violation forced for testing) after the memorial row write succeeds, the memorial's fields are confirmed saved (reload shows them persisted) and the UI clearly attributes the error to the event section specifically, not a generic "save failed" message.
- [ ] If the user-metadata write fails (e.g. forced for testing) while the memorial row and event writes succeed, the UI reports the name-save failure specifically (not "memorial details failed to save") and confirms the memorial fields and event fields are both persisted on reload.
- [ ] Time zone select stores the IANA identifier; displayed times on the homepage and RSVP page show the correct zone label.
- [ ] Saving the event with a `time_zone` value outside the fixed allowed list (e.g. attempted via a forced direct write for testing) is rejected by the `events.time_zone` check constraint.
- [ ] **Time zone display correctness:** with the system/browser clock set to a Pacific-time (or any UTC-negative) zone, an event with `event_date = 2026-08-15` displays as "August 15" (not "August 14") on both the homepage and the RSVP page.
- [ ] Toggling the event's `is_published` off hides the "Celebration of Life" section from the homepage and makes `/[slug]/event/rsvp` 404, even when the memorial itself is published.
- [ ] Toggling the event's `is_published` on (with `event_title` or `event_date` set) shows the homepage section and makes the RSVP page reachable.
- [ ] An event row with `is_published = true` but no `event_title` and no `event_date` does not render the homepage section or allow the RSVP page to load (minimum-completeness guard).
- [ ] `livestream_link` and `livestream_instructions` live only in `event_private_details`, which has no `anon`-accessible policy in either direction. Verify directly: an anonymous Supabase client (e.g. via `curl` against the PostgREST endpoint with the public anon key, not just the app's own pages) cannot select from `event_private_details` at all, and `events` rows returned to `anon` never contain those columns because the columns don't exist on that table.
- [ ] A direct `anon`-key API insert into `event_rsvps` with an over-length `guest_name`/`message`/`admin_notes` or an invalid `attendance_choice` value is rejected by the database itself (check constraint violation), not just by the app's form.
- [ ] A direct `anon`-key API insert into `event_rsvps` that sets `status` to anything other than `pending_review`, or sets `admin_notes` to a non-null value, is rejected by the `event_rsvps_insert_public` policy's `with check` clause.
- [ ] The public RSVP form submits successfully with only required fields filled in (`guest_name`, `email`, `attendance_choice`, `attendee_count`, `wants_to_speak`).
- [ ] Submitting the RSVP form twice with the same email creates two separate `event_rsvps` rows (no dedup/update-in-place behavior).
- [ ] Invalid email format is rejected with an inline field error; entered values are preserved.
- [ ] `attendee_count` outside 1–20 is rejected.
- [ ] The honeypot field, when filled, silently no-ops the insert (no row created) without showing an error to the (presumed bot) submitter.
- [ ] Rate limiting kicks in after repeated rapid submissions from the same IP for the same memorial.
- [ ] `speaking_format` is only meaningful/visible in the UI when `wants_to_speak` is "Yes" or "Maybe"; submitting with `wants_to_speak = "no"` and no `speaking_format` succeeds.
- [ ] `/admin/events` lists all RSVPs for the memorial's event, newest first by default.
- [ ] The status filter on `/admin/events` correctly narrows the visible rows.
- [ ] Editing an RSVP's status and admin notes saves and persists after reload.
- [ ] Deleting an RSVP requires a confirmation step and removes the row.
- [ ] `/admin/events` shows a clear prompt linking to Settings when no event has been configured yet.
- [ ] Settings' Event section links to `/admin/events`, and `/admin/events` links back to Settings.
- [ ] Unauthenticated access to `/admin/events` and `/admin/settings` redirects to `/login` (unchanged, but verify the new event fields don't break this).
- [ ] `revalidatePath` causes the homepage, RSVP page, Settings, and Admin Events page to reflect changes immediately after each relevant save.
- [ ] `npm run lint` passes.
- [ ] `npm run build` completes successfully.

## Not Included

- Sending any automated email (RSVP confirmation, reminders, event-update notifications) — `wants_updates`/email/phone are captured for the family's manual use only.
- Multiple events per memorial (visitation, service, reception as separate entries).
- A public-facing curated display of RSVP messages that granted sharing permission (e.g. a "well-wishes" wall) — `message_share_permission` is captured but not acted on anywhere yet.
- Editing/cancelling an existing RSVP by the original submitter (e.g. via an emailed edit link). Resubmission creates a new row; admins reconcile duplicates manually.
- Gating or revealing the livestream link based on RSVP status — it is admin-only/private for the entirety of this milestone regardless of attendance choice.
- A separate public `/[slug]/event` details page distinct from the homepage section and RSVP page.
- Calendar file generation (.ics) or "add to calendar" links.
- Structured/geocoded address fields or a map embed for the in-person location.
- CSV export of the RSVP list.
