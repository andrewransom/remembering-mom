alter table public.memories
  add column if not exists photo_paths text[] not null default '{}';

update public.memories
set photo_paths = array[photo_path]
where photo_path is not null
  and photo_paths = '{}';
