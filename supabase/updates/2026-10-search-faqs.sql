-- Update for an existing site (October 2026). Paste all of it into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

-- 1. Four questions phrased the way families (and AI assistants) ask them. They appear on the Questions page.
insert into public.faqs (id, audience, question, answer, sort, published) values
  ('where-in-malaysia', 'new', 'Where can I study for a Canadian high school diploma in Malaysia?', 'At IMAS International School. IMAS teaches the official New Brunswick (Canada) High School Diploma and is the first school in Malaysia accredited by New Brunswick. You study the New Brunswick curriculum at IMAS and graduate with the same diploma as students in Canada.', 15, true),
  ('accreditation', 'new', 'Who accredits the Canadian Diploma at IMAS?', 'The Province of New Brunswick, through Atlantic Education International (AEI), its government-owned agency that accredits schools around the world to teach the New Brunswick curriculum. AEI inspects the programme at IMAS every year.', 25, true),
  ('igcse-and-canadian', 'new', 'Can I take the IGCSE and a Canadian diploma together?', 'Yes, in the Dual Program (CAD). You take the Cambridge IGCSE with Canadian courses alongside, then complete the Canadian Grade 12 year, and graduate with both the IGCSE certificate and the New Brunswick High School Diploma. Choose the Science or the Commerce stream.', 35, true),
  ('how-long', 'new', 'How long does it take to earn the Canadian Diploma?', 'At least two years. If you join in Grade 10 you study for three years (Grades 10 to 12); if you join in Grade 11 you study for two years (Grades 11 and 12).', 45, true)
on conflict (id) do nothing;

-- 2. Attendance is at least 90% (school rule, October 2026): the setting and the FAQ answer.
update public.site_settings set data = jsonb_set(data, '{attendance_min}', '90') where id = 1;
update public.faqs set answer = replace(answer, 'at least 80% attendance', 'at least 90% attendance') where id = 'attendance';
