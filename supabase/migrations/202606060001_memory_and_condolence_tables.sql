create extension if not exists pgcrypto;

create table if not exists public.memorials (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 2 and 80
  ),
  person_name text not null check (
    char_length(trim(person_name)) between 1 and 200
  ),
  birth_date text,
  death_date text,
  tribute_paragraphs text[] not null default '{}',
  donation_links jsonb not null default '[]'::jsonb,
  profile_photo_path text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials(id) on delete cascade,
  author_name text not null check (
    char_length(trim(author_name)) between 1 and 200
  ),
  message text not null check (
    char_length(trim(message)) between 1 and 2000
  ),
  photo_path text,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.condolences (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials(id) on delete cascade,
  from_name text not null check (
    char_length(trim(from_name)) between 1 and 200
  ),
  source text check (
    source is null or char_length(trim(source)) between 1 and 200
  ),
  date_received date,
  message text not null check (
    char_length(trim(message)) between 1 and 5000
  ),
  created_at timestamptz not null default now()
);

create index if not exists memorials_slug_idx
  on public.memorials (slug);

create index if not exists memorials_published_slug_idx
  on public.memorials (is_published, slug);

create index if not exists memories_memorial_created_at_desc_idx
  on public.memories (memorial_id, created_at desc);

create index if not exists condolences_memorial_date_received_desc_idx
  on public.condolences (memorial_id, date_received desc nulls last, created_at desc);

create index if not exists condolences_memorial_from_name_idx
  on public.condolences (memorial_id, from_name);

alter table public.memorials enable row level security;
alter table public.memories enable row level security;
alter table public.condolences enable row level security;

drop policy if exists memorials_select_published on public.memorials;
drop policy if exists memorials_manage_authenticated on public.memorials;

drop policy if exists memories_insert_public_published_memorial on public.memories;
drop policy if exists memories_select_authenticated on public.memories;
drop policy if exists memories_delete_authenticated on public.memories;

drop policy if exists condolences_select_authenticated on public.condolences;
drop policy if exists condolences_insert_authenticated on public.condolences;
drop policy if exists condolences_delete_authenticated on public.condolences;

create policy memorials_select_published
  on public.memorials
  for select
  to anon
  using (is_published = true);

create policy memorials_manage_authenticated
  on public.memorials
  for all
  to authenticated
  using (true)
  with check (true);

create policy memories_insert_public_published_memorial
  on public.memories
  for insert
  to anon
  with check (
    exists (
      select 1
      from public.memorials
      where memorials.id = memories.memorial_id
        and memorials.is_published = true
    )
  );

create policy memories_select_authenticated
  on public.memories
  for select
  to authenticated
  using (true);

create policy memories_delete_authenticated
  on public.memories
  for delete
  to authenticated
  using (true);

create policy condolences_select_authenticated
  on public.condolences
  for select
  to authenticated
  using (true);

create policy condolences_insert_authenticated
  on public.condolences
  for insert
  to authenticated
  with check (true);

create policy condolences_delete_authenticated
  on public.condolences
  for delete
  to authenticated
  using (true);
