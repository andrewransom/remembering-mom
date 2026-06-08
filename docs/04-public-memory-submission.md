# Milestone 4: Public Memory Submission

## Goal

Allow visitors to submit a memory and optional photo for a specific memorial, then show a private preview of only that submission.

## Scope

- Public `/<name-slug>/memories` submission form.
- Server-side honeypot handling.
- Optional single-image upload.
- Insert into `memories` with `memorial_id`.
- Redirect to `/<name-slug>/memories/thank-you`.
- Thank-you page displays only the submitted memory when the signed cookie matches the same memorial.

## Preview Strategy

Signed HTTP-only cookie contains:

- memory ID
- memorial ID
- memorial slug
- expiry

The thank-you page validates the cookie and fetches only that memory for that memorial using the server-only Supabase client.

## Upload Handling

- Validate MIME and size server-side.
- Store memory photos at `<memorial-id>/<uuid>.<ext>` in the `memories` bucket.
- Delete uploaded object if DB insert fails.

## Acceptance Checks

- Visitor can submit to `/<name-slug>/memories` without login.
- Submission is tied to the correct memorial.
- Thank-you preview cannot show another memorial's memory.
- Public users cannot browse all memories.
- Direct anonymous storage upload is not allowed.

## Not Included

- Editing submitted memories.
- Public memory feed.
