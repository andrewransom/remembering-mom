# Milestone 2: Supabase Data, Auth, and Storage

## Goal

Create Supabase backing services for multiple memorials, scoped memories, scoped condolences, admin login, and photo storage.

## Scope

- `memorials`, `memories`, and `condolences` tables.
- RLS policies for public published memorial reads, public memory inserts, and authenticated admin access.
- Storage buckets and policies.
- Supabase setup docs.
- Public signup disabled.

## Data Model

### `memorials`

- `id uuid primary key default gen_random_uuid()`
- `slug text unique not null`
- `person_name text not null`
- `birth_date text null`
- `death_date text null`
- `tribute_paragraphs text[] not null default '{}'`
- `donation_links jsonb not null default '[]'`
- `profile_photo_path text null`
- `is_published boolean not null default true`
- timestamps

### `memories`

- `memorial_id uuid not null references memorials(id) on delete cascade`
- `author_name text not null`
- `message text not null`
- `photo_path text null`
- `created_at timestamptz not null default now()`

### `condolences`

- `memorial_id uuid not null references memorials(id) on delete cascade`
- `from_name text not null`
- `date_received date null`
- `message text not null`
- `created_at timestamptz not null default now()`

## RLS Policy Plan

- `memorials`: public select only when `is_published = true`; authenticated users can manage all.
- `memories`: public insert only for published memorials; public select denied; authenticated select/delete all.
- `condolences`: public access denied; authenticated select/insert/delete all.

## Storage Plan

- `profile` bucket public read, authenticated write only at `<memorial-id>/main.webp`.
- `memories` bucket public read, no public direct write, app-mediated uploads at `<memorial-id>/<uuid>.<ext>`.
- Supported image types: JPEG, PNG, WebP.
- Max memory image size: 10 MB.

## Acceptance Checks

- Migrations apply to a fresh Supabase project.
- Public users can select published memorials.
- Public users cannot select memories or condolences.
- Public users can insert memories for published memorials only.
- Authenticated users can manage memorial records and private logs.
- Direct anonymous storage upload is not broadly allowed.

## Not Included

- Per-memorial admin access table.
- Admin UI for creating memorials unless added later.
