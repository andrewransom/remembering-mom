# Milestone 3: Memorial Landing Pages

## Goal

Build public memorial landing pages at `/<name-slug>` and a root index at `/`.

## Scope

- `/` lists published memorials.
- `/<name-slug>` renders a published memorial from Supabase.
- Render profile photo, name, dates, tribute text, and donation links.
- Add metadata per memorial.

## Content Source

Landing content comes from `memorials`:

- `person_name`
- `birth_date`
- `death_date`
- `tribute_paragraphs`
- `donation_links`
- `profile_photo_path` or default `<memorial-id>/main.webp`

## Acceptance Checks

- `/` is public and lists published memorials.
- `/<name-slug>` is public for published memorials.
- Unknown or unpublished memorials do not render as public pages.
- Profile image has a fallback state.
- Donation links open externally.
- Metadata is scoped to the memorial.

## Not Included

- Admin content editor.
- Donation/payment integration.
