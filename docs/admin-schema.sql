-- Canard Culture: private administration and usage statistics.
-- Run after docs/supabase-schema.sql. Safe to run more than once.

begin;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.user_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  visit_count bigint not null default 1 check (visit_count >= 1)
);

alter table public.admin_users enable row level security;
alter table public.user_activity enable row level security;

revoke all on public.admin_users from public, anon, authenticated;
revoke all on public.user_activity from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

create or replace function public.record_user_activity()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.user_activity (user_id, first_seen_at, last_seen_at, visit_count)
  values (current_user_id, now(), now(), 1)
  on conflict (user_id) do update
    set visit_count = case
          when public.user_activity.last_seen_at < now() - interval '30 minutes'
            then public.user_activity.visit_count + 1
          else public.user_activity.visit_count
        end,
        last_seen_at = now();
end;
$$;

create or replace function public.get_admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  dashboard jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'metrics', jsonb_build_object(
      'total_accounts', (select count(*) from auth.users),
      'new_today', (select count(*) from auth.users where created_at >= date_trunc('day', now())),
      'new_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
      'new_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
      'confirmed_accounts', (select count(*) from auth.users where email_confirmed_at is not null),
      'google_accounts', (select count(*) from auth.users where coalesce(raw_app_meta_data ->> 'provider', '') = 'google'),
      'email_accounts', (select count(*) from auth.users where coalesce(raw_app_meta_data ->> 'provider', 'email') = 'email'),
      'active_24h', (
        select count(*) from auth.users u
        left join public.user_activity a on a.user_id = u.id
        where greatest(
          coalesce(u.last_sign_in_at, 'epoch'::timestamptz),
          coalesce(a.last_seen_at, 'epoch'::timestamptz)
        ) >= now() - interval '24 hours'
      ),
      'active_7d', (
        select count(*) from auth.users u
        left join public.user_activity a on a.user_id = u.id
        where greatest(
          coalesce(u.last_sign_in_at, 'epoch'::timestamptz),
          coalesce(a.last_seen_at, 'epoch'::timestamptz)
        ) >= now() - interval '7 days'
      ),
      'active_30d', (
        select count(*) from auth.users u
        left join public.user_activity a on a.user_id = u.id
        where greatest(
          coalesce(u.last_sign_in_at, 'epoch'::timestamptz),
          coalesce(a.last_seen_at, 'epoch'::timestamptz)
        ) >= now() - interval '30 days'
      ),
      'tracked_visits', (select coalesce(sum(visit_count), 0) from public.user_activity),
      'profiles', (select count(*) from public.profiles),
      'cloud_backups', (select count(*) from public.user_state),
      'added_packs', (
        select coalesce(sum(
          case when jsonb_typeof(state #> array['state', 'qpuc-added-packs']) = 'array'
            then jsonb_array_length(state #> array['state', 'qpuc-added-packs']) else 0 end
        ), 0) from public.user_state
      ),
      'personal_packs', (
        select coalesce(sum(
          case when jsonb_typeof(state #> array['state', 'qpuc-user-packs']) = 'array'
            then jsonb_array_length(state #> array['state', 'qpuc-user-packs']) else 0 end
        ), 0) from public.user_state
      ),
      'reviewed_cards', (
        select coalesce(sum(
          case when jsonb_typeof(state #> array['state', 'qpuc-srs-v2']) = 'object'
            then (select count(*) from jsonb_object_keys(state #> array['state', 'qpuc-srs-v2']))
            else 0 end
        ), 0) from public.user_state
      ),
      'total_xp', (
        select coalesce(sum(
          case when jsonb_typeof(state #> array['state', 'qpuc-xp', 'total']) = 'number'
            then (state #>> array['state', 'qpuc-xp', 'total'])::bigint else 0 end
        ), 0) from public.user_state
      )
    ),
    'signups', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', days.day::date,
        'count', coalesce(daily.count, 0)
      ) order by days.day), '[]'::jsonb)
      from generate_series(
        date_trunc('day', now()) - interval '13 days',
        date_trunc('day', now()),
        interval '1 day'
      ) as days(day)
      left join (
        select date_trunc('day', created_at) as day, count(*) as count
        from auth.users
        where created_at >= date_trunc('day', now()) - interval '13 days'
        group by 1
      ) daily on daily.day = days.day
    ),
    'recent_accounts', (
      select coalesce(jsonb_agg(to_jsonb(recent) order by recent.created_at desc), '[]'::jsonb)
      from (
        select
          u.id,
          u.email,
          coalesce(p.display_name, u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '') as display_name,
          coalesce(p.handle, '') as handle,
          coalesce(u.raw_app_meta_data ->> 'provider', 'email') as provider,
          u.created_at,
          u.last_sign_in_at,
          a.last_seen_at,
          (u.email_confirmed_at is not null) as confirmed
        from auth.users u
        left join public.profiles p on p.user_id = u.id
        left join public.user_activity a on a.user_id = u.id
        order by u.created_at desc
        limit 50
      ) recent
    )
  ) into dashboard;

  return dashboard;
end;
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.record_user_activity() from public, anon;
revoke all on function public.get_admin_dashboard() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.record_user_activity() to authenticated;
grant execute on function public.get_admin_dashboard() to authenticated;

comment on table public.admin_users is 'Private allowlist for the Canard Culture administration dashboard.';
comment on table public.user_activity is 'Authenticated activity timestamps and privacy-safe visit counts.';
comment on function public.get_admin_dashboard() is 'Aggregated private metrics, available only to admin_users.';

commit;
