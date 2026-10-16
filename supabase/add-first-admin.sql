-- Make yourself the first editor. First create your sign-in in Supabase →
-- Authentication → Users → Add user → Create new user (tick "Auto Confirm User").
-- Then replace the email below with that same email, in lower-case letters,
-- and run this once in Supabase → SQL Editor.
insert into public.admins (email)
values ('your.name@imas.edu.my')
on conflict (email) do nothing;

-- To add another editor later, create their sign-in the same way, then run this
-- statement with their email (or add a row in Table Editor → admins).
