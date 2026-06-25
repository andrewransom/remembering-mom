alter table public.events
add column map_link text check (map_link is null or char_length(map_link) <= 2000);
