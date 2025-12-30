-- 1. Relax host_id constraints
alter table meetings drop constraint if exists meetings_host_id_fkey;
alter table meetings alter column host_id drop not null;

-- 2. Update Policies for Public Access (MVP Mode)
drop policy if exists "Hosts can insert meetings" on meetings;
create policy "Public can insert meetings" on meetings for insert with check (true);

drop policy if exists "Hosts can update their own meetings" on meetings;
create policy "Public can update meetings" on meetings for update using (true);
