-- Defense in depth for account data: least privilege, MFA-aware RLS, bounded data and durable rate limits.

-- Security-definer functions must never inherit a caller-controlled search path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_stats (user_id) values (new.id);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- RLS callers cannot read auth.mfa_factors directly. This narrowly scoped helper
-- evaluates only the current user's factor state under the function owner's rights.
create or replace function public.mfa_access_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select auth.jwt()->>'aal') = 'aal2', false)
    or not exists (
      select 1
      from auth.mfa_factors
      where user_id = (select auth.uid()) and status = 'verified'
    );
$$;

revoke all on function public.mfa_access_allowed() from public, anon;
grant execute on function public.mfa_access_allowed() to authenticated;

-- Reject oversized or internally inconsistent values at the database boundary.
alter table public.profiles
  add constraint profiles_avatar_size check (char_length(avatar) between 1 and 16) not valid,
  add constraint profiles_color_format check (color ~ '^#[0-9A-Fa-f]{6}$') not valid,
  add constraint profiles_featured_limit check (cardinality(featured_achievements) <= 5) not valid;
create unique index profiles_username_lower_idx on public.profiles (lower(username)) where username is not null;

alter table public.user_stats
  add constraint user_stats_nonnegative check (
    xp >= 0 and answered >= 0 and correct >= 0 and correct <= answered and sessions >= 0 and
    full_runs >= 0 and puzzles_solved >= 0 and streak_current >= 0 and streak_best >= 0 and learned >= 0
  ) not valid,
  add constraint user_stats_category_object check (jsonb_typeof(by_category) = 'object') not valid;

alter table public.user_progress
  add constraint user_progress_entity_size check (char_length(entity_id) between 1 and 160) not valid,
  add constraint user_progress_values check (
    correct >= 0 and wrong >= 0 and streak >= 0 and ease between 1.3 and 3.0 and interval_days >= 0
  ) not valid;

alter table public.quiz_sessions
  add constraint quiz_sessions_id_size check (char_length(id) between 1 and 128) not valid,
  add constraint quiz_sessions_scope_size check (char_length(scope) between 1 and 80) not valid,
  add constraint quiz_sessions_seed_size check (char_length(seed) between 1 and 128) not valid,
  add constraint quiz_sessions_mode check (mode in ('standard', 'full', 'repeat_errors')) not valid,
  add constraint quiz_sessions_questions_array check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 500) not valid,
  add constraint quiz_sessions_nonnegative check (score >= 0 and xp_earned >= 0) not valid;

alter table public.favorites
  add constraint favorites_entity_size check (char_length(entity_id) between 1 and 160) not valid;

alter table public.puzzle_results
  add constraint puzzle_results_key_size check (char_length(key) between 1 and 160) not valid,
  add constraint puzzle_results_data_size check (char_length(puzzle) between 1 and 80 and char_length(date) <= 32 and cardinality(guesses) <= 100) not valid;

alter table public.suggestions
  add constraint suggestions_email_size check (email is null or char_length(email) <= 200) not valid,
  add constraint suggestions_body_object check (jsonb_typeof(body) = 'object' and octet_length(body::text) <= 16000) not valid;

-- Rebuild policies with cached auth.uid() calls and remove direct session writes.
drop policy if exists "profiles_own_select" on public.profiles;
drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_select" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_own_update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "settings_own" on public.user_settings;
create policy "settings_own" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "settings_own_update" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "stats_own_select" on public.user_stats;
create policy "stats_own_select" on public.user_stats for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "progress_own_select" on public.user_progress;
create policy "progress_own_select" on public.user_progress for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "sessions_own_select" on public.quiz_sessions;
drop policy if exists "sessions_own_insert" on public.quiz_sessions;
create policy "sessions_own_select" on public.quiz_sessions for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "achievements_read" on public.achievements;
drop policy if exists "quests_read" on public.quests;
create policy "achievements_read" on public.achievements for select to authenticated using (true);
create policy "quests_read" on public.quests for select to authenticated using (true);

drop policy if exists "user_achievements_own_select" on public.user_achievements;
drop policy if exists "user_quests_own_select" on public.user_quests;
create policy "user_achievements_own_select" on public.user_achievements for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_quests_own_select" on public.user_quests for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "favorites_own" on public.favorites;
create policy "favorites_own" on public.favorites for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "puzzles_own_select" on public.puzzle_results;
drop policy if exists "puzzles_own_insert" on public.puzzle_results;
drop policy if exists "puzzles_own_update" on public.puzzle_results;
create policy "puzzles_own" on public.puzzle_results for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "suggestions_admin" on public.suggestions;
create policy "suggestions_admin" on public.suggestions for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "suggestions_own_select" on public.suggestions for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "admin_users_admin" on public.admin_users;
create policy "admin_users_admin" on public.admin_users for select to authenticated using ((select public.is_admin()));

-- Users who opted into MFA must present an AAL2 JWT for every private table operation.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_settings', 'user_stats', 'user_progress', 'quiz_sessions',
    'user_achievements', 'user_quests', 'favorites', 'puzzle_results', 'suggestions', 'admin_users'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_mfa', table_name);
    execute format($policy$
      create policy %I on public.%I
      as restrictive for all to authenticated
      using ((select public.mfa_access_allowed()))
      with check ((select public.mfa_access_allowed()))
    $policy$, table_name || '_mfa', table_name);
  end loop;
end
$$;

-- RLS is mandatory even if tables are accessed by their owner. service_role retains BYPASSRLS.
alter table public.profiles force row level security;
alter table public.user_settings force row level security;
alter table public.user_stats force row level security;
alter table public.user_progress force row level security;
alter table public.quiz_sessions force row level security;
alter table public.achievements force row level security;
alter table public.user_achievements force row level security;
alter table public.quests force row level security;
alter table public.user_quests force row level security;
alter table public.favorites force row level security;
alter table public.puzzle_results force row level security;
alter table public.suggestions force row level security;
alter table public.admin_users force row level security;

-- Explicit grants: RLS limits rows; grants limit operations and columns.
revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username, avatar, color, title, featured_achievements, favorite_category, is_public) on public.profiles to authenticated;
grant select on public.user_settings to authenticated;
grant update (theme, language) on public.user_settings to authenticated;
grant select on public.user_stats, public.user_progress, public.quiz_sessions, public.user_achievements, public.user_quests to authenticated;
grant select on public.achievements, public.quests to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.puzzle_results to authenticated;
grant select, update, delete on public.suggestions to authenticated;
grant select on public.admin_users to authenticated;

-- Public profiles remain opt-in and expose no account identifiers.
create or replace view public.public_profiles as
  select p.username, p.avatar, p.color, p.title, p.featured_achievements, s.xp
  from public.profiles p
  join public.user_stats s on s.user_id = p.id
  where p.is_public and p.username is not null;
alter view public.public_profiles set (security_barrier = true);
grant select on public.public_profiles to anon, authenticated;

-- Durable, privacy-preserving rate limiting for Edge Functions. Only salted hashes are stored.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.function_rate_limits (
  scope text not null,
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hits integer not null check (hits > 0),
  primary key (scope, key_hash, window_start)
);
create index function_rate_limits_window_idx on private.function_rate_limits (window_start);
alter table private.function_rate_limits enable row level security;
alter table private.function_rate_limits force row level security;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket timestamptz;
  allowed boolean;
begin
  if p_scope !~ '^[a-z0-9-]{1,40}$' or p_key_hash !~ '^[0-9a-f]{64}$' or p_limit not between 1 and 10000 or p_window_seconds not between 60 and 86400 then
    raise exception 'invalid rate-limit parameters';
  end if;

  bucket := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into private.function_rate_limits as current (scope, key_hash, window_start, hits)
  values (p_scope, p_key_hash, bucket, 1)
  on conflict (scope, key_hash, window_start)
  do update set hits = current.hits + 1
  where current.hits < p_limit
  returning true into allowed;

  if random() < 0.01 then
    delete from private.function_rate_limits where window_start < clock_timestamp() - interval '2 days';
  end if;
  return coalesce(allowed, false);
end
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
