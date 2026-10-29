-- Run with psql -v ON_ERROR_STOP=1 against a disposable database after 0005_quiz_notes.sql.
-- Tests use only dummy link secrets, never production credentials.
begin;
set local role service_role;
do $$
declare
  book uuid := '11111111-1111-4111-8111-111111111111';
  second_book uuid := '22222222-2222-4222-8222-222222222222';
  first_note uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  secret text := repeat('a', 64);
  other_secret text := repeat('b', 64);
  result jsonb;
  note jsonb;
  i integer;
begin
  note := jsonb_build_object('id', first_note, 'text', E'Indien und China\nEinwohner wiederholen <b>nur Text</b>', 'context', 'Länder vervollständigen', 'expectedVersion', 0);
  result := public.quiz_notes(book, secret, 'create', note);
  assert jsonb_array_length(result->'notes') = 1, 'first note missing';
  assert result->'notes'->0->>'text' = note->>'text', 'text was changed';
  assert (result->'notes'->0->>'version')::int = 1, 'wrong initial version';
  result := public.quiz_notes(book, secret, 'create', note);
  assert jsonb_array_length(result->'notes') = 1, 'retry duplicated note';
  begin
    perform public.quiz_notes(book, other_secret, 'list');
    raise exception 'wrong secret was accepted';
  exception when no_data_found then null;
  end;
  begin
    perform public.quiz_notes(second_book, secret, 'list');
    raise exception 'missing notebook was accepted';
  exception when no_data_found then null;
  end;
  begin
    perform public.quiz_notes(second_book, other_secret, 'create', jsonb_set(note, '{text}', '""'));
    raise exception 'empty note was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.quiz_notes(second_book, other_secret, 'list');
    raise exception 'failed create left a notebook';
  exception when no_data_found then null;
  end;
  note := jsonb_set(jsonb_set(note, '{text}', '"Afrika-Hauptstädte üben"'), '{expectedVersion}', '1');
  result := public.quiz_notes(book, secret, 'save', note);
  assert (result->'notes'->0->>'version')::int = 2, 'edit did not increment version';
  begin
    perform public.quiz_notes(book, secret, 'save', note);
    raise exception 'stale edit was accepted';
  exception when sqlstate 'PT409' then null;
  end;
  begin
    perform public.quiz_notes(book, secret, 'delete', note);
    raise exception 'stale delete was accepted';
  exception when sqlstate 'PT409' then null;
  end;
  result := public.quiz_notes(book, secret, 'list');
  assert result->'notes'->0->>'text' = 'Afrika-Hauptstädte üben', 'stale edit changed the data';
  result := public.quiz_notes(second_book, other_secret, 'create', jsonb_set(note, '{expectedVersion}', '0'));
  assert jsonb_array_length(result->'notes') = 1, 'second notebook failed';
  result := public.quiz_notes(book, secret, 'delete', jsonb_set(note, '{expectedVersion}', '2'));
  assert jsonb_array_length(result->'notes') = 0, 'note was not deleted';
  result := public.quiz_notes(book, secret, 'delete', note);
  assert jsonb_array_length(result->'notes') = 0, 'delete retry failed';
  result := public.quiz_notes(second_book, other_secret, 'list');
  assert jsonb_array_length(result->'notes') = 1, 'other notebook was changed';
  for i in 1..200 loop
    result := public.quiz_notes(book, secret, 'save', jsonb_build_object('id', lpad(to_hex(i), 8, '0') || '-0000-4000-8000-000000000000', 'text', 'Notiz ' || i, 'context', 'Test', 'expectedVersion', 0));
  end loop;
  assert jsonb_array_length(result->'notes') = 200, 'notes disappeared';
  begin
    perform public.quiz_notes(book, secret, 'save', jsonb_build_object('id', first_note, 'text', 'zu viel', 'context', 'Test', 'expectedVersion', 0));
    raise exception 'note limit was not enforced';
  exception when program_limit_exceeded then null;
  end;
  perform public.quiz_notes(book, secret, 'destroy');
  begin
    perform public.quiz_notes(book, secret, 'list');
    raise exception 'destroyed notebook still exists';
  exception when no_data_found then null;
  end;
end $$;
reset role;
set local role anon;
do $$
begin
  begin
    perform public.quiz_notes('11111111-1111-4111-8111-111111111111', repeat('a',64), 'list');
    raise exception 'anonymous database access was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from quiz_notes_private.notes;
    raise exception 'private notes were readable';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
begin
  assert not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'quiz_notes' and p.prosecdef), 'public wrapper is security definer';
  assert not has_function_privilege('authenticated', 'public.quiz_notes(uuid,text,text,jsonb)', 'execute'), 'logged in users bypass edge';
  assert not has_table_privilege('anon', 'quiz_notes_private.notes', 'select'), 'anonymous table grant exists';
  assert not has_table_privilege('service_role', 'quiz_notes_private.notes', 'select'), 'service table grant exists';
end $$;
rollback;
