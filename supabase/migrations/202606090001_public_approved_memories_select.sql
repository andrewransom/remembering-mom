drop policy if exists memories_select_public_approved_published on public.memories;

create policy memories_select_public_approved_published
  on public.memories
  for select
  to anon
  using (
    is_approved = true
    and exists (
      select 1
      from public.memorials
      where memorials.id = memories.memorial_id
        and memorials.is_published = true
    )
  );
