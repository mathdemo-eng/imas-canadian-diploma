-- Checks who can read documents (0004_document_batches.sql). Run after records-test.sql.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000001a1', 'd1@imas.edu.my'),
  ('00000000-0000-0000-0000-0000000001b2', 'd2@imas.edu.my'),
  ('00000000-0000-0000-0000-0000000001c3', 'd3@imas.edu.my');
insert into public.students (id, student_id, full_name, track_id, current_grade, academic_year, blocked) values
  ('00000000-0000-0000-0000-0000000001a1', 'D1', 'CAN Grade 11', 'can-g10', 11, '2026-2027', false),
  ('00000000-0000-0000-0000-0000000001b2', 'D2', 'Dual Grade 10', 'cad-sci-g10', 10, '2026-2027', false),
  ('00000000-0000-0000-0000-0000000001c3', 'D3', 'Blocked CAN Grade 11', 'can-g10', 11, '2026-2027', true);

insert into public.documents (id, title, url, audience, for_tracks, for_grades, published) values
  ('doc-everyone', 'Handbook', 'https://example.com/a', 'everyone', '{}', '{}', true),
  ('doc-can-11', 'CAN Grade 11 timetable', 'https://example.com/b', 'students', '{can-g10,can-g11}', '{11}', true),
  ('doc-grade-10', 'Grade 10 guide', 'https://example.com/c', 'students', '{}', '{10}', true),
  ('doc-all-students', 'Portal guide', 'https://example.com/d', 'students', '{}', '{}', true),
  ('doc-hidden', 'Draft', 'https://example.com/e', 'students', '{}', '{}', false);

-- Grades must be 10, 11 or 12; the audience must be one of the two choices.
do $$ begin
  begin
    insert into public.documents (id, title, url, audience, for_grades) values ('bad-grade', 'x', 'https://x', 'students', '{9}');
    raise exception 'grade 9 accepted';
  exception when check_violation then null; end;
  begin
    insert into public.documents (id, title, url, audience) values ('bad-audience', 'x', 'https://x', 'parents');
    raise exception 'unknown audience accepted';
  exception when check_violation then null; end;
end $$;

-- Visitors: only documents for everyone.
set role anon;
set request.jwt.claims = '';
do $$ begin
  if (select array_agg(id order by id) from public.documents where id like 'doc-%') <> array['doc-everyone'] then
    raise exception 'visitor should see only the document for everyone';
  end if;
end $$;
reset role;

-- A CAN student now in Grade 11: everyone + their batch + all students.
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000001a1","email":"d1@imas.edu.my"}';
do $$ begin
  if (select array_agg(id order by id) from public.documents where id like 'doc-%') <> array['doc-all-students', 'doc-can-11', 'doc-everyone'] then
    raise exception 'CAN Grade 11 student sees the wrong documents: %', (select array_agg(id order by id) from public.documents where id like 'doc-%');
  end if;
  begin
    update public.documents set title = 'changed' where id = 'doc-can-11';
    if found then raise exception 'student changed a document'; end if;
  exception when insufficient_privilege then null; end;
end $$;

-- A Dual Program Grade 10 student: not the CAN Grade 11 document.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000001b2","email":"d2@imas.edu.my"}';
do $$ begin
  if (select array_agg(id order by id) from public.documents where id like 'doc-%') <> array['doc-all-students', 'doc-everyone', 'doc-grade-10'] then
    raise exception 'Dual Grade 10 student sees the wrong documents: %', (select array_agg(id order by id) from public.documents where id like 'doc-%');
  end if;
end $$;

-- A blocked student: only what visitors see.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000001c3","email":"d3@imas.edu.my"}';
do $$ begin
  if (select array_agg(id order by id) from public.documents where id like 'doc-%') <> array['doc-everyone'] then
    raise exception 'blocked student should see only the document for everyone';
  end if;
end $$;

-- Editors see every document, hidden ones included.
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ed","email":"editor@imas.edu.my"}';
do $$ begin
  if (select count(*) from public.documents where id like 'doc-%') <> 5 then raise exception 'editor should see all 5 documents'; end if;
end $$;
reset role;

select 'All document checks passed' as result;
