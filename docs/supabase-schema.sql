-- Canard Culture: private account and sync schema.
-- Safe to run more than once in the Supabase SQL editor.

begin;

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
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_length') then
    alter table public.profiles add constraint profiles_display_name_length
      check (display_name is null or char_length(display_name) between 1 and 32);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_controls') then
    alter table public.profiles add constraint profiles_display_name_controls
      check (display_name is null or display_name !~ '[[:cntrl:]]');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_handle_format') then
    alter table public.profiles add constraint profiles_handle_format
      check (handle is null or handle ~ '^[a-z0-9_]{2,24}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_https') then
    alter table public.profiles add constraint profiles_avatar_https
      check (avatar_url is null or (char_length(avatar_url) <= 2048 and avatar_url ~ '^https://'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_state_object_only') then
    alter table public.user_state add constraint user_state_object_only
      check (jsonb_typeof(state) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_state_reasonable_size') then
    alter table public.user_state add constraint user_state_reasonable_size
      check (pg_column_size(state) <= 1048576);
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
alter table public.profiles force row level security;
alter table public.user_state force row level security;

revoke all on public.profiles from public, anon;
revoke all on public.user_state from public, anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_state to authenticated;

drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_upsert_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "user_state_own" on public.user_state;
drop policy if exists "user_state_select_own" on public.user_state;
drop policy if exists "user_state_insert_own" on public.user_state;
drop policy if exists "user_state_update_own" on public.user_state;
drop policy if exists "user_state_delete_own" on public.user_state;

create policy "user_state_select_own" on public.user_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_state_insert_own" on public.user_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_state_update_own" on public.user_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "user_state_delete_own" on public.user_state
  for delete to authenticated using ((select auth.uid()) = user_id);

comment on table public.profiles is 'Private account profile. Expose future social fields through a separate limited public view.';
comment on table public.user_state is 'Private per-user flashcard progress protected by RLS.';

commit;
