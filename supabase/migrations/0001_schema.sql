-- Atlasfunke · Nutzerdaten (Phase 2). Geodaten bleiben statisch im Frontend; Referenzen über entity_id (Text).
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  avatar text not null default '🧭',
  color text not null default '#1e2a5a',
  title text check (char_length(title) <= 32),
  featured_achievements text[] not null default '{}',
  favorite_category text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  language text not null default 'de',
  updated_at timestamptz not null default now()
);

create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  answered integer not null default 0,
  correct integer not null default 0,
  sessions integer not null default 0,
  full_runs integer not null default 0,
  puzzles_solved integer not null default 0,
  by_category jsonb not null default '{}',
  continents_played text[] not null default '{}',
  streak_current integer not null default 0,
  streak_best integer not null default 0,
  streak_last_active date,
  learned integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  state text not null check (state in ('new','learning','familiar','mastered')),
  correct integer not null default 0,
  wrong integer not null default 0,
  streak integer not null default 0,
  ease real not null default 2.5,
  interval_days real not null default 0,
  due_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, entity_id)
);
create index user_progress_due_idx on public.user_progress (user_id, due_at);

create table public.quiz_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  scope text not null,
  mode text not null,
  length text not null,
  seed text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  questions jsonb not null,
  score integer not null default 0,
  xp_earned integer not null default 0,
  validated boolean not null default false,
  created_at timestamptz not null default now()
);
create index quiz_sessions_user_idx on public.quiz_sessions (user_id, started_at desc);

create table public.achievements (
  id text primary key,
  type text not null,
  category text,
  threshold integer not null,
  icon text
);

create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table public.quests (
  id text primary key,
  type text not null,
  category text,
  scope text,
  target integer not null,
  reward_xp integer not null,
  kind text not null
);

create table public.user_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null references public.quests(id),
  progress integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, quest_id)
);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entity_id)
);

create table public.puzzle_results (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  puzzle text not null,
  date text not null,
  guesses text[] not null default '{}',
  solved boolean not null default false,
  finished_at timestamptz,
  primary key (user_id, key)
);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('suggest','contact','report')),
  title text not null check (char_length(title) <= 200),
  body jsonb not null,
  email text,
  status text not null default 'new' check (status in ('new','review','accepted','rejected','done')),
  created_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Öffentliche Profil-Sicht: ausschließlich freigegebene Spalten
create view public.public_profiles as
  select p.username, p.avatar, p.color, p.title, p.featured_achievements, s.xp
  from public.profiles p
  join public.user_stats s on s.user_id = p.id
  where p.is_public;

-- Profil + Stats automatisch anlegen
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_stats (user_id) values (new.id);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute procedure public.touch_updated_at();
create trigger stats_touch before update on public.user_stats for each row execute procedure public.touch_updated_at();
