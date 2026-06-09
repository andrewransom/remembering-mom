# Milestone 8: Approved Memories on the Memorial Homepage

## Goal

Display approved memories on the public memorial landing page (`/<slug>`), below the "In lieu of flowers" section. Memories are read-only — no approve, edit, or delete controls are shown. Clicking a photo opens a navigable lightbox scoped to that memory's photos.

## Decisions

| Question | Answer |
|---|---|
| Data access | New RLS SELECT policy (least-privilege) |
| Sort order | Oldest first (chronological guestbook feel) |
| Empty state | Hide the section entirely when no approved memories exist |
| Lightbox scope | Within one memory's photos only (same as admin page) |

## Steps

### 1. Database migration — new RLS SELECT policy

Add a Supabase migration that allows anonymous users to SELECT approved memories for published memorials.

```sql
drop policy if exists memories_select_public_approved_published on public.memories;

create policy memories_select_public_approved_published
on public.memories
for select
to anon
using (
  is_approved = true
  and exists (
    select 1 from public.memorials
    where memorials.id = memories.memorial_id
      and memorials.is_published = true
  )
);
```

Apply via `supabase migration new` and `supabase db push` (or the Supabase MCP `apply_migration` tool). No schema changes — only a new RLS policy.

### 2. New query function — `listApprovedMemoriesForPublic`

Add to `src/lib/supabase/memories.ts`:

```ts
export const listApprovedMemoriesForPublic = (
  client: SupabaseClient<Database>,
  memorialId: string,
) => {
  return client
    .from("memories")
    .select("id, memorial_id, author_name, message, photo_path, photo_paths, created_at")
    .eq("memorial_id", memorialId)
    .eq("is_approved", true)
    .order("created_at", { ascending: true })
    .limit(100)
    .returns<Pick<MemoryRow, "id" | "memorial_id" | "author_name" | "message" | "photo_path" | "photo_paths" | "created_at">[]>();
};
```

Notes:
- `is_approved` is intentionally excluded from the SELECT list — it's not needed in the public view and keeps the response minimal.
- The `limit(100)` cap is a conservative v1 default. Without it, all approved memories (text + photo URLs) are serialized into the page HTML on every request. For a family memorial this limit is unlikely to be reached in practice, but avoiding an unbounded query is the safer default. Pagination is explicitly out of scope for this milestone.

This uses the standard anon server client (not the admin client). The new RLS policy makes the rows accessible; `buildMemoryPhotoPublicUrl` already uses `getPublicUrl` and needs no auth.

### 3. New client component — `PublicMemoriesSection`

Create `src/app/[memorialSlug]/public-memories-section.tsx`.

This is a `"use client"` component. It receives a pre-built list of memories (with photo URLs already resolved server-side) and renders:

- A `<section>` styled consistently with the charity section (`mt-10 rounded-3xl border border-border/80 bg-card/80 p-6`). The `mt-10` matches the top margin on the existing donation section in `page.tsx:117`.
- An `<h2>` heading matching the charity section heading style (`text-2xl font-semibold`), text `"Memories of {memorialName}"`.
- A `<ul>` of memory cards, each showing:
  - Author name (`text-sm font-medium`)
  - Date formatted with `Intl.DateTimeFormat` (`text-xs text-muted-foreground`)
  - Message (`whitespace-pre-wrap`)
  - Optional photo grid (same `grid gap-3 sm:grid-cols-2` layout as the admin list)
- No approve badge, no approve/edit/delete controls.
- A `<dialog>`-based lightbox for photo full-view, with prev/next buttons and keyboard arrow support — same implementation as in `admin-memories-client.tsx`, scoped to the clicked memory's `photoUrls`.

The component accepts:
```ts
type PublicMemoriesSectionProps = {
  memorialName: string;
  memories: {
    id: string;
    author_name: string;
    message: string;
    photoUrls: string[];
    created_at: string;
  }[];
};
```

### 4. Update the memorial homepage — `page.tsx`

In `src/app/[memorialSlug]/page.tsx`:

1. Call `listApprovedMemoriesForPublic(client, memorial.id)` alongside the existing memorial fetch (both can share the cached `getMemorial` result — use the client returned from it).
2. Map the rows to `{ id, author_name, message, photoUrls, created_at }` using the same `toClientRows`-style transformation as the admin page (deduplicating `photo_path` + `photo_paths`, building public URLs).
3. Render `<PublicMemoriesSection>` after the charity `<section>`, inside the existing `<article>`. Pass `memorialName` and the mapped memories array.
4. If the array is empty, do not render `<PublicMemoriesSection>` (the component need not handle this itself — the guard is in the server component).
5. **Error handling:** if `listApprovedMemoriesForPublic` returns an error, log it server-side (`console.error`) and treat the result as an empty array — the memorial page renders normally without a memories section. Do not surface a public error message; a missing section is less alarming to visitors than a broken page, and the deployment logs will capture the failure.

### 5. Revalidate the homepage from admin actions

In `src/app/[memorialSlug]/admin/memories/actions.ts`, add `revalidatePath(\`/\${memorialSlug}\`)` alongside the existing `revalidatePath(\`/\${memorialSlug}/admin/memories\`)` call in all three actions:

- `updateMemoryApprovalAction` — approval or unapproval directly changes which memories appear publicly.
- `updateMemoryAction` — an edited memory's updated text/name should be visible immediately.
- `deleteMemoryAction` — a deleted approved memory must disappear from the public page.

### 6. Docs update

Update `docs/requirements.md`:

- Under **Access Control**, replace *"Public visitors cannot browse submitted memories"* with language reflecting that visitors can view approved memories but not unmoderated/unapproved ones.
- Under **Pages / Memorial landing page**, add: *Approved memories (read-only), displayed below the donation section.*
- Under **RLS Summary / memories**, update to: *public can insert only for published memorials; public can select approved memories for published memorials; authenticated select/delete all.*
- Under **Out of Scope**, narrow *"Public memory feed"* to *"Unmoderated/all-memories public feed"* — a curated approved feed is now in scope.

Update `docs/supabase-setup.md` section 7 (**Verify RLS behavior**):

- Change `memories: cannot select` to `memories: can select approved memories for published memorials`.

## Acceptance Checks

- [ ] A published memorial with at least one approved memory shows the "Memories of {name}" section below the charity card.
- [ ] A published memorial with zero approved memories shows no memories section.
- [ ] Memory cards show author, date, message, and photos — no approve/edit/delete icons.
- [ ] Clicking a photo opens the lightbox; prev/next and arrow keys navigate within that memory's photos; Escape and clicking the backdrop close it.
- [ ] A memorial with only unapproved memories shows no section (RLS enforces this on the server).
- [ ] The admin moderation page is unaffected.
- [ ] Approving a memory in the admin view causes it to appear on the public `/<slug>` page.
- [ ] Unapproving an approved memory removes it from the public page.
- [ ] Editing an approved memory's text or name updates the public page.
- [ ] Deleting an approved memory removes it from the public page.
- [ ] `npm run lint` passes with no new errors.
- [ ] `npm run build` completes successfully.

## Not Included

- Pagination or lazy-loading of memories (all approved memories are fetched and rendered).
- A public permalink for individual memories.
- Sorting controls for visitors.
