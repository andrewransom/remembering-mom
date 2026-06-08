alter table public.memories
  add column if not exists is_approved boolean not null default false;

drop policy if exists memories_insert_public_published_memorial on public.memories;
drop policy if exists memories_update_authenticated on public.memories;

create policy memories_insert_public_published_memorial
  on public.memories
  for insert
  to anon
  with check (
    is_approved = false
    and exists (
      select 1
      from public.memorials
      where memorials.id = memories.memorial_id
        and memorials.is_published = true
    )
  );

create policy memories_update_authenticated
  on public.memories
  for update
  to authenticated
  using (true)
  with check (true);

create index if not exists memories_memorial_approved_created_at_desc_idx
  on public.memories (memorial_id, is_approved, created_at desc);
