alter table public.memorials
  add column if not exists full_name text,
  add column if not exists bio text,
  add column if not exists secondary_photo_path text;

drop policy if exists profile_write_authenticated on storage.objects;
drop policy if exists profile_secondary_write_authenticated on storage.objects;

create policy profile_write_authenticated
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'profile'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/main\.webp$'
  )
  with check (
    bucket_id = 'profile'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/main\.webp$'
  );

create policy profile_secondary_write_authenticated
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
