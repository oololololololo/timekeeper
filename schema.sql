-- Enable Realtime
begin;
  -- remove the supabase_realtime publication
  drop publication if exists supabase_realtime;

  -- re-create the supabase_realtime publication with no tables
  create publication supabase_realtime;
commit;

-- Create Meetings Table
create table meetings (
  id text primary key, -- 8 char ID (e.g. 'A1B2C3D4')
  host_id uuid references auth.users not null,
  title text not null default 'Sin nombre',
  status text default 'scheduled', -- scheduled, active, finished
  
  -- State for Realtime (Replaces the JSON blob in AppScript)
  timer_state jsonb default '{
    "isRunning": false, 
    "isPaused": false, 
    "remainingSeconds": 300, 
    "currentSpeakerIndex": 0
  }'::jsonb,
  
  -- Array of speakers: [{ "name": "John", "email": "..", "minutes": 5, "actualSeconds": 0 }]
  speakers jsonb default '[]'::jsonb, 
  
  -- Metadata for Costs and Reports
  meta jsonb default '{}'::jsonb, 
  -- Example meta: { "avgCost": 1000, "attendees": 10, "objective": "..", "extraCosts": 0 }

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table meetings enable row level security;

-- Policies
create policy "Public read access"
  on meetings for select
  using ( true );

create policy "Hosts can insert meetings"
  on meetings for insert
  with check ( auth.uid() = host_id );

create policy "Hosts can update their own meetings"
  on meetings for update
  using ( auth.uid() = host_id );

-- Add table to realtime publication
alter publication supabase_realtime add table meetings;
