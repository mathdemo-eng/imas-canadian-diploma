-- Checks the student-records rules (0003_records.sql). Run after rls-test.sql.
\set ON_ERROR_STOP on

-- Two students, a teacher, and some subjects with marks.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 's1@imas.edu.my'),
  ('00000000-0000-0000-0000-0000000000b2', 's2@imas.edu.my');
insert into public.students (id, student_id, full_name, track_id, current_grade, academic_year) values
  ('00000000-0000-0000-0000-0000000000a1', 'S1', 'Student One', 'can-g10', 10, '2026-2027'),
  ('00000000-0000-0000-0000-0000000000b2', 'S2', 'Student Two', 'can-g10', 10, '2026-2027');
insert into public.teachers (id, full_name, email) values ('00000000-0000-0000-0000-00000000007e', 'Ms Teacher', 't@imas.edu.my');
insert into public.teachers (full_name, active) values ('Former Teacher', false);
insert into public.student_courses (id, student_id, course_id, academic_year, grade_level, status, teacher_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'biology-111', '2026-2027', 10, 'completed', '00000000-0000-0000-0000-00000000007e'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 'physics-111', '2026-2027', 10, 'completed', null),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a1', 'chemistry-111', '2026-2027', 10, 'upcoming', null),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b2', 'biology-111', '2026-2027', 10, 'completed', null);
insert into public.course_marks (student_course_id, mark) values
  ('00000000-0000-0000-0000-0000000000c1', 75), ('00000000-0000-0000-0000-0000000000c2', 50), ('00000000-0000-0000-0000-0000000000d1', 80);
insert into public.student_notes (student_id, blocked_reason) values ('00000000-0000-0000-0000-0000000000a1', 'Fees outstanding');

-- The same course can't be recorded twice for one student in one year.
do $$ begin
  begin
    insert into public.student_courses (student_id, course_id, academic_year, grade_level) values
      ('00000000-0000-0000-0000-0000000000a1', 'biology-111', '2026-2027', 10);
    raise exception 'duplicate subject accepted';
  exception when unique_violation then null; end;
  if not (select has_mark from public.student_courses where id = '00000000-0000-0000-0000-0000000000c1') then raise exception 'has_mark not set'; end if;
end $$;

-- Visitors see none of it.
set role anon;
do $$ begin
  begin perform count(*) from public.student_courses; raise exception 'anon read subjects'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.teachers; raise exception 'anon read teachers'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- A student sees only their own subjects, and no marks until they give feedback.
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"s1@imas.edu.my"}';
do $$ begin
  if (select count(*) from public.student_courses) <> 3 then raise exception 'student should see 3 own subjects'; end if;
  if (select count(*) from public.course_marks) <> 0 then raise exception 'marks visible before feedback'; end if;
  if (select count(*) from public.teachers) <> 1 then raise exception 'student should see only active teachers'; end if;
  if exists (select 1 from public.student_notes) then raise exception 'student can read staff notes'; end if;
  if exists (select 1 from public.promotions) then raise exception 'student can read promotions'; end if;

  -- Feedback on a completed course unlocks that course's mark only. Course and teacher come from the record.
  insert into public.course_feedback (student_course_id, student_id, course_id, answers)
    values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'fake-course', '{"q1": 5}');
  if (select course_id from public.course_feedback where student_course_id = '00000000-0000-0000-0000-0000000000c1') <> 'biology-111' then raise exception 'feedback course not taken from the record'; end if;
  if (select teacher_id from public.course_feedback where student_course_id = '00000000-0000-0000-0000-0000000000c1') <> '00000000-0000-0000-0000-00000000007e' then raise exception 'feedback teacher not taken from the record'; end if;
  if (select count(*) from public.course_marks) <> 1 then raise exception 'exactly one mark should be unlocked'; end if;
  if (select mark from public.course_marks) <> 75 then raise exception 'wrong mark unlocked'; end if;

  -- Feedback only once, only on their own completed courses, and never changed.
  begin
    insert into public.course_feedback (student_course_id, student_id, answers) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '{}');
    raise exception 'feedback sent twice';
  exception when unique_violation then null; end;
  begin
    insert into public.course_feedback (student_course_id, student_id, answers) values ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a1', '{}');
    raise exception 'feedback on an unfinished course';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.course_feedback (student_course_id, student_id, answers) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', '{}');
    raise exception 'feedback on another student''s course';
  exception when insufficient_privilege then null; end;
  begin
    update public.course_feedback set answers = '{"q1": 1}';
    raise exception 'student changed feedback';
  exception when insufficient_privilege then null; end;

  -- Students can't change their records, marks, grade or block status.
  begin
    insert into public.course_marks (student_course_id, mark) values ('00000000-0000-0000-0000-0000000000c3', 99);
    raise exception 'student added a mark';
  exception when insufficient_privilege then null; end;
  update public.student_courses set status = 'completed' where id = '00000000-0000-0000-0000-0000000000c3';
  update public.students set current_grade = 12;
  begin
    update public.students set blocked = false;
    raise exception 'student changed blocked';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if (select status from public.student_courses where id = '00000000-0000-0000-0000-0000000000c3') <> 'upcoming' then raise exception 'student changed a subject'; end if;
  if (select current_grade from public.students where student_id = 'S1') <> 10 then raise exception 'student changed their grade'; end if;
end $$;

-- With the feedback rule switched off, every mark is visible.
update public.site_settings set data = data || '{"feedback_required": false}'::jsonb where id = 1;
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"s1@imas.edu.my"}';
do $$ begin
  if (select count(*) from public.course_marks) <> 2 then raise exception 'feedback switch ignored'; end if;
end $$;
reset role;
update public.site_settings set data = data - 'feedback_required' where id = 1;

-- A blocked student sees nothing but their own account row.
update public.students set blocked = true where student_id = 'S1';
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"s1@imas.edu.my"}';
do $$ begin
  if (select count(*) from public.student_courses) <> 0 then raise exception 'blocked student sees subjects'; end if;
  if (select count(*) from public.course_marks) <> 0 then raise exception 'blocked student sees marks'; end if;
  if (select count(*) from public.teachers) <> 0 then raise exception 'blocked student sees teachers'; end if;
  if (select count(*) from public.students) <> 1 then raise exception 'blocked student should still see their account'; end if;
end $$;
reset role;
update public.students set blocked = false where student_id = 'S1';

-- Editors see and manage everything, but can't change block status directly.
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ed","email":"editor@imas.edu.my"}';
do $$ begin
  if (select count(*) from public.course_marks) <> 3 then raise exception 'editor should see all marks'; end if;
  if (select blocked_reason from public.student_notes) <> 'Fees outstanding' then raise exception 'editor cannot read notes'; end if;
  if (select count(*) from public.course_feedback) <> 1 then raise exception 'editor cannot read feedback'; end if;
  if (select count(*) from public.teachers) <> 2 then raise exception 'editor should see all teachers'; end if;
  update public.students set current_grade = 11, academic_year = '2027-2028' where student_id = 'S2';
  if (select current_grade from public.students where student_id = 'S2') <> 11 then raise exception 'editor cannot promote'; end if;
  insert into public.promotions (student_id, decision, from_grade, to_grade) values ('00000000-0000-0000-0000-0000000000b2', 'promoted', 10, 11);
  insert into public.course_marks (student_course_id, mark) values ('00000000-0000-0000-0000-0000000000c3', 64);
  delete from public.course_marks where student_course_id = '00000000-0000-0000-0000-0000000000c2';
  begin
    update public.students set blocked = true where student_id = 'S2';
    raise exception 'editor changed blocked directly';
  exception when insufficient_privilege then null; end;
  -- A course with student records can't be deleted from the catalogue.
  begin
    delete from public.courses where id = 'biology-111';
    raise exception 'course with records deleted';
  exception when foreign_key_violation then null; end;
end $$;
reset role;
do $$ begin
  if (select has_mark from public.student_courses where id = '00000000-0000-0000-0000-0000000000c2') then raise exception 'has_mark not cleared'; end if;
  if not (select has_mark from public.student_courses where id = '00000000-0000-0000-0000-0000000000c3') then raise exception 'has_mark not set by editor'; end if;
  -- Removing a student's account removes their records.
  delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
  if exists (select 1 from public.student_courses where student_id = '00000000-0000-0000-0000-0000000000a1') then raise exception 'records left behind'; end if;
  if exists (select 1 from public.course_feedback where student_id = '00000000-0000-0000-0000-0000000000a1') then raise exception 'feedback left behind'; end if;
end $$;

select 'All student records checks passed' as result;
