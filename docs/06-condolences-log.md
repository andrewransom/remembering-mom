# Milestone 6: Private Condolences Log

## Goal

Build a private condolences log scoped to each memorial.

## Scope

- Authenticated `/<name-slug>/condolences` page.
- Add condolence form.
- Table/list view.
- Sort by date received or sender name.
- Delete entry.

## Form Fields

- `from_name` required.
- `date_received` optional date.
- `message` required textarea.

## List Behavior

Default sort:

- `coalesce(date_received, created_at::date) desc, created_at desc`

Each row shows sender, date received, message, and delete control.

## Acceptance Checks

- Unauthenticated users are redirected to `/login`.
- Authenticated users can add/delete condolences for a memorial.
- Condolences are scoped by `memorial_id`.
- Sorting by date and name works.
- No condolence data is visible to public visitors.
- RLS enforces private access.

## Not Included

- Editing condolence entries.
- CSV export.
