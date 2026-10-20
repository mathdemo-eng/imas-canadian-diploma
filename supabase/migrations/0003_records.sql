-- IMAS Canadian Diploma website: student records (Stage 2).
-- Run once in Supabase → SQL Editor, after 0001_content.sql and 0002_students.sql.
--
-- What it adds
--   • Where each student is: grade, academic year, enrolment status, academic advisor,
--     IELTS band, and whether their portal access is blocked.
--   • Teachers: the staff directory used for course teachers and Grade 12 advisors.
--   • Subjects and grades: one record per student, course and academic year, with an
--     optional mark kept in a separate table.
--   • Course feedback from students, and a log of promotions (so a promotion can be undone).
--
-- Security model
--   • A student reads only their own records, and nothing at all while blocked.
--   • A student sees a course's mark only after sending feedback on that course
--     (unless the setting "feedback_required" is switched off). The database enforces this.
--   • Feedback answers are visible to editors only; students can add, never change, them.
--   • Editors (public.admins) can read and change everything else.

-- ---------------------------------------------------------------------------
-- Teachers (course teachers and academic advisors)
-- ---------------------------------------------------------------------------
create table if not exists public.teachers (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null check (length(trim(full_name)) > 0),
  email          text not null default '',
  title          text not null default '',
  subjects       text not null default '',
  qualifications text[] not null default '{}',
  experience     text not null default '',
  joined_imas    int check (joined_imas between 1980 and 2100),
  -- A small photo stored as a data: URL (the admin panel resizes it before saving).
  photo          text not null default '' check (length(photo) < 400000),
  active         boolean not null default true,
  sort           int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Where each student is in the programme
-- ---------------------------------------------------------------------------
alter table public.students
  add column if not exists current_grade    int check (current_grade in (10, 11, 12)),
  add column if not exists academic_year    text check (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  add column if not exists enrolment_status text not null default 'active' check (enrolment_status in ('active', 'graduated', 'withdrawn')),
  add column if not exists graduated_year   text check (graduated_year ~ '^[0-9]{4}-[0-9]{4}$'),
  add column if not exists advisor_id       uuid references public.teachers (id) on delete set null,
  add column if not exists ielts_band       numeric(2,1) check (ielts_band between 0 and 9),
  add column if not exists blocked          boolean not null default false;

-- Staff-only notes about a student (for example, why the account is blocked).
create table if not exists public.student_notes (
  student_id     uuid primary key references public.students (id) on delete cascade,
  blocked_reason text not null default '',
  notes          text not null default '',
  updated_at     timestamptz not null default now()
);

-- True when the signed-in user is a student whose access isn't blocked.
create or replace function public.is_active_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.students where id = auth.uid() and not blocked);
$$;

-- Whether students must give feedback before seeing a mark (site setting, on by default).
create or replace function public.feedback_required()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (data ->> 'feedback_required')::boolean from public.site_settings where id = 1), true);
$$;

-- ---------------------------------------------------------------------------
-- Promotions (one row per decision, so it can be reviewed or undone)
-- ---------------------------------------------------------------------------
create table if not exists public.promotions (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students (id) on delete cascade,
  decision    text not null check (decision in ('promoted', 'repeated', 'graduated', 'withdrawn')),
  from_grade  int,
  to_grade    int,
  from_year   text,
  to_year     text,
  from_status text not null default 'active',
  note        text not null default '',
  decided_by  text not null default '',
  decided_at  timestamptz not null default now(),
  undone_at   timestamptz
);
create index if not exists promotions_student_idx on public.promotions (student_id);

-- ---------------------------------------------------------------------------
-- Subjects (one row per student, course and academic year) and marks
-- ---------------------------------------------------------------------------
create table if not exists public.student_courses (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students (id) on delete cascade,
  -- A course with student records can't be deleted from the catalogue.
  course_id     text not null references public.courses (id) on update cascade on delete restrict,
  academic_year text not null check (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  grade_level   int  not null check (grade_level in (10, 11, 12)),
  term          text not null default 'FY' check (term in ('FY', 'S1', 'S2')),
  status        text not null default 'upcoming' check (status in ('upcoming', 'in_progress', 'completed', 'withdrawn')),
  attempt       int  not null default 1 check (attempt between 1 and 9),
  teacher_id    uuid references public.teachers (id) on delete set null,
  -- Whether a mark has been entered (kept up to date automatically). Lets a student see
  -- that a result is waiting without seeing the mark itself.
  has_mark      boolean not null default false,
  promotion_id  uuid references public.promotions (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (student_id, course_id, academic_year)
);
create index if not exists student_courses_student_idx on public.student_courses (student_id);

create table if not exists public.course_marks (
  student_course_id uuid primary key references public.student_courses (id) on delete cascade,
  mark              numeric(5,2) not null check (mark between 0 and 100),
  ca_mark           numeric(5,2) check (ca_mark between 0 and 100),
  exam_mark         numeric(5,2) check (exam_mark between 0 and 100),
  updated_at        timestamptz not null default now()
);

create or replace function public.sync_has_mark()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.student_courses set has_mark = false where id = old.student_course_id;
    return old;
  end if;
  update public.student_courses set has_mark = true where id = new.student_course_id;
  return new;
end;
$$;
drop trigger if exists course_marks_has_mark on public.course_marks;
create trigger course_marks_has_mark after insert or update or delete on public.course_marks
  for each row execute function public.sync_has_mark();

-- ---------------------------------------------------------------------------
-- Course feedback
-- ---------------------------------------------------------------------------
create table if not exists public.course_feedback (
  student_course_id uuid primary key references public.student_courses (id) on delete cascade,
  student_id        uuid not null references public.students (id) on delete cascade,
  course_id         text not null default '',
  academic_year     text not null default '',
  teacher_id        uuid references public.teachers (id) on delete set null,
  answers           jsonb not null check (jsonb_typeof(answers) = 'object'),
  submitted_at      timestamptz not null default now()
);

-- Course, year and teacher always come from the student's record, never from the form.
create or replace function public.fill_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare sc public.student_courses;
begin
  select * into sc from public.student_courses where id = new.student_course_id;
  new.course_id := sc.course_id;
  new.academic_year := sc.academic_year;
  new.teacher_id := sc.teacher_id;
  new.submitted_at := now();
  return new;
end;
$$;
drop trigger if exists course_feedback_fill on public.course_feedback;
create trigger course_feedback_fill before insert on public.course_feedback
  for each row execute function public.fill_feedback();

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['teachers', 'student_notes', 'student_courses', 'course_marks'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.teachers        enable row level security;
alter table public.student_notes   enable row level security;
alter table public.promotions      enable row level security;
alter table public.student_courses enable row level security;
alter table public.course_marks    enable row level security;
alter table public.course_feedback enable row level security;

-- Editors manage everything in these tables.
do $$
declare t text;
begin
  foreach t in array array['teachers', 'student_notes', 'promotions', 'student_courses', 'course_marks'] loop
    execute format('drop policy if exists "Editors manage" on public.%I', t);
    execute format('create policy "Editors manage" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "Students see active teachers" on public.teachers;
create policy "Students see active teachers" on public.teachers
  for select using (active and public.is_active_student());

drop policy if exists "Students see their own subjects" on public.student_courses;
create policy "Students see their own subjects" on public.student_courses
  for select using (student_id = auth.uid() and public.is_active_student());

drop policy if exists "Students see a mark after giving feedback" on public.course_marks;
create policy "Students see a mark after giving feedback" on public.course_marks
  for select using (
    public.is_active_student() and exists (
      select 1 from public.student_courses sc
      where sc.id = course_marks.student_course_id
        and sc.student_id = auth.uid()
        and (not public.feedback_required()
             or exists (select 1 from public.course_feedback f where f.student_course_id = sc.id))
    )
  );

drop policy if exists "Students send feedback on their completed courses" on public.course_feedback;
drop policy if exists "Students see which feedback they sent" on public.course_feedback;
drop policy if exists "Editors read feedback" on public.course_feedback;
drop policy if exists "Editors remove feedback" on public.course_feedback;
create policy "Students send feedback on their completed courses" on public.course_feedback
  for insert with check (
    student_id = auth.uid() and public.is_active_student() and exists (
      select 1 from public.student_courses sc
      where sc.id = course_feedback.student_course_id and sc.student_id = auth.uid() and sc.status = 'completed'
    )
  );
create policy "Students see which feedback they sent" on public.course_feedback
  for select using (student_id = auth.uid() and public.is_active_student());
create policy "Editors read feedback" on public.course_feedback for select using (public.is_admin());
create policy "Editors remove feedback" on public.course_feedback for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Privileges for Supabase's API roles (RLS above still decides row by row)
-- ---------------------------------------------------------------------------
revoke all on public.teachers, public.student_notes, public.promotions, public.student_courses,
              public.course_marks, public.course_feedback from anon, authenticated;
grant select, insert, update, delete on public.teachers, public.student_notes, public.promotions,
                                        public.student_courses, public.course_marks to authenticated;
grant select, insert, delete on public.course_feedback to authenticated;
grant select, insert, update, delete on public.teachers, public.student_notes, public.promotions,
                                        public.student_courses, public.course_marks, public.course_feedback to service_role;

-- Editors may also set a student's grade, year, status, advisor and IELTS band.
-- Blocking goes through the manage-students server function, which also stops sign-in.
grant update (full_name, track_id, current_grade, academic_year, enrolment_status, graduated_year, advisor_id, ielts_band)
  on public.students to authenticated;

revoke all on function public.is_active_student() from public, anon;
grant execute on function public.is_active_student() to authenticated, service_role;
grant execute on function public.feedback_required() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
