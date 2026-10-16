-- Checks the security rules. Each block raises an error if a rule doesn't hold.
\set ON_ERROR_STOP on

-- Visitors (anon) can read the academic plan.
set role anon;
do $$ begin
  if (select count(*) from public.courses) <> 34 then raise exception 'anon should see 34 courses'; end if;
  if (select count(*) from public.placements) <> 161 then raise exception 'anon should see 161 placements'; end if;
  if (select count(*) from public.tracks) <> 6 then raise exception 'anon should see 6 tracks'; end if;
end $$;
-- Visitors cannot change anything.
do $$ begin
  begin
    insert into public.faqs (id, question, answer) values ('x', 'q', 'a');
    raise exception 'anon insert should have failed';
  exception when insufficient_privilege then null; end;
end $$;
-- Visitors cannot see the editors list.
do $$ begin
  begin
    perform count(*) from public.admins;
    raise exception 'anon should not read admins';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Hidden content is hidden from visitors.
update public.faqs set published = false where id = 'fees';
set role anon;
do $$ begin
  if exists (select 1 from public.faqs where id = 'fees') then raise exception 'unpublished faq visible to anon'; end if;
end $$;
reset role;

-- A signed-in user who is not an editor cannot change content.
set role authenticated;
set request.jwt.claims = '{"email":"student@imas.edu.my"}';
do $$ begin
  begin
    insert into public.faqs (id, question, answer) values ('x', 'q', 'a');
    raise exception 'non-editor insert should have failed';
  exception when insufficient_privilege then null; end;
  update public.courses set name = 'Hacked' where id = 'civics';
  if (select name from public.courses where id = 'civics') = 'Hacked' then raise exception 'non-editor update went through'; end if;
  if exists (select 1 from public.admins) then raise exception 'non-editor can read admins'; end if;
end $$;
reset role;

-- An editor (email matched case-insensitively) can edit and sees hidden rows.
insert into public.admins (email) values ('editor@imas.edu.my');
set role authenticated;
set request.jwt.claims = '{"email":"Editor@IMAS.edu.my"}';
do $$ begin
  if not public.is_admin() then raise exception 'editor not recognised'; end if;
  insert into public.faqs (id, question, answer) values ('test-q', 'Test?', 'Yes.');
  update public.site_settings set data = data || '{"ielts_min_band": 6.5}'::jsonb where id = 1;
  if not exists (select 1 from public.faqs where id = 'fees') then raise exception 'editor should see unpublished rows'; end if;
  if (select count(*) from public.admins) <> 1 then raise exception 'editor should read admins'; end if;
  -- Deleting a course removes it from every track.
  delete from public.courses where id = 'civics';
  if exists (select 1 from public.placements where course_id = 'civics') then raise exception 'placements not removed with course'; end if;
end $$;
reset role;

-- updated_at changes on edit.
do $$ begin
  if (select updated_at from public.site_settings where id = 1) < now() - interval '1 minute' then raise exception 'updated_at not maintained'; end if;
end $$;

select 'Content security checks passed' as result;

-- ---------------------------------------------------------------------------
-- Student accounts (0002_students.sql)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, encrypted_password) values
  ('00000000-0000-0000-0000-00000000000a', '260001@imas.edu.my', extensions.crypt('080512101234', extensions.gen_salt('bf'))),
  ('00000000-0000-0000-0000-00000000000b', '260002@imas.edu.my', extensions.crypt('A12345678', extensions.gen_salt('bf')));
insert into public.students (id, student_id, full_name, track_id) values
  ('00000000-0000-0000-0000-00000000000a', '260001', 'Aisha Rahman', 'can-g10'),
  ('00000000-0000-0000-0000-00000000000b', '260002', 'Daniel Lim', null);

-- The same Student ID can't be used twice, whatever the letter case.
do $$ begin
  begin
    insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'x@imas.edu.my'), ('00000000-0000-0000-0000-00000000000d', 'y@imas.edu.my');
    insert into public.students (id, student_id, full_name) values ('00000000-0000-0000-0000-00000000000c', 'Ab12', 'First');
    insert into public.students (id, student_id, full_name) values ('00000000-0000-0000-0000-00000000000d', 'aB12', 'Copy');
    raise exception 'duplicate student id accepted';
  exception when unique_violation then null; end;
end $$;

-- Visitors can't see student records.
set role anon;
do $$ begin
  begin
    perform count(*) from public.students;
    raise exception 'anon should not read students';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- A student sees only their own record and can't change it or unlock their portal.
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","email":"260001@imas.edu.my"}';
do $$ begin
  if (select count(*) from public.students) <> 1 then raise exception 'student should see exactly their own record'; end if;
  if (select student_id from public.students) <> '260001' then raise exception 'student sees the wrong record'; end if;
  begin
    update public.students set must_change_password = false;
    raise exception 'student could clear must_change_password';
  exception when insufficient_privilege then null; end;
  update public.students set full_name = 'Changed';
  if (select full_name from public.students) = 'Changed' then raise exception 'student could rename themselves'; end if;
  begin
    insert into public.students (id, student_id, full_name) values ('00000000-0000-0000-0000-00000000000b', 'new', 'New');
    raise exception 'student could add a record';
  exception when insufficient_privilege then null; end;
  begin
    perform public.is_current_password('00000000-0000-0000-0000-00000000000a', '080512101234');
    raise exception 'student could call is_current_password';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- An editor sees every student and can change name and cohort, but not the password flag.
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ed","email":"editor@imas.edu.my"}';
do $$ begin
  if (select count(*) from public.students) <> 2 then raise exception 'editor should see all students'; end if;
  update public.students set full_name = 'Daniel Lim Wei', track_id = 'cad-sci-g11' where student_id = '260002';
  if (select full_name from public.students where student_id = '260002') <> 'Daniel Lim Wei' then raise exception 'editor could not rename'; end if;
  begin
    update public.students set must_change_password = false where student_id = '260002';
    raise exception 'editor could clear must_change_password directly';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.students where student_id = '260002';
    raise exception 'editor could delete a record without removing the account';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- The server function (service role) checks passwords and manages records.
set role service_role;
do $$ begin
  if not public.is_current_password('00000000-0000-0000-0000-00000000000a', '080512101234') then raise exception 'current password not recognised'; end if;
  if public.is_current_password('00000000-0000-0000-0000-00000000000a', 'MyNewPass1') then raise exception 'wrong password matched'; end if;
  update public.students set must_change_password = false where student_id = '260001';
end $$;
reset role;

-- Removing a sign-in account removes the student record; removing a track clears the cohort.
do $$ begin
  delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
  if exists (select 1 from public.students where student_id = '260001') then raise exception 'record not removed with account'; end if;
  delete from public.tracks where id = 'cad-sci-g11';
  if (select track_id from public.students where student_id = '260002') is not null then raise exception 'track_id not cleared'; end if;
end $$;

select 'All security checks passed' as result;
