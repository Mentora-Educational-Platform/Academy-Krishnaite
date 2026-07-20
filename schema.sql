-- ====================================================================
-- KRISHNAITE ACADEMY DATABASE SCHEMA DEFINITION FOR SUPABASE (EXTENDED VERSION)
-- ====================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  name text not null,
  role text not null default 'member', -- 'member', 'founder'
  tier text not null default 'free',   -- 'free', 'explorer', 'pro'
  avatar_url text,
  join_date timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Drop existing policies if they exist to prevent conflicts on rerun
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, tier, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when new.email = 'founder@krishnaite.dev' then 'founder' else 'member' end,
    case when new.email = 'founder@krishnaite.dev' then 'pro' else 'free' end,
    case when new.email = 'founder@krishnaite.dev' then 'assets/founder.png' else 'https://api.dicebear.com/7.x/bottts/svg?seed=' || encode(new.email::bytea, 'escape') end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger first to prevent duplicate trigger errors
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. ROADMAPS TABLE
create table if not exists public.roadmaps (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  cover_image text,
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  duration text not null,
  visibility text not null default 'free' check (visibility in ('free', 'explorer', 'pro')),
  published_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id)
);

-- Alter table to add missing columns in case table already exists
alter table public.roadmaps add column if not exists description text;
alter table public.roadmaps add column if not exists cover_image text;
alter table public.roadmaps add column if not exists visibility text not null default 'free' check (visibility in ('free', 'explorer', 'pro'));
alter table public.roadmaps add column if not exists published_at timestamp with time zone default timezone('utc'::text, now()) not null;

alter table public.roadmaps enable row level security;

-- Drop existing policies if they exist to prevent conflicts on rerun
drop policy if exists "Roadmaps are viewable by everyone" on public.roadmaps;
drop policy if exists "Only founders can modify roadmaps" on public.roadmaps;

create policy "Roadmaps are viewable by everyone"
  on public.roadmaps for select
  using (true);

create policy "Only founders can modify roadmaps"
  on public.roadmaps for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'founder'
    )
  );


-- 3. ROADMAP CHECKPOINTS TABLE
create table if not exists public.roadmap_checkpoints (
  id uuid default gen_random_uuid() primary key,
  roadmap_id uuid references public.roadmaps(id) on delete cascade not null,
  title text not null,
  description text,
  completed_order integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.roadmap_checkpoints enable row level security;

-- Drop existing policies if they exist to prevent conflicts on rerun
drop policy if exists "Roadmap checkpoints are viewable by everyone" on public.roadmap_checkpoints;
drop policy if exists "Only founders can modify checkpoints" on public.roadmap_checkpoints;

create policy "Roadmap checkpoints are viewable by everyone"
  on public.roadmap_checkpoints for select
  using (true);

create policy "Only founders can modify checkpoints"
  on public.roadmap_checkpoints for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'founder'
    )
  );


-- 4. RESOURCES TABLE
create table if not exists public.resources (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  thumbnail text,
  category text not null,
  visibility text not null default 'free' check (visibility in ('free', 'explorer', 'pro')),
  file_url text,
  external_link text,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id)
);

-- Alter table to add missing columns in case table already exists
alter table public.resources add column if not exists description text;
alter table public.resources add column if not exists thumbnail text;
alter table public.resources add column if not exists visibility text not null default 'free' check (visibility in ('free', 'explorer', 'pro'));
alter table public.resources add column if not exists file_url text;
alter table public.resources add column if not exists external_link text;
alter table public.resources add column if not exists uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null;

alter table public.resources enable row level security;

-- Drop existing policies if they exist to prevent conflicts on rerun
drop policy if exists "Resources viewable depending on user tier" on public.resources;
drop policy if exists "Only founders can modify resources" on public.resources;

create policy "Resources viewable depending on user tier"
  on public.resources for select
  using (
    visibility = 'free' or
    (visibility = 'explorer' and exists (
      select 1 from public.profiles
      where id = auth.uid() and (tier = 'explorer' or tier = 'pro' or role = 'founder')
    )) or
    (visibility = 'pro' and exists (
      select 1 from public.profiles
      where id = auth.uid() and (tier = 'pro' or role = 'founder')
    ))
  );

create policy "Only founders can modify resources"
  on public.resources for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'founder'
    )
  );


-- 5. ASSETS TABLE
create table if not exists public.assets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  preview_image text,
  file_url text not null,
  visibility text not null check (visibility in ('free', 'explorer', 'pro')),
  downloads integer default 0,
  version text default '1.0.0',
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id)
);

alter table public.assets enable row level security;

-- Drop existing policies if they exist to prevent conflicts on rerun
drop policy if exists "Assets viewable depending on user tier" on public.assets;
drop policy if exists "Only founders can modify assets" on public.assets;

create policy "Assets viewable depending on user tier"
  on public.assets for select
  using (
    visibility = 'free' or
    (visibility = 'explorer' and exists (
      select 1 from public.profiles
      where id = auth.uid() and (tier = 'explorer' or tier = 'pro' or role = 'founder')
    )) or
    (visibility = 'pro' and exists (
      select 1 from public.profiles
      where id = auth.uid() and (tier = 'pro' or role = 'founder')
    ))
  );

create policy "Only founders can modify assets"
  on public.assets for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'founder'
    )
  );


-- 6. POSTS / ARTICLES TABLE
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text not null,
  community text not null, -- 'free', 'explorer', 'pro'
  excerpt text,
  tags text[],
  pinned boolean default false,
  comments_enabled boolean default true,
  cover_image text,
  cover_y integer default 50,
  likes jsonb default '[]'::jsonb, -- Store list of liked user roles/emails
  comments jsonb default '[]'::jsonb, -- Store nested comments list
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  author_id uuid references public.profiles(id) not null
);

alter table public.posts enable row level security;

-- Drop existing policies if they exist to prevent conflicts on rerun
drop policy if exists "Posts viewable depending on user tier" on public.posts;
drop policy if exists "Only founders can publish posts" on public.posts;
drop policy if exists "Only founders can update/delete posts" on public.posts;

create policy "Posts viewable depending on user tier"
  on public.posts for select
  using (
    community = 'free' or
    (community = 'explorer' and exists (
      select 1 from public.profiles
      where id = auth.uid() and (tier = 'explorer' or tier = 'pro' or role = 'founder')
    )) or
    (community = 'pro' and exists (
      select 1 from public.profiles
      where id = auth.uid() and (tier = 'pro' or role = 'founder')
    ))
  );

create policy "Only founders can publish posts"
  on public.posts for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'founder'
    )
  );

create policy "Only founders can update/delete posts"
  on public.posts for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'founder'
    )
  );

-- Add preferred_language column to profiles table
alter table public.profiles add column if not exists preferred_language text default 'en';

-- Migration: Add image support to community posts
alter table public.posts add column if not exists images jsonb default '[]'::jsonb;

-- Create Storage bucket for community-images
insert into storage.buckets (id, name, public)
values ('community-images', 'community-images', true)
on conflict (id) do nothing;

-- Enable public read access to community-images
create policy "Community images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'community-images');

-- Enable authenticated users to upload community-images
create policy "Authenticated users can upload community images"
  on storage.objects for insert
  with check (bucket_id = 'community-images' and auth.role() = 'authenticated');

-- Enable users to delete their own uploaded community-images
create policy "Users can delete their own community images"
  on storage.objects for delete
  using (bucket_id = 'community-images' and auth.uid() = owner);
