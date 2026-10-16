-- IMAS Canadian Diploma website: Student Portal accounts.
-- Run once in Supabase → SQL Editor, after 0001_content.sql.
--
-- How student sign-in works
--   • Each student has a sign-in account <Student ID>@imas.edu.my. The first password is
--     their ID number. Accounts are created by the manage-students server function
--     (supabase/functions/manage-students), never by visitors.
--   • must_change_password stays true until the student creates their own password.
--     Only the server function can change it, and only while setting a new password,
--     so the portal can't be unlocked without one.
--
-- Security model
--   • A student can read their own record and nothing else.
--   • Editors (public.admins) can read every record and change a student's name and cohort.
--   • Creating accounts, passwords and removing students go through the server function.

create table if not exists public.students (
  id                   uuid primary key references auth.users (id) on delete cascade,
  student_id           text not null check (student_id ~ '^[A-Za-z0-9._-]+$'),
  full_name            text not null check (length(trim(full_name)) > 0),
  track_id             text references public.tracks (id) on update cascade on delete set null,
  must_change_password boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists students_student_id_key on public.students (lower(student_id));

drop trigger if exists students_updated_at on public.students;
create trigger students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.students enable row level security;

drop policy if exists "Students read their own record" on public.students;
drop policy if exists "Editors change student records" on public.students;
create policy "Students read their own record" on public.students
  for select using (id = auth.uid() or public.is_admin());
create policy "Editors change student records" on public.students
  for update using (public.is_admin()) with check (public.is_admin());

-- Privileges: visitors get nothing; signed-in users may read (rows limited above) and
-- editors may change only the name and cohort. The server function uses the service role.
revoke all on public.students from anon, authenticated;
grant select on public.students to authenticated;
grant update (full_name, track_id) on public.students to authenticated;
grant select, insert, update, delete on public.students to service_role;

-- ---------------------------------------------------------------------------
-- Used by the server function to stop a student "changing" to the same password.
-- ---------------------------------------------------------------------------
create or replace function public.is_current_password(p_user uuid, p_password text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = p_user
      and u.encrypted_password is not null
      and u.encrypted_password = extensions.crypt(p_password, u.encrypted_password)
  );
$$;
revoke all on function public.is_current_password(uuid, text) from public, anon, authenticated;
grant execute on function public.is_current_password(uuid, text) to service_role;
