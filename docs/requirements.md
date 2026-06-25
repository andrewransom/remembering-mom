# Memorial Site — Requirements

## Purpose

A warm, simple memorial website that can host multiple memorial pages. Each memorial has its own public landing page, public memory submission flow, private admin memory moderation page, and private condolences log.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js App Router |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui-style primitives |
| Database & Auth | Supabase Postgres, Auth, Storage |
| Hosting | AWS with SST/OpenNext adapter |

## URL Model

Routes are memorial-scoped by slug:

- `/` — public index of published memorials
- `/<name-slug>` — public memorial landing page
- `/<name-slug>/about` — public bio/about page
- `/<name-slug>/memories` — public memory submission
- `/<name-slug>/memories/thank-you` — private thank-you preview for the submitter's latest memory
- `/<name-slug>/event/rsvp` — public event RSVP form for published events
- `/<name-slug>/condolences` — authenticated condolences log
- `/<name-slug>/admin/memories` — authenticated memory moderation
- `/<name-slug>/admin/events` — authenticated event RSVP management
- `/<name-slug>/admin/settings` — authenticated memorial settings
- `/login` — global admin login

## Access Control

- Public visitors can view published memorial landing pages and submit memories/photos for a published memorial.
- Public visitors can view approved memories on the memorial landing page.
- Public visitors cannot browse unapproved or unmoderated memories.
- Admins are manually created Supabase Auth users.
- Any authenticated user is an admin for v1 and can manage all memorials.
- Public Supabase signup must be disabled.

Future multi-family authorization can add a `memorial_admins` table. It is intentionally out of scope for v1.

## Pages

### Public memorial index (`/`)

Lists published memorials and links to `/<name-slug>`.

### Memorial landing page (`/<name-slug>`)

Public. Renders content from the `memorials` table:

- Profile photo from Supabase Storage
- Name
- Birth and death dates
- Tribute paragraphs
- Donation links
- Approved memories (read-only), displayed below the donation section
- Published Celebration of Life event details and RSVP link when configured

### Bio/about page (`/<name-slug>/about`)

Public. Renders the memorial's full name, dates, secondary photo, and life-story bio.

### Memory submission (`/<name-slug>/memories`)

Public form:

- Name required
- Message required, max about 2000 chars
- Optional single image upload
- Honeypot field

After submission, redirect to `/<name-slug>/memories/thank-you` with a signed, short-lived, HTTP-only preview cookie containing memory ID, memorial ID, slug, and expiry.

### Admin memory moderation (`/<name-slug>/admin/memories`)

Authenticated. Shows newest memories for that memorial only and supports hard delete. Deleting a memory also removes its associated photo when present.

### Admin settings (`/<name-slug>/admin/settings`)

Authenticated. Lets admin edit memorial identity, dates, publication status, photos, homepage tribute paragraphs, bio, donation links, and Celebration of Life event details.

### Event RSVP (`/<name-slug>/event/rsvp`)

Public. Shows published event details for a published memorial and lets guests submit RSVP details, attendance choice, speaking interest, accessibility/dietary needs, and private notes.

### Admin event management (`/<name-slug>/admin/events`)

Authenticated. Shows configured event details and lets admin filter RSVPs, update RSVP status/admin notes, and delete RSVP rows.

### Condolences log (`/<name-slug>/condolences`)

Authenticated. Lets admin add, sort, and delete condolences for that memorial only.

### Login (`/login`)

Global email/password Supabase Auth login. Successful login redirects to `/`.

## Database Schema

### `memorials`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| slug | text | unique route slug |
| person_name | text | required |
| first_name | text | nullable given name used for short display contexts |
| last_name | text | nullable family name |
| display_name | text | nullable short display name, defaults to first and last name in admin settings |
| full_name | text | nullable full display name for the bio page |
| birth_date | text | nullable display text |
| death_date | text | nullable display text |
| bio | text | nullable life-story text for the bio page |
| tribute_paragraphs | text[] | landing content |
| donation_links | jsonb | array of organization/link objects |
| profile_photo_path | text | nullable storage object path, default app path is `<memorial-id>/main.<ext>` |
| secondary_photo_path | text | nullable storage object path, default app path is `<memorial-id>/secondary.<ext>` |
| is_published | boolean | public visibility |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### `memories`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| memorial_id | uuid | FK to `memorials.id` |
| author_name | text | required, max 200 |
| message | text | required, max 2000 |
| photo_path | text | nullable Supabase Storage object path |
| created_at | timestamptz | default now() |

### `condolences`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| memorial_id | uuid | FK to `memorials.id` |
| from_name | text | required, max 200 |
| date_received | date | nullable |
| message | text | required, max 5000 |
| created_at | timestamptz | default now() |

### `events`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| memorial_id | uuid | FK to `memorials.id`, unique |
| event_title | text | nullable, max 200 |
| event_description | text | nullable, max 5000 |
| event_date | date | nullable |
| event_start_time | time | nullable |
| event_end_time | time | nullable |
| time_zone | text | nullable fixed IANA zone |
| location | text | nullable, max 2000 |
| location_notes | text | nullable, max 2000 |
| is_published | boolean | event visibility, independent from memorial visibility |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### `event_private_details`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| event_id | uuid | FK to `events.id`, unique |
| livestream_link | text | nullable, admin-only |
| livestream_instructions | text | nullable, admin-only |
| updated_at | timestamptz | default now() |

### `event_rsvps`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| event_id | uuid | FK to `events.id` |
| guest_name | text | required, max 200 |
| email | text | required |
| phone | text | nullable, max 50 |
| attendance_choice | text | `in_person`, `livestream`, `unable`, `undecided` |
| attendee_count | integer | required, 1-20 |
| additional_attendee_names | text | nullable, max 2000 |
| wants_to_speak | text | `yes`, `no`, `maybe` |
| speaking_format | text | nullable speaking format |
| message | text | nullable, max 2000 |
| message_share_permission | boolean | default false |
| accessibility_needs | text | nullable, max 1000 |
| dietary_restrictions | text | nullable, max 1000 |
| wants_updates | boolean | default false |
| private_note | text | nullable, max 2000 |
| status | text | admin review status, default `pending_review` |
| admin_notes | text | nullable, max 5000 |
| created_at | timestamptz | default now() |

## Storage

- `profile` bucket: public read, authenticated write only, JPEG/PNG/WebP up to 10 MB, profile path `<memorial-id>/main.<ext>`, secondary photo path `<memorial-id>/secondary.<ext>`
- `memories` bucket: public read by direct URL, no anonymous direct writes, app-mediated uploads at `<memorial-id>/<uuid>.<ext>`

## RLS Summary

- `memorials`: public can select published rows; authenticated can manage all rows.
- `memories`: public can insert only for published memorials; public can select approved memories for published memorials; authenticated select/delete all.
- `condolences`: public denied; authenticated select/insert/delete all.
- `events`: public can select published rows for published memorials; authenticated can manage all rows.
- `event_private_details`: no public access; authenticated can manage all rows.
- `event_rsvps`: public can insert only for a published event on a published memorial with default admin fields; authenticated select/update/delete all.

## Out of Scope

- Per-memorial admin roles
- Unmoderated/all-memories public feed
- Email notifications
- Payment processing
- Custom domain
