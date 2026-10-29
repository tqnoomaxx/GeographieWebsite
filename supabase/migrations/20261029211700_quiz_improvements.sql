-- Shared developer backlog. Authorization reuses the existing server-managed admin_users role.
-- No access through notebooks, user metadata or client-side flags.
create table public.quiz_improvements (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text not null check (char_length(btrim(description)) between 1 and 4000),
  context jsonb not null check (
    jsonb_typeof(context) = 'object'
    and jsonb_typeof(context->'label') = 'string'
    and char_length(context->>'label') between 1 and 200
    and jsonb_typeof(context->'path') = 'string'
    and left(context->>'path', 1) = '/'
    and left(context->>'path', 2) <> '//'
    and octet_length(context::text) <= 8192
    and context ?& array['label', 'path']
  ),
  status text not null default 'open' check (status in ('open', 'working', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quiz_improvements_created_at_idx on public.quiz_improvements (created_at desc);
create index quiz_improvements_created_by_idx on public.quiz_improvements (created_by);
create trigger quiz_improvements_touch before update on public.quiz_improvements
for each row execute function public.touch_updated_at();

alter table public.quiz_improvements enable row level security;
alter table public.quiz_improvements force row level security;
revoke all on public.quiz_improvements from public, anon, authenticated;
grant select, delete on public.quiz_improvements to authenticated;
grant insert (title, description, context, status, priority) on public.quiz_improvements to authenticated;
grant update (title, description, status, priority) on public.quiz_improvements to authenticated;

create policy quiz_improvements_developer_select on public.quiz_improvements for select to authenticated
using ((select private.is_admin()) and (select private.mfa_access_allowed()));
create policy quiz_improvements_developer_insert on public.quiz_improvements for insert to authenticated
with check ((select private.is_admin()) and (select private.mfa_access_allowed()) and created_by = (select auth.uid()));
create policy quiz_improvements_developer_update on public.quiz_improvements for update to authenticated
using ((select private.is_admin()) and (select private.mfa_access_allowed()))
with check ((select private.is_admin()) and (select private.mfa_access_allowed()));
create policy quiz_improvements_developer_delete on public.quiz_improvements for delete to authenticated
using ((select private.is_admin()) and (select private.mfa_access_allowed()));
