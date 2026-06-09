# Supabase Setup Guide

## 1) Create/link a Supabase project

1. Create a Supabase project.
2. Copy keys from **Settings -> API**:
   - Project URL
   - anon public key
   - service_role key
3. Add local env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PREVIEW_COOKIE_SECRET`
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3076`

## 2) Disable public signups

1. Open **Authentication -> Settings**.
2. Ensure email/password auth is enabled.
3. Turn public signups off.
4. For simplest v1 setup, disable email confirmation or manually confirm the admin email.

## 3) Create one admin account

1. Open **Authentication -> Users**.
2. Invite or create an admin user manually.
3. Any authenticated user is an admin for all memorials in v1.

## 4) Apply SQL migrations

Run the migrations in this repo, preferably with Supabase CLI:

```bash
npx supabase db push
```

Or run these SQL files in order:

1. `supabase/migrations/202606060001_memory_and_condolence_tables.sql`
2. `supabase/migrations/202606060002_storage_buckets_and_policies.sql`
3. `supabase/migrations/202606060003_add_condolence_source.sql`
4. `supabase/migrations/202606070001_add_memory_photo_paths.sql`
5. `supabase/migrations/202606070002_add_memory_approval.sql`
6. `supabase/migrations/202606090001_public_approved_memories_select.sql`

They create:

- `memorials`
- `memories`
- `condolences`
- RLS policies
- `profile` and `memories` storage buckets
- Storage object policies

## 5) Create the first memorial

Until an admin creation UI exists, create memorial rows manually in SQL Editor.

Example:

```sql
insert into public.memorials (
  slug,
  person_name,
  birth_date,
  death_date,
  tribute_paragraphs,
  donation_links,
  is_published
)
values (
  'jane-doe',
  'Jane Doe',
  'January 1, 1940',
  'June 1, 2026',
  array[
    'Add the first tribute paragraph here.',
    'Add another short remembrance paragraph here.'
  ],
  '[{"organizationName":"Example Charity","description":"Short donation description.","url":"https://example.com"}]'::jsonb,
  true
);
```

## 6) Storage paths

- `profile` bucket:
  - public read
  - authenticated write
  - profile image object path: `<memorial-id>/main.webp`
- `memories` bucket:
  - public read by direct URL
  - no public direct writes
  - app uploads memory photos to `<memorial-id>/<uuid>.<ext>`

To upload a profile image manually:

1. Find the memorial `id` from the `memorials` table.
2. Upload the file to the `profile` bucket.
3. Object path must be `<memorial-id>/main.webp`.
4. Optionally set `memorials.profile_photo_path` to that path. If blank, the app uses the default path.

## 7) Verify RLS behavior

Signed out:

- `memorials`: can select published rows only
- `memories`: can insert for published memorials
- `memories`: can select approved memories for published memorials
- `condolences`: no access

Signed in:

- `memorials`: manage all
- `memories`: select/delete all
- `condolences`: select/insert/delete all

## 8) Auth URLs

Local hosted-project Auth settings:

- Site URL: `http://localhost:3076`
- Redirect URL: `http://localhost:3076/**`

Before smoke-testing login on the AWS deployment, add the production redirect URL:

- Site URL: `https://remember.ketseba.com`
- Redirect URL: `https://remember.ketseba.com/**`

Keep any previous production redirect URL until the AWS smoke tests pass, then remove it.

## 9) AWS/SST env vars

Configure production values as SST secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PREVIEW_COOKIE_SECRET`

`NEXT_PUBLIC_SITE_URL` is set in `sst.config.ts` for production.

## 10) Local commands

```bash
npm run dev
```

Local app URL:

```txt
http://localhost:3076
```
