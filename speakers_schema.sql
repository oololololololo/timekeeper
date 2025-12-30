-- Create Speakers Table (Global directory of people for a user)
create table speakers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  email text,
  -- We allow a default cost, but it's optional. No role field as requested.
  default_cost_per_hour numeric, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table speakers enable row level security;

-- RLS Policies for Speakers
create policy "Users can view their own speakers"
  on speakers for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own speakers"
  on speakers for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own speakers"
  on speakers for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own speakers"
  on speakers for delete
  using ( auth.uid() = user_id );


-- Create Meeting Speakers Log (To track performance/history)
-- This replaces the JSON array partially, or complements it for analytics.
create table meeting_speakers (
  id uuid primary key default gen_random_uuid(),
  meeting_id text references meetings(id) on delete cascade not null,
  speaker_id uuid references speakers(id) on delete set null, -- Can be null if it was a one-off guest
  name_snapshot text not null, -- Captured at time of meeting
  email_snapshot text,
  
  -- Metrics
  allocated_seconds integer default 0,
  spoken_seconds integer default 0,
  cost_incurred numeric default 0,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for logs
alter table meeting_speakers enable row level security;

-- Policies: If you can see the meeting, you can see its speakers
create policy "Hosts can view meeting speakers"
  on meeting_speakers for select
  using ( exists ( select 1 from meetings where id = meeting_speakers.meeting_id and host_id = auth.uid() ) );

create policy "Hosts can insert meeting speakers"
  on meeting_speakers for insert
  with check ( exists ( select 1 from meetings where id = meeting_speakers.meeting_id and host_id = auth.uid() ) );
