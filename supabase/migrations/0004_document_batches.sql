-- IMAS Canadian Diploma website: documents for chosen batches of students.
-- Run once in Supabase → SQL Editor, after 0003_records.sql. Safe to run again.
--
-- What it adds
--   • Each document is either for everyone (listed on the public Student Hub page, as before)
--     or only for chosen batches: students in the ticked cohorts and/or current grades.
--     An empty list means "all of them" (no cohort ticked = every cohort).
--   • The database decides who can read a batch document: editors, and signed-in students
--     whose cohort and current grade match. Visitors and other students never receive it.

alter table public.documents
  add column if not exists audience   text  not null default 'everyone',
  add column if not exists for_tracks text[] not null default '{}',
  add column if not exists for_grades int[]  not null default '{}';

alter table public.documents drop constraint if exists documents_audience_check;
alter table public.documents add constraint documents_audience_check check (audience in ('everyone', 'students'));
alter table public.documents drop constraint if exists documents_for_grades_check;
alter table public.documents add constraint documents_for_grades_check check (for_grades <@ array[10, 11, 12]);

-- True when the signed-in reader may see a document with this audience.
create or replace function public.can_read_document(p_audience text, p_tracks text[], p_grades int[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_audience = 'everyone'
      or exists (
        select 1
        from public.students s
        where s.id = auth.uid()
          and not s.blocked
          and (cardinality(p_tracks) = 0 or s.track_id = any (p_tracks))
          and (cardinality(p_grades) = 0 or s.current_grade = any (p_grades))
      );
$$;

revoke all on function public.can_read_document(text, text[], int[]) from public;
grant execute on function public.can_read_document(text, text[], int[]) to anon, authenticated;

drop policy if exists "Anyone can read published" on public.documents;
drop policy if exists "Readers see the documents meant for them" on public.documents;
create policy "Readers see the documents meant for them" on public.documents
  for select using (public.is_admin() or (published and public.can_read_document(audience, for_tracks, for_grades)));
