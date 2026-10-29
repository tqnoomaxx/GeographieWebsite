-- Account-free notebooks. The random link secret is the credential; only its hash is stored.
-- Tables are outside the exposed API schema. Anonymous users cannot call the database API directly.
create schema if not exists quiz_notes_private;
revoke all on schema quiz_notes_private from public, anon, authenticated;

create table quiz_notes_private.notebooks (
  id uuid primary key,
  secret_hash bytea not null check (octet_length(secret_hash) = 32),
  created_at timestamptz not null default now()
);
create table quiz_notes_private.notes (
  notebook_id uuid not null references quiz_notes_private.notebooks(id) on delete cascade,
  id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  context text not null check (char_length(context) between 1 and 160),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (notebook_id, id)
);
create index quiz_notes_updated_idx on quiz_notes_private.notes (notebook_id, updated_at desc, id);
alter table quiz_notes_private.notebooks enable row level security;
alter table quiz_notes_private.notes enable row level security;
revoke all on quiz_notes_private.notebooks, quiz_notes_private.notes from public, anon, authenticated, service_role;

create function quiz_notes_private.access_notebook(p_id uuid, p_secret text, p_action text, p_note jsonb default '{}')
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
        raise exception 'note_conflict' using errcode = '40001';
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
        raise exception 'note_conflict' using errcode = '40001';
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
revoke all on function quiz_notes_private.access_notebook(uuid, text, text, jsonb) from public, anon, authenticated;
grant usage on schema quiz_notes_private to service_role;
grant execute on function quiz_notes_private.access_notebook(uuid, text, text, jsonb) to service_role;

-- Only the rate-limited Edge Function's server key can invoke this wrapper.
create function public.quiz_notes(p_id uuid, p_secret text, p_action text, p_note jsonb default '{}')
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select quiz_notes_private.access_notebook(p_id, p_secret, p_action, p_note); $$;
revoke all on function public.quiz_notes(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.quiz_notes(uuid, text, text, jsonb) to service_role;
