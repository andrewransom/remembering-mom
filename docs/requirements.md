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
- `/<name-slug>/memories` — public memory submission
- `/<name-slug>/memories/thank-you` — private thank-you preview for the submitter's latest memory
- `/<name-slug>/condolences` — authenticated condolences log
- `/<name-slug>/admin/memories` — authenticated memory moderation
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

### Memory submission (`/<name-slug>/memories`)

Public form:

- Name required
- Message required, max about 2000 chars
- Optional single image upload
- Honeypot field

After submission, redirect to `/<name-slug>/memories/thank-you` with a signed, short-lived, HTTP-only preview cookie containing memory ID, memorial ID, slug, and expiry.

### Admin memory moderation (`/<name-slug>/admin/memories`)

Authenticated. Shows newest memories for that memorial only and supports hard delete. Deleting a memory also removes its associated photo when present.

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
| birth_date | text | nullable display text |
| death_date | text | nullable display text |
| tribute_paragraphs | text[] | landing content |
| donation_links | jsonb | array of organization/link objects |
| profile_photo_path | text | nullable storage object path, default app path is `<memorial-id>/main.webp` |
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

## Storage

- `profile` bucket: public read, authenticated write only, profile path `<memorial-id>/main.webp`
- `memories` bucket: public read by direct URL, no anonymous direct writes, app-mediated uploads at `<memorial-id>/<uuid>.<ext>`

## RLS Summary

- `memorials`: public can select published rows; authenticated can manage all rows.
- `memories`: public can insert only for published memorials; public can select approved memories for published memorials; authenticated select/delete all.
- `condolences`: public denied; authenticated select/insert/delete all.

## Out of Scope

- Per-memorial admin roles
- Unmoderated/all-memories public feed
- Email notifications
- Payment processing
- Custom domain
