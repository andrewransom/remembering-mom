insert into storage.buckets (
  id,
  name,
  public,
  allowed_mime_types,
  file_size_limit,
  avif_autodetection
)
values (
  'profile',
  'profile',
  true,
  array['image/webp', 'image/png', 'image/jpeg'],
  8388608,
  false
)
on conflict (id) do update
set
  public = excluded.public,
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit = excluded.file_size_limit,
  avif_autodetection = excluded.avif_autodetection;

insert into storage.buckets (
  id,
  name,
  public,
  allowed_mime_types,
  file_size_limit,
  avif_autodetection
)
values (
  'memories',
  'memories',
  true,
  array['image/webp', 'image/png', 'image/jpeg'],
  10485760,
  false
)
on conflict (id) do update
set
  public = excluded.public,
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit = excluded.file_size_limit,
  avif_autodetection = excluded.avif_autodetection;

drop policy if exists profile_read_public on storage.objects;
drop policy if exists profile_write_authenticated on storage.objects;

drop policy if exists memories_read_public on storage.objects;
drop policy if exists memories_manage_authenticated on storage.objects;
drop policy if exists memories_auth_upload on storage.objects;
drop policy if exists memories_auth_delete on storage.objects;
drop policy if exists memories_upload_all on storage.objects;

create policy profile_read_public
  on storage.objects
  for select
  to public
  using (bucket_id = 'profile');

create policy profile_write_authenticated
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'profile'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/main\\.webp$'
  )
  with check (
    bucket_id = 'profile'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/main\\.webp$'
  );

create policy memories_read_public
  on storage.objects
  for select
  to public
  using (bucket_id = 'memories');
