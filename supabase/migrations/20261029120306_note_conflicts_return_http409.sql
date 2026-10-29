-- A stale notebook version is a permanent HTTP conflict, not a retryable transaction failure.
-- PostgREST 14 retries SQLSTATE 40001 indefinitely; PT409 returns a normal HTTP 409.
create or replace function quiz_notes_private.access_notebook(p_id uuid, p_secret text, p_action text, p_note jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  book quiz_notes_private.notebooks;
  note_id uuid;
  note_body text;
  note_context text;
  expected_version integer;
  previous quiz_notes_private.notes;
  result jsonb;
begin
  if p_id is null or p_secret is null or p_secret !~ '^[a-f0-9]{64}$'
     or p_action is null or p_action not in ('create', 'list', 'save', 'delete', 'destroy') then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if p_action = 'create' then
    insert into quiz_notes_private.notebooks (id, secret_hash)
      values (p_id, pg_catalog.sha256(pg_catalog.convert_to(p_secret, 'UTF8')))
      on conflict (id) do nothing;
  end if;
  -- Serialize changes within a notebook so the note limit and versions remain reliable.
  select * into book from quiz_notes_private.notebooks where id = p_id for update;
  if not found or book.secret_hash <> pg_catalog.sha256(pg_catalog.convert_to(p_secret, 'UTF8')) then
    raise exception 'notebook_not_found' using errcode = 'P0002';
  end if;
  if p_action = 'destroy' then
    delete from quiz_notes_private.notebooks where id = p_id;
    return jsonb_build_object('notes', '[]'::jsonb);
  end if;
  if p_action in ('create', 'save', 'delete') then
    if p_note is null or jsonb_typeof(p_note) <> 'object'
       or coalesce(p_note->>'id', '') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
       or coalesce(p_note->>'expectedVersion', '') !~ '^[0-9]{1,9}$' then
      raise exception 'invalid_note' using errcode = '22023';
    end if;
    note_id := (p_note->>'id')::uuid;
    expected_version := (p_note->>'expectedVersion')::integer;
    select * into previous from quiz_notes_private.notes where notebook_id = p_id and id = note_id;
    if p_action = 'delete' then
      if previous.id is not null and previous.version <> expected_version then
        raise exception 'note_conflict' using errcode = 'PT409';
      end if;
      delete from quiz_notes_private.notes where notebook_id = p_id and id = note_id;
    -- Retrying a create after a lost response must not duplicate or overwrite a note.
    elsif not (p_action = 'create' and previous.id is not null) then
      note_body := btrim(p_note->>'text');
      note_context := btrim(p_note->>'context');
      if jsonb_typeof(p_note->'text') <> 'string' or jsonb_typeof(p_note->'context') <> 'string'
         or note_body is null or char_length(note_body) not between 1 and 2000
         or note_context is null or char_length(note_context) not between 1 and 160 then
        raise exception 'invalid_note' using errcode = '22023';
      end if;
      if coalesce(previous.version, 0) <> expected_version then
        raise exception 'note_conflict' using errcode = 'PT409';
      end if;
      if previous.id is null then
        if (select count(*) from quiz_notes_private.notes where notebook_id = p_id) >= 200 then
          raise exception 'notebook_full' using errcode = '54000';
        end if;
        insert into quiz_notes_private.notes (notebook_id, id, body, context)
          values (p_id, note_id, note_body, note_context);
      else
        update quiz_notes_private.notes set body = note_body, context = note_context,
          version = version + 1, updated_at = clock_timestamp()
          where notebook_id = p_id and id = note_id;
      end if;
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id, 'text', n.body, 'context', n.context, 'version', n.version,
    'createdAt', n.created_at, 'updatedAt', n.updated_at
  ) order by n.updated_at desc, n.id), '[]'::jsonb) into result
    from quiz_notes_private.notes n where n.notebook_id = p_id;
  return jsonb_build_object('notes', result);
end;
$$;
