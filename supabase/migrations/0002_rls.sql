-- Row Level Security: jede Nutzertabelle nur für den eigenen Nutzer; Stats/Achievements nur serverseitig schreibbar.
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_stats enable row level security;
alter table public.user_progress enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.quests enable row level security;
alter table public.user_quests enable row level security;
alter table public.favorites enable row level security;
alter table public.puzzle_results enable row level security;
alter table public.suggestions enable row level security;
alter table public.admin_users enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- Profile: eigenes lesen/ändern; öffentliche über View
create policy "profiles_own_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_own_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "settings_own" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Stats: lesen ja, schreiben NUR über Edge Function (service role). Kein Client-Insert/Update.
create policy "stats_own_select" on public.user_stats for select using (auth.uid() = user_id);

-- Lernfortschritt: eigener Nutzer darf lesen; Schreiben über Edge Function (validiert)
create policy "progress_own_select" on public.user_progress for select using (auth.uid() = user_id);

-- Sessions: Client darf eigene Sessions einreichen (insert) und lesen; Bewertung erfolgt serverseitig
create policy "sessions_own_select" on public.quiz_sessions for select using (auth.uid() = user_id);
create policy "sessions_own_insert" on public.quiz_sessions for insert with check (auth.uid() = user_id and validated = false);

-- Kataloge: für alle Angemeldeten lesbar
create policy "achievements_read" on public.achievements for select using (true);
create policy "quests_read" on public.quests for select using (true);

create policy "user_achievements_own_select" on public.user_achievements for select using (auth.uid() = user_id);
create policy "user_quests_own_select" on public.user_quests for select using (auth.uid() = user_id);

-- Favoriten und Rätsel: Client darf eigene direkt verwalten (keine XP-Relevanz)
create policy "favorites_own" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "puzzles_own_select" on public.puzzle_results for select using (auth.uid() = user_id);
create policy "puzzles_own_insert" on public.puzzle_results for insert with check (auth.uid() = user_id);
create policy "puzzles_own_update" on public.puzzle_results for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Vorschläge: einreichen dürfen alle Angemeldeten, lesen/ändern nur Admins
create policy "suggestions_insert" on public.suggestions for insert with check (auth.uid() = user_id or user_id is null);
create policy "suggestions_admin" on public.suggestions for all using (public.is_admin()) with check (public.is_admin());

create policy "admin_users_admin" on public.admin_users for select using (public.is_admin());

grant select on public.public_profiles to anon, authenticated;
