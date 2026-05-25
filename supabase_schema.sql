-- SafeToilets Supabase Setup SQL DDL
-- Paste this script into your Supabase SQL Editor to configure the database schema, RLS, and rate-limiting triggers.

-- Clean up existing tables and functions to allow clean reinstall/reset
drop table if exists public.admin_actions cascade;
drop table if exists public.reports cascade;
drop table if exists public.restroom_verifications cascade;
drop table if exists public.restrooms cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.update_restroom_averages() cascade;
drop function if exists public.check_contribution_rate_limit() cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 1. TABLES DEFINITION
-- =========================================================================

-- Profiles Table (holds user details synced with Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  is_admin boolean default false not null,
  is_banned boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Restrooms Table
create table public.restrooms (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  type text not null check (type in ('Restaurant', 'Petrol Pump', 'Mall', 'Railway / Bus Station', 'Public Toilet', 'Other')),
  toilet_type text not null check (toilet_type in ('Indian', 'European', 'Both')),
  gender_access text not null check (gender_access in ('Men', 'Women', 'Unisex', 'Both')),
  is_accessible boolean default false not null,
  
  -- Core Facilities
  has_soap boolean default false not null,
  has_mirror boolean default false not null,
  has_sanitary_disposal boolean default false not null,
  
  -- Computed ratings cached for fast queries
  avg_cleanliness numeric(3,2) default 0.00 not null,
  avg_smell numeric(3,2) default 0.00 not null,
  avg_lighting numeric(3,2) default 0.00 not null,
  avg_women_safety numeric(3,2) default 0.00 not null,
  avg_water_availability numeric(3,2) default 0.00 not null,
  overall_score numeric(3,2) default 0.00 not null,
  verification_count integer default 0 not null,
  
  -- Image Fields (Strictly ONE active public image + ONE backup)
  public_image_url text,
  backup_image_url text,
  
  is_hidden boolean default false not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Restroom Verifications (Individual Ratings & Verifications log)
create table public.restroom_verifications (
  id uuid default uuid_generate_v4() primary key,
  restroom_id uuid references public.restrooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  
  -- Ratings
  cleanliness integer not null check (cleanliness between 1 and 5),
  smell integer not null check (smell between 1 and 5),
  lighting integer not null check (lighting between 1 and 5),
  women_safety integer not null check (women_safety between 1 and 5),
  water_availability integer not null check (water_availability between 1 and 5),
  
  -- Facilities verified during this visit
  has_soap boolean not null,
  has_mirror boolean not null,
  has_sanitary_disposal boolean not null,
  
  image_url text, -- Store URL if image was uploaded
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reports Table (For flagging incorrect info)
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  restroom_id uuid references public.restrooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  reason text not null check (reason in ('wrong_image', 'fake_restroom', 'closed_restroom', 'incorrect_information')),
  details text,
  status text default 'pending' not null check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Admin Actions (Audit log for moderations)
create table public.admin_actions (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references public.profiles(id) on delete cascade not null,
  action text not null, -- 'delete_restroom', 'hide_restroom', 'ban_user', 'restore_image', 'resolve_report'
  target_id uuid not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- 2. INDEXES DEFINITIONS
-- =========================================================================
create index idx_restrooms_coordinates on public.restrooms (latitude, longitude) where (is_hidden = false);
create index idx_restrooms_overall_score on public.restrooms (overall_score) where (is_hidden = false);
create index idx_verifications_restroom_id on public.restroom_verifications (restroom_id);
create index idx_reports_status on public.reports (status);

-- =========================================================================
-- 3. FUNCTIONS & TRIGGERS DEFINITIONS
-- =========================================================================

-- Trigger to auto-create profile on auth sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Anonymous User'),
    new.raw_user_meta_data->>'avatar_url',
    -- Set the first user as admin for MVP testing convenience, or specific email domains
    case when not exists (select 1 from public.profiles) then true else false end
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger function to update restroom averages and cache them
create or replace function public.update_restroom_averages()
returns trigger as $$
declare
  v_cleanliness numeric(3,2);
  v_smell numeric(3,2);
  v_lighting numeric(3,2);
  v_women_safety numeric(3,2);
  v_water numeric(3,2);
  v_overall numeric(3,2);
  v_count integer;
  v_last_soap boolean;
  v_last_mirror boolean;
  v_last_sanitary boolean;
begin
  -- Calculate averages
  select 
    coalesce(avg(cleanliness), 0),
    coalesce(avg(smell), 0),
    coalesce(avg(lighting), 0),
    coalesce(avg(women_safety), 0),
    coalesce(avg(water_availability), 0),
    count(*)
  into 
    v_cleanliness, v_smell, v_lighting, v_women_safety, v_water, v_count
  from public.restroom_verifications
  where restroom_id = new.restroom_id;

  v_overall := (v_cleanliness + v_smell + v_lighting + v_women_safety + v_water) / 5.0;

  -- Get latest verification's facilities checklist to update state
  select 
    has_soap, has_mirror, has_sanitary_disposal
  into 
    v_last_soap, v_last_mirror, v_last_sanitary
  from public.restroom_verifications
  where restroom_id = new.restroom_id
  order by created_at desc
  limit 1;

  -- Update restroom cache
  update public.restrooms
  set 
    avg_cleanliness = v_cleanliness,
    avg_smell = v_smell,
    avg_lighting = v_lighting,
    avg_women_safety = v_women_safety,
    avg_water_availability = v_water,
    overall_score = v_overall,
    verification_count = v_count,
    has_soap = coalesce(v_last_soap, has_soap),
    has_mirror = coalesce(v_last_mirror, has_mirror),
    has_sanitary_disposal = coalesce(v_last_sanitary, has_sanitary_disposal),
    -- Update public/backup images if verification has a new image
    backup_image_url = case when new.image_url is not null and new.image_url <> coalesce(public_image_url, '') then public_image_url else backup_image_url end,
    public_image_url = case when new.image_url is not null then new.image_url else public_image_url end,
    updated_at = timezone('utc'::text, now())
  where id = new.restroom_id;

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_verification_added
  after insert on public.restroom_verifications
  for each row execute procedure public.update_restroom_averages();

-- =========================================================================
-- 4. SECURITY & RATE-LIMITING TRIGGERS
-- =========================================================================

-- Function to rate-limit contributions and check for banned users
create or replace function public.check_contribution_rate_limit()
returns trigger as $$
declare
  v_recent_count integer;
  v_is_banned boolean;
begin
  -- 1. Check if user is banned
  select is_banned into v_is_banned
  from public.profiles
  where id = auth.uid();
  
  if v_is_banned = true then
    raise exception 'User is banned from making contributions.';
  end if;

  -- 2. Check rates for new restrooms (max 3 per 24 hours)
  if TG_TABLE_NAME = 'restrooms' then
    select count(*)
    into v_recent_count
    from public.restrooms
    where created_by = auth.uid()
      and created_at > (now() - interval '24 hours');
      
    if v_recent_count >= 3 then
      raise exception 'Rate limit exceeded. You can add up to 3 new restrooms every 24 hours.';
    end if;
  end if;

  -- 3. Check rates for verifications (max 1 per 5 minutes per restroom, max 20 per 24 hours total)
  if TG_TABLE_NAME = 'restroom_verifications' then
    -- Check total daily count
    select count(*)
    into v_recent_count
    from public.restroom_verifications
    where user_id = auth.uid()
      and created_at > (now() - interval '24 hours');
      
    if v_recent_count >= 20 then
      raise exception 'Rate limit exceeded. You can verify up to 20 restrooms every 24 hours.';
    end if;

    -- Check specific restroom wait time
    select count(*)
    into v_recent_count
    from public.restroom_verifications
    where user_id = auth.uid()
      and restroom_id = new.restroom_id
      and created_at > (now() - interval '5 minutes');
      
    if v_recent_count >= 1 then
      raise exception 'Rate limit exceeded. Please wait 5 minutes before updating this restroom again.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Triggers for rate-limiting
create or replace trigger trigger_rate_limit_restrooms
  before insert on public.restrooms
  for each row execute procedure public.check_contribution_rate_limit();

create or replace trigger trigger_rate_limit_verifications
  before insert on public.restroom_verifications
  for each row execute procedure public.check_contribution_rate_limit();


-- =========================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.restrooms enable row level security;
alter table public.restroom_verifications enable row level security;
alter table public.reports enable row level security;
alter table public.admin_actions enable row level security;

-- Profiles Policies
create policy "Allow public read for profiles" on public.profiles
  for select using (true);

create policy "Allow users to insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Allow users to update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admins can update profiles" on public.profiles
  for update using (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );

create policy "Admins can delete profiles" on public.profiles
  for delete using (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );

-- Restrooms Policies
create policy "Allow public read for unhidden restrooms" on public.restrooms
  for select using (is_hidden = false);

create policy "Allow admins to read all restrooms" on public.restrooms
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Allow authenticated users to create restrooms" on public.restrooms
  for insert with check (
    auth.uid() is not null 
    and (exists (select 1 from public.profiles where id = auth.uid() and is_banned = false))
  );

create policy "Allow admins to update/delete restrooms" on public.restrooms
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Restroom Verifications Policies
create policy "Allow public read for verifications" on public.restroom_verifications
  for select using (true);

create policy "Allow authenticated users to create verifications" on public.restroom_verifications
  for insert with check (
    auth.uid() is not null 
    and (exists (select 1 from public.profiles where id = auth.uid() and is_banned = false))
  );

create policy "Allow admins to do everything on verifications" on public.restroom_verifications
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Reports Policies
create policy "Allow anyone to submit reports" on public.reports
  for insert with check (true);

create policy "Admins can view and manage reports" on public.reports
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Admin Actions Policies
create policy "Admins can read/write admin actions audit log" on public.admin_actions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
