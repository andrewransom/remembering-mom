create table public.events (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null unique references public.memorials(id) on delete cascade,
  event_title text check (event_title is null or char_length(trim(event_title)) between 1 and 200),
  event_description text check (event_description is null or char_length(event_description) <= 5000),
  event_date date,
  event_start_time time,
  event_end_time time,
  time_zone text check (
    time_zone is null or time_zone in (
      'America/New_York', 'America/Chicago', 'America/Denver',
      'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'UTC'
    )
  ),
  location text check (location is null or char_length(location) <= 2000),
  location_notes text check (location_notes is null or char_length(location_notes) <= 2000),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create table public.event_private_details (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  livestream_link text check (livestream_link is null or char_length(livestream_link) <= 2000),
  livestream_instructions text check (livestream_instructions is null or char_length(livestream_instructions) <= 2000),
  updated_at timestamptz not null default now()
);

create trigger event_private_details_set_updated_at
before update on public.event_private_details
for each row execute function public.set_updated_at();

create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_name text not null check (char_length(trim(guest_name)) between 1 and 200),
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone text check (phone is null or char_length(trim(phone)) <= 50),
  attendance_choice text not null check (attendance_choice in ('in_person', 'livestream', 'unable', 'undecided')),
  attendee_count integer not null check (attendee_count between 1 and 20),
  additional_attendee_names text check (additional_attendee_names is null or char_length(additional_attendee_names) <= 2000),
  wants_to_speak text not null check (wants_to_speak in ('yes', 'no', 'maybe')),
  speaking_format text check (speaking_format is null or speaking_format in ('in_person', 'livestream', 'pre_recorded', 'written_note')),
  message text check (message is null or char_length(message) <= 2000),
  message_share_permission boolean not null default false,
  accessibility_needs text check (accessibility_needs is null or char_length(accessibility_needs) <= 1000),
  dietary_restrictions text check (dietary_restrictions is null or char_length(dietary_restrictions) <= 1000),
  wants_updates boolean not null default false,
  private_note text check (private_note is null or char_length(private_note) <= 2000),
  status text not null default 'pending_review' check (status in ('pending_review', 'confirmed', 'changed', 'cancelled', 'duplicate')),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 5000),
  created_at timestamptz not null default now()
);

create index event_rsvps_event_id_idx on public.event_rsvps (event_id);

alter table public.events enable row level security;
alter table public.event_private_details enable row level security;
alter table public.event_rsvps enable row level security;

create policy "events_select_public"
on public.events
for select
to anon, authenticated
using (
  is_published = true
  and exists (
    select 1 from public.memorials m
    where m.id = events.memorial_id and m.is_published = true
  )
);

create policy "events_manage_authenticated"
on public.events
for all
to authenticated
using (true)
with check (true);

create policy "event_private_details_manage_authenticated"
on public.event_private_details
for all
to authenticated
using (true)
with check (true);

create policy "event_rsvps_insert_public"
on public.event_rsvps
for insert
to anon
with check (
  status = 'pending_review'
  and admin_notes is null
  and exists (
    select 1 from public.events e
    join public.memorials m on m.id = e.memorial_id
    where e.id = event_rsvps.event_id
      and e.is_published = true
      and m.is_published = true
  )
);

create policy "event_rsvps_manage_authenticated"
on public.event_rsvps
for all
to authenticated
using (true)
with check (true);
