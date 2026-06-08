# Milestone 5: Admin Auth and Memory Moderation

## Goal

Let manually created admins sign in, view submitted memories for a selected memorial, and delete inappropriate or duplicate entries.

## Scope

- Global `/login` email/password form.
- Supabase session handling.
- Auth-aware navigation.
- Private `/<name-slug>/admin/memories` feed.
- Delete action for memories and photos.

## Auth Rules

- No public self-registration.
- Any authenticated user is admin for all memorials in v1.
- Unauthenticated access to private routes redirects to `/login`.

## Routes

- `/login`
- `/<name-slug>/admin/memories`

## Acceptance Checks

- Invalid login shows an error.
- Valid login redirects to `/`.
- Sign out clears the session.
- Unauthenticated users cannot access `/<name-slug>/admin/memories`.
- Authenticated users can view/delete memories for the chosen memorial.
- Deletion removes associated photos when present.

## Not Included

- Role hierarchy.
- Password reset.
- Memory editing.
