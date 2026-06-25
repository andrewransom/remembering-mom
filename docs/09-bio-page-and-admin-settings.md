# Milestone 9: Bio/About Page and Admin Settings

## Goal

Two related features:

1. **Bio/About page** — a new `/[slug]/about` route with a full-name heading, a life-story bio, and a secondary photo floated into the text. A "Read about [name]" button on the homepage links to it.
2. **Admin Settings page** — a new `/[slug]/admin/settings` route where an authenticated user can edit all memorial fields, including the new bio fields, with drag-and-drop photo uploads.

## Decisions

| Question | Answer |
|---|---|
| `full_name` vs `person_name` | Keep `person_name` (homepage, short/warm). Add `full_name` for bio page; falls back to `person_name` if null. |
| `bio` vs `tribute_paragraphs` | `tribute_paragraphs` stays for homepage. New `bio` (single `text` field) for the about page. |
| Photo upload UX | Drag-and-drop file upload zone; uploads to Supabase Storage; saves path to DB. |
| Bio page layout | Large heading, secondary photo floated right with text wrapping (CSS `float: right`), bio text below. |
| About page route | `/[slug]/about` |
| Admin settings route | `/[slug]/admin/settings` |
| Admin scope | New standalone page; existing `/admin/memories` untouched. |

## Steps

### 1. Database migration — add bio fields

Create a new migration that adds three nullable columns to the `memorials` table and a new storage policy for the secondary photo path:

```sql
alter table public.memorials
  add column if not exists full_name text,
  add column if not exists bio text,
  add column if not exists secondary_photo_path text;
```

The existing `memorials_manage_authenticated` policy (`for all`) already covers UPDATE for authenticated users — no additional RLS policy is needed on the table.

The `profile` storage bucket is used for memorial photos. Its existing write policy locks uploads to the path pattern `^[uuid]/main\.webp$` (the profile photo). The secondary photo needs a new permitted path that supports both insert (first upload) and update (replacement). Add a storage policy using `for all` to cover both:

```sql
create policy "profile_secondary_write_authenticated"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'profile'
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/secondary\.webp$'
)
with check (
  bucket_id = 'profile'
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/secondary\.webp$'
);
```

The UUID regex matches the strict format used by the existing profile policy. Using `for all` (with both `using` and `with check`) ensures replacements succeed without needing a separate update policy.

Also add a trigger to keep `updated_at` current automatically (it is not currently auto-maintained by a trigger):

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memorials_set_updated_at on public.memorials;
create trigger memorials_set_updated_at
before update on public.memorials
for each row execute function public.set_updated_at();
```

Apply via `supabase migration new 09_bio_fields` then `supabase db push`, or via the Supabase MCP `apply_migration` tool.

### 2. Update TypeScript types

There is no `supabase gen types` script in `package.json`. After running `supabase db push`, you can regenerate types with:

```bash
supabase gen types typescript --local > src/lib/supabase/types.ts
```

Then restore the manually-defined `DonationLink` type at the top of the file (the generator does not produce it). Alternatively, edit `src/lib/supabase/types.ts` manually and add the three new fields to the `memorials` Row, Insert, and Update types:

```ts
// in Row:
full_name: string | null;
bio: string | null;
secondary_photo_path: string | null;

// in Insert (all optional):
full_name?: string | null;
bio?: string | null;
secondary_photo_path?: string | null;

// in Update (all optional):
full_name?: string | null;
bio?: string | null;
secondary_photo_path?: string | null;
```

**Important:** Until types are updated, TypeScript will not catch that the select strings are missing the new fields — the values will silently be `undefined` at runtime. Update types before implementing Steps 3–6.

### 3. Update query functions

All three query functions in `src/lib/supabase/memorials.ts` use explicit field lists (not `select("*")`). Add `full_name`, `bio`, and `secondary_photo_path` to the select string in all three:

- `getPublishedMemorialBySlug`
- `getMemorialBySlugAdmin`
- `listPublishedMemorials` — used on the homepage index; keep it consistent even though the new fields are not rendered there yet.

This is a required change, not optional. Without it the new fields will be `undefined` at runtime despite the correct TypeScript types.

No new query functions are needed for the bio page — it reuses `getPublishedMemorialBySlug`.

### 4. Bio/About page — `/[slug]/about`

Create `src/app/[memorialSlug]/about/page.tsx` as a server component.

**Data fetching:**
- Call `getPublishedMemorialBySlug(client, slug)`. If null, `notFound()`.

**Layout:**
- Full-name heading: `memorial.full_name ?? memorial.person_name`, large serif heading matching the homepage style.
- Dates line (birth – death), styled consistently with the homepage.
- Secondary photo: if `secondary_photo_path` is set, render an `<img>` with `float: right` and a left/bottom margin so text wraps naturally. Use a `getPublicUrl` call on the `profile` storage bucket following the same pattern as `buildProfilePhotoPublicUrl` in `src/lib/supabase/storage.ts`. Append `?v=${encodeURIComponent(memorial.updated_at)}` to the URL to bust browser/CDN cache after replacements. Apply the same `?v=` suffix to the `profile_photo_path` public URL on the homepage and settings preview for the same reason.
- Bio text: split `memorial.bio` on `\n\n` and render each segment as a `<p>` tag. This produces correct paragraph semantics for screen readers and natural spacing. If `bio` is null or empty, render a tasteful fallback message ("No bio has been added yet.") — in practice this state should only be visible if someone navigates to the URL before a bio is written.
- A back link (`← Back`) to `/${slug}` at the top.

**Mobile:** `float: right` drops naturally on small screens — add a media query to clear the float and stack the photo above the bio below a breakpoint (e.g. `sm`).

### 5. Homepage "Read about" button

In `src/app/[memorialSlug]/page.tsx`, add a "Read about [person_name]" button beside the existing "Share a Memory" button.

- Style: outlined/ghost variant, matching the screenshot (teal border, teal text, rounded-full or rounded-xl to match).
- Placement: to the left of "Share a Memory" (the screenshot shows it as the secondary action).
- Link: `/${slug}/about`.
- Only render the button if `memorial.bio?.trim()` is truthy (guards against both `null` and empty-string bio — see Step 6d for coercion on save).

The two buttons should sit in a flex row, wrapping on very small screens.

### 6. Admin settings page

#### 6a. Server page — `src/app/[memorialSlug]/admin/settings/page.tsx`

- Call `requireAuthenticatedUser()` (same pattern as `/admin/memories`).
- Fetch the memorial via `getMemorialBySlugAdmin`.
- Render a `<SettingsForm>` client component, passing the full memorial row as props.
- Add a nav link back to `/[slug]/admin/memories` so the two admin pages are linked.

**Authorization note:** The existing RLS policy (`memorials_manage_authenticated`) allows any authenticated Supabase user to edit any memorial. This is acceptable for a single-owner private app. To preserve this guarantee, ensure Supabase email signup remains disabled (invite-only). If a second user is ever admitted, per-memorial ownership checks will need to be added before exposing this page.

#### 6b. Client form — `src/app/[memorialSlug]/admin/settings/settings-form.tsx`

A `"use client"` component. Fields, in logical order:

**Identity**
- `person_name` — text input (required, used throughout the site)
- `full_name` — text input (optional, bio page only; placeholder: "e.g. Jennifer Ann Ransom")
- `birth_date` — text input (free-form text, matches existing DB type)
- `death_date` — text input (free-form text)
- `is_published` — toggle/checkbox

**Photos**
- `profile_photo_path` — drag-and-drop upload zone (see §6c). Shows current photo preview if set.
- `secondary_photo_path` — drag-and-drop upload zone. Shows current photo preview if set.

**Content**
- `tribute_paragraphs` — a dynamic list of textareas, one per paragraph. Add/remove paragraph buttons. Each textarea maps to one entry in the array.
- `bio` — a single large textarea (the about-page life story).

**Donation links**

Manage as `useState<DonationLink[]>`, initialized from `memorial.donation_links`. Each `DonationLink` has a `link` object and a `details` array. Render:
- One card per top-level donation link. Each card has:
  - `link.name` — text input
  - `link.url` — text input
  - A nested list of `details[]` items, each with `name`, `description`, `info_link` inputs.
  - "Add charity detail" button appends `{ name: "", description: "", info_link: null }` to that link's `details` array.
  - "Remove detail" button per detail row.
- "Add donation link" button appends `{ link: { name: "", url: "" }, details: [] }` to the top-level array.
- "Remove link" button per card.

Serialize the full `DonationLink[]` array directly as JSON in the server action — pass `links: JSON.stringify(donationLinks)` and parse it in the action. Empty `link.url` values should be stripped before saving.

**Form UX requirements:**
- **Pending state:** disable the Save button and show a loading indicator while the action is in flight. Prevent double-submit.
- **Error preservation:** if the server action returns an error, display it inline and keep all form values intact (do not reset the form).
- **Destructive confirmation:** "Remove paragraph", "Remove link", and "Remove detail" buttons all require a confirmation step (e.g., the button changes to "Confirm remove?" on first click, executes on second click within 3 seconds, then resets). This prevents accidental deletion of content at any level of the form.
- **Save scope:** the Save button covers all text/content fields. Photo uploads save immediately on drop (see §6c) and are outside the Save button's scope. Make this clear in the UI (e.g., label photo zones as "Saved automatically on upload").

On save, call the `updateMemorialSettingsAction` server action. Show a success/error inline message on completion.

#### 6c. Photo upload pattern

Both photo fields use the `profile` Supabase Storage bucket. Both require WebP format (consistent with the existing `main.webp` convention, and guarantees fixed paths so replacements always overwrite the same file):
- `profile_photo_path` → `{memorialId}/main.webp`
- `secondary_photo_path` → `{memorialId}/secondary.webp`

**Upload validation (both photo types):**
- Validate by MIME type (`image/webp`), not file extension — reject with 400 if `file.type !== "image/webp"`.
- Enforce a 5 MB size limit — reject with 400 if `file.size > 5_242_880`.
- Return `{ error: "Photo must be a WebP image under 5 MB" }` for either failure.

Create `src/app/api/upload-memorial-photo/route.ts` as an authenticated `POST` handler that:
1. Reads the session via `getAuthenticatedUser()` (not `requireAuthenticatedUser()` — API routes must return JSON, not redirect). Return `{ error: "Unauthorized" }` with status 401 if no session.
2. Accepts `multipart/form-data` with the file, `memorialSlug`, and `photoType` (`"profile"` or `"secondary"`).
3. Validates MIME type and file size as above.
4. Fetches the memorial via `getMemorialBySlugAdmin(slug)` to obtain `memorial.id`. Returns `{ error: "Not found" }` with status 404 if absent.
5. Records whether the memorial already has a path for the photo type being uploaded (`hadExistingPath = memorial.profile_photo_path !== null` or equivalent).
6. Uploads to the `profile` bucket at the correct path using `upsert: true` (overwrites prior file).
7. **On storage upload failure:** return `{ error }` immediately — no DB update.
8. **On storage upload success but DB update failure:**
   - If `hadExistingPath` is **false** (new upload, no prior file): delete the uploaded object from storage to roll back cleanly.
   - If `hadExistingPath` is **true** (replacement): do **not** delete — the old file was already overwritten and cannot be restored. Log the error server-side and return `{ error }`. Storage will reflect the new content; the DB will still point to the same path (which resolves to the new content), so divergence is minimal.
9. On full success: calls `revalidatePath` for `/${slug}` and `/${slug}/about`, returns `{ path, publicUrl: publicUrl + "?v=" + Date.now() }` — the timestamp suffix busts the browser cache in the admin preview immediately after upload.

The main settings form action does **not** include `profile_photo_path` or `secondary_photo_path` in its payload — those fields are managed exclusively by this route.

The drag-and-drop zone shows a loading state during upload and updates the preview with `publicUrl` on success. On error, it shows an inline error message and does not change the existing preview.

#### 6d. Server action — `src/app/[memorialSlug]/admin/settings/actions.ts`

```ts
"use server";

export async function updateMemorialSettingsAction(
  slug: string,
  data: MemorialUpdatePayload,
): Promise<{ error?: string }>;
```

- Calls `requireAuthenticatedUser()`.
- Validates required fields (`person_name` non-empty, valid slug pattern preserved).
- Coerces empty strings to `null` before saving: `full_name`, `bio`, `birth_date`, `death_date` should all use `value?.trim() || null`. This prevents empty-string values triggering the "Read about" button on the homepage.
- Validates `tribute_paragraphs`: must be an array of strings; filter out blank entries (`item.trim() !== ""`); default to `[]` if absent.
- Validates `donation_links`: parse from JSON string; if parsing throws, return `{ error: "Invalid donation links" }`. After parsing, silently filter out entries where `link.url` is empty or whitespace-only (no error — partial saves are acceptable for the admin settings context). For remaining entries, validate each `link.url` with the `URL` constructor; return `{ error: "Donation link URL is invalid: {url}" }` if any URL is malformed. Filter out `details` items where both `name` and `description` are empty.
- **Does not include `profile_photo_path` or `secondary_photo_path`** in its payload — those are managed atomically by the upload route (see §6c).
- Updates the `memorials` row via the admin Supabase client.
- Calls `revalidatePath` for all three affected paths after a successful update:
  - `revalidatePath(\`/${slug}\`)`
  - `revalidatePath(\`/${slug}/about\`)`
  - `revalidatePath(\`/${slug}/admin/settings\`)` — so the form reflects saved state immediately.
- Returns `{ error }` on failure for the form to display.

`MemorialUpdatePayload` covers: `person_name`, `full_name`, `birth_date`, `death_date`, `bio`, `tribute_paragraphs`, `donation_links`, `is_published`. Photo paths are excluded (managed by the upload route).

### 7. Admin layout — shared nav

Create `src/app/[memorialSlug]/admin/layout.tsx`. This layout wraps both `/admin/memories` and `/admin/settings` automatically — no changes needed to the existing memories page.

The layout renders a simple tab nav above the page content:

```
[ Memories ] [ Settings ]
```

Use `usePathname()` (in a `"use client"` sub-component if needed) to highlight the active tab. This prevents the two admin pages from being isolated dead-ends and is the correct Next.js pattern for shared admin chrome.

### 8. Docs update

Update `docs/requirements.md`:
- Under **Pages**, add: `/[slug]/about — Bio/about page with full name, photo, and life story.`
- Under **Pages**, add: `/[slug]/admin/settings — Authenticated admin page for editing all memorial fields.`
- Under **Memorial fields**, add the three new columns with their purpose.

## Acceptance Checks

- [ ] `supabase db push` applies cleanly with the three new columns.
- [ ] `/[slug]/about` renders with full name heading, floated secondary photo (if set), and bio text.
- [ ] `/[slug]/about` falls back to `person_name` when `full_name` is null.
- [ ] Navigating to `/[slug]/about` when `bio` is null or empty shows a graceful fallback message rather than a blank or broken page.
- [ ] "Read about [name]" button appears on the homepage only when `bio` is non-empty (null and empty-string both suppress it).
- [ ] "Read about [name]" button links to `/[slug]/about`.
- [ ] Button placement and style match the attached screenshot (outlined, beside "Share a Memory").
- [ ] `/[slug]/admin/settings` is protected — unauthenticated access redirects to `/login`.
- [ ] All fields on the settings form save correctly and the page reflects updates after save.
- [ ] Drag-and-drop upload zones accept files, upload to storage, immediately update the DB, and update the photo preview without a page reload.
- [ ] Both photo uploads reject non-WebP MIME types and files over 5 MB with a user-facing error message.
- [ ] Replacing a secondary photo succeeds — the new WebP overwrites `secondary.webp` at the same path; the new image is visible immediately in the admin preview and on the public pages.
- [ ] If the DB update fails on a new (first-time) photo upload, the uploaded file is deleted from storage (clean rollback).
- [ ] If the DB update fails on a photo replacement, no storage deletion is attempted; the error is logged server-side.
- [ ] Photo public URLs include a `?v=` cache-busting suffix derived from `memorial.updated_at`; replacing a photo updates `updated_at` and changes the suffix.
- [ ] Upload route returns `{ error }` JSON with status 401 when called without an authenticated session (no redirect).
- [ ] Save button is disabled during submission; re-enabled on completion.
- [ ] A save error displays inline and preserves all form field values.
- [ ] "Remove paragraph", "Remove link", and "Remove detail" buttons all require a two-click confirmation before executing.
- [ ] Donation links with empty URLs are silently stripped on save; malformed (non-parseable) URLs return a clear error message.
- [ ] Donation links with completely empty `link.url` are removed without an error on save.
- [ ] `revalidatePath` causes `/${slug}`, `/${slug}/about`, and `/${slug}/admin/settings` to reflect updates immediately after save.
- [ ] `tribute_paragraphs` dynamic list adds and removes paragraphs correctly.
- [ ] Donation links dynamic list adds, removes, and saves complex nested structure correctly.
- [ ] Nav between `/admin/memories` and `/admin/settings` works in both directions.
- [ ] `npm run lint` passes.
- [ ] `npm run build` completes successfully.

## Not Included

- Per-field save (all fields save together via one action).
- Image cropping or focal-point adjustment (photo is uploaded and displayed as-is).
- Slug editing (changing the slug would break existing links — out of scope).
- Multiple bios or bio versioning.
- Public visibility toggle per bio field. The `/[slug]/about` route is always accessible for published memorials; it shows a graceful fallback message when `bio` is null or empty. Only the homepage "Read about" button is conditionally hidden.
