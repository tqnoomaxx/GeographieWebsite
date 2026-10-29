-- Run after migrations in a local test database. No fixtures are retained.
begin;
insert into auth.users (id, email) values
('91e11111-1111-4111-8111-111111111111', 'dev-one@example.invalid'),
('91e22222-2222-4222-8222-222222222222', 'dev-two@example.invalid'),
('91e33333-3333-4333-8333-333333333333', 'ordinary@example.invalid');
insert into public.admin_users (user_id) values
('91e11111-1111-4111-8111-111111111111'), ('91e22222-2222-4222-8222-222222222222');

set local role anon;
do $$ begin
  assert not has_table_privilege('anon', 'public.quiz_improvements', 'select'), 'anon can read';
  assert not has_table_privilege('anon', 'public.quiz_improvements', 'insert'), 'anon can insert';
  assert not has_table_privilege('anon', 'public.quiz_improvements', 'update'), 'anon can update';
  assert not has_table_privilege('anon', 'public.quiz_improvements', 'delete'), 'anon can delete';
end $$;
reset role;

set local request.jwt.claims = '{"sub":"91e11111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}';
set local role authenticated;
insert into public.quiz_improvements (title, description, context) values
('Karte verbessern', 'Flüsse deutlicher zeichnen.', '{"label":"Flüsse","path":"/play/water/round"}');
do $$ begin
  assert (select count(*) from public.quiz_improvements where title = 'Karte verbessern') = 1, 'developer cannot read own entry';
  assert (select created_by from public.quiz_improvements where title = 'Karte verbessern') = (select auth.uid()), 'author was not set by server';
  begin
    update public.quiz_improvements set created_by = '91e33333-3333-4333-8333-333333333333';
    raise exception 'author overwrite allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.quiz_improvements (title, description, context) values ('abc', 'Test', '{"label":"X","path":"//evil.example"}');
    raise exception 'external route allowed';
  exception when check_violation then null; end;
  begin
    insert into public.quiz_improvements (title, description, context) values ('abc', 'Test', '{}');
    raise exception 'empty context allowed';
  exception when check_violation then null; end;
  begin
    insert into public.quiz_improvements (title, description, context) values ('   ', 'Test', '{"label":"X","path":"/play"}');
    raise exception 'blank title allowed';
  exception when check_violation then null; end;
end $$;
reset role;

-- User-editable metadata cannot grant developer rights.
set local request.jwt.claims = '{"sub":"91e33333-3333-4333-8333-333333333333","role":"authenticated","aal":"aal2","user_metadata":{"role":"admin","developer":true}}';
set local role authenticated;
do $$ declare affected integer; begin
  assert (select count(*) from public.quiz_improvements) = 0, 'ordinary user read entries';
  assert (select count(*) from public.admin_users) = 0, 'ordinary user read roles';
  begin
    insert into public.quiz_improvements (title, description, context) values ('Forged', 'Test', '{"label":"X","path":"/play"}');
    raise exception 'ordinary user inserted';
  exception when insufficient_privilege then null; end;
  update public.quiz_improvements set status = 'done'; get diagnostics affected = row_count;
  assert affected = 0, 'ordinary user updated';
  delete from public.quiz_improvements; get diagnostics affected = row_count;
  assert affected = 0, 'ordinary user deleted';
  begin
    insert into public.admin_users values ('91e33333-3333-4333-8333-333333333333');
    raise exception 'self promotion allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- A second developer can manage the shared backlog.
set local request.jwt.claims = '{"sub":"91e22222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1"}';
set local role authenticated;
do $$ begin
  assert (select count(*) from public.quiz_improvements where title = 'Karte verbessern') = 1, 'second developer cannot read';
  update public.quiz_improvements set status = 'working', priority = 'high' where title = 'Karte verbessern';
  assert (select status from public.quiz_improvements where title = 'Karte verbessern') = 'working', 'second developer cannot update';
end $$;
reset role;

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, secret, created_at, updated_at)
values ('91e44444-4444-4444-8444-444444444444', '91e22222-2222-4222-8222-222222222222', 'Test', 'totp', 'verified', 'JBSWY3DPEHPK3PXP', now(), now());
set local role authenticated;
do $$ declare affected integer; begin
  assert (select count(*) from public.quiz_improvements) = 0, 'MFA read bypass';
  begin
    insert into public.quiz_improvements (title, description, context) values ('MFA bypass', 'Test', '{"label":"X","path":"/play"}');
    raise exception 'MFA insert bypass';
  exception when insufficient_privilege then null; end;
  update public.quiz_improvements set status = 'done'; get diagnostics affected = row_count;
  assert affected = 0, 'MFA update bypass';
  delete from public.quiz_improvements; get diagnostics affected = row_count;
  assert affected = 0, 'MFA delete bypass';
end $$;
reset role;
set local request.jwt.claims = '{"sub":"91e22222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal2"}';
set local role authenticated;
do $$ begin
  assert (select count(*) from public.quiz_improvements where title = 'Karte verbessern') = 1, 'MFA completion failed';
  delete from public.quiz_improvements where title = 'Karte verbessern';
  assert (select count(*) from public.quiz_improvements where title = 'Karte verbessern') = 0, 'developer delete failed';
  insert into public.quiz_improvements (title, description, context) values ('Rechte prüfen', 'Bleibt bis zum Rollback bestehen.', '{"label":"X","path":"/play"}');
end $$;
reset role;

delete from public.admin_users where user_id = '91e22222-2222-4222-8222-222222222222';
set local role authenticated;
do $$ declare affected integer; begin
  assert (select count(*) from public.admin_users) = 0, 'role revocation failed';
  assert (select count(*) from public.quiz_improvements) = 0, 'revoked developer read entries';
  update public.quiz_improvements set status = 'done'; get diagnostics affected = row_count;
  assert affected = 0, 'revoked developer updated';
  delete from public.quiz_improvements; get diagnostics affected = row_count;
  assert affected = 0, 'revoked developer deleted';
  begin
    insert into public.quiz_improvements (title, description, context) values ('Revoked', 'Test', '{"label":"X","path":"/play"}');
    raise exception 'revoked developer inserted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
