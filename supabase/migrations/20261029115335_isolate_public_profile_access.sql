-- Keep privileged RLS helpers outside the Data API's public schema.
-- ALTER FUNCTION preserves the OIDs used by existing RLS policies.
alter function public.is_admin() set schema private;
alter function public.mfa_access_allowed() set schema private;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;
create or replace function private.mfa_access_allowed()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    coalesce((select auth.jwt()->>'aal') = 'aal2', false)
    or not exists (
      select 1 from auth.mfa_factors
      where user_id = (select auth.uid()) and status = 'verified'
    )
  );
$$;
revoke all on function private.is_admin(), private.mfa_access_allowed() from public, anon;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin(), private.mfa_access_allowed() to authenticated;

-- This deliberately anonymous read exposes only six explicitly published fields.
-- Base tables, internal user IDs, private profiles and MFA data remain inaccessible.
create function private.read_public_profiles()
returns table (username text, avatar text, color text, title text, featured_achievements text[], xp integer)
language sql stable security definer set search_path = ''
as $$
  select p.username, p.avatar, p.color, p.title, p.featured_achievements, s.xp
  from public.profiles p
  join public.user_stats s on s.user_id = p.id
  where p.is_public and p.username is not null;
$$;
revoke all on function private.read_public_profiles() from public;
grant execute on function private.read_public_profiles() to anon, authenticated;

create or replace view public.public_profiles
with (security_invoker = true, security_barrier = true)
as select * from private.read_public_profiles();
grant select on public.public_profiles to anon, authenticated;

-- Supabase may install this DDL event-trigger helper in fresh projects.
-- The event trigger keeps working; clients must not execute it as an RPC.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
