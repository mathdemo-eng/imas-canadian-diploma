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

select 'All security checks passed' as result;
