alter table public.condolences
  add column if not exists source text check (
    source is null or char_length(trim(source)) between 1 and 200
  );
