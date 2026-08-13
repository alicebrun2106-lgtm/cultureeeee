-- CULTURE!!! minimal account/sync schema
-- Run this in Supabase SQL editor after creating the project.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  handle text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_display_name_length'
  ) then
    alter table public.profiles
      add constraint profiles_display_name_length
      check (display_name is null or char_length(display_name) between 1 and 32);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_handle_format'
  ) then
    alter table public.profiles
      add constraint profiles_handle_format
      check (handle is null or handle ~ '^[a-z0-9_]{2,24}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_state_reasonable_size'
  ) then
    alter table public.user_state
      add constraint user_state_reasonable_size
      check (pg_column_size(state) <= 1048576);
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
alter table public.profiles force row level security;
alter table public.user_state force row level security;

revoke all on public.profiles from anon;
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_state to authenticated;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
  on public.profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_state_own" on public.user_state;
create policy "user_state_own"
  on public.user_state for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
