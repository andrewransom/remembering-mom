alter table public.memorials
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists display_name text;

update public.memorials
set
  first_name = coalesce(first_name, nullif(split_part(person_name, ' ', 1), '')),
  last_name = coalesce(
    last_name,
    nullif(btrim(regexp_replace(person_name, '^\S+\s*', '')), '')
  ),
  display_name = coalesce(display_name, nullif(split_part(person_name, ' ', 1), '')),
  full_name = coalesce(full_name, person_name);

drop policy if exists profile_write_authenticated on storage.objects;
drop policy if exists profile_secondary_write_authenticated on storage.objects;

create policy profile_write_authenticated
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'profile'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/main\.(webp|jpg|jpeg|png)$'
  )
  with check (
    bucket_id = 'profile'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/main\.(webp|jpg|jpeg|png)$'
  );

create policy profile_secondary_write_authenticated
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'profile'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/secondary\.(webp|jpg|jpeg|png)$'
  )
  with check (
    bucket_id = 'profile'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/secondary\.(webp|jpg|jpeg|png)$'
  );
