-- Run in a transaction in a test project after all migrations; no fixtures are retained.
begin;
insert into auth.users (id, email) values
  ('36d4feba-8e9c-4ddc-ae4e-111111111111', 'atlas-connection-public@example.invalid'),
  ('36d4feba-8e9c-4ddc-ae4e-222222222222', 'atlas-connection-private@example.invalid');
update public.profiles set username = 'atlas_setup_pub', is_public = true where id = '36d4feba-8e9c-4ddc-ae4e-111111111111';
update public.profiles set username = 'atlas_setup_private', is_public = false where id = '36d4feba-8e9c-4ddc-ae4e-222222222222';
update public.user_stats set xp = 123 where user_id = '36d4feba-8e9c-4ddc-ae4e-111111111111';
set local role anon;
do $$
declare card jsonb;
begin
  assert (select count(*) from public.public_profiles where username in ('atlas_setup_pub', 'atlas_setup_private')) = 1, 'private profile was exposed';
  select to_jsonb(p) into card from public.public_profiles p where username = 'atlas_setup_pub';
  assert card->>'xp' = '123', 'published profile data is missing';
  assert not (card ? 'id') and not (card ? 'user_id') and not (card ? 'email'), 'internal identifier was exposed';
  begin
    perform * from public.profiles;
    raise exception 'base profiles were readable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.user_stats;
    raise exception 'base stats were readable';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
set local request.jwt.claims = '{"sub":"36d4feba-8e9c-4ddc-ae4e-222222222222","role":"authenticated","aal":"aal1"}';
set local role authenticated;
do $$
begin
  assert private.mfa_access_allowed(), 'user without MFA was blocked';
  assert not private.is_admin(), 'ordinary user became admin';
  assert (select count(*) from public.profiles where id = '36d4feba-8e9c-4ddc-ae4e-222222222222') = 1, 'own profile is missing';
end;
$$;
reset role;
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, secret, created_at, updated_at)
  values ('36d4feba-8e9c-4ddc-ae4e-333333333333', '36d4feba-8e9c-4ddc-ae4e-222222222222', 'Disposable connection test', 'totp', 'verified', 'JBSWY3DPEHPK3PXP', now(), now());
set local role authenticated;
do $$
begin
  assert not private.mfa_access_allowed(), 'MFA was bypassed';
  assert (select count(*) from public.profiles where id = '36d4feba-8e9c-4ddc-ae4e-222222222222') = 0, 'private profile was readable before MFA';
end;
$$;
reset role;
set local request.jwt.claims = '{"sub":"36d4feba-8e9c-4ddc-ae4e-222222222222","role":"authenticated","aal":"aal2"}';
set local role authenticated;
do $$
begin
  assert private.mfa_access_allowed(), 'completed MFA was rejected';
  assert (select count(*) from public.profiles where id = '36d4feba-8e9c-4ddc-ae4e-222222222222') = 1, 'MFA user cannot read own profile';
end;
$$;
reset role;
do $$
begin
  assert to_regprocedure('public.is_admin()') is null, 'admin helper remains exposed';
  assert to_regprocedure('public.mfa_access_allowed()') is null, 'MFA helper remains exposed';
  assert not has_function_privilege('anon', 'private.is_admin()', 'execute'), 'anonymous admin helper access';
  assert not has_function_privilege('anon', 'private.mfa_access_allowed()', 'execute'), 'anonymous MFA helper access';
  assert has_function_privilege('authenticated', 'private.mfa_access_allowed()', 'execute'), 'RLS helper is inaccessible';
end;
$$;
rollback;
