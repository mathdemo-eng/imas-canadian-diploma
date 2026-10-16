-- Make yourself the first editor. Replace the email with your own IMAS Google account,
-- then run this once in Supabase → SQL Editor. Use lower-case letters.
insert into public.admins (email)
values ('your.name@imas.edu.my')
on conflict (email) do nothing;

-- To add another editor later, run the same statement with their email,
-- or (once signed in) ask Claude to add an "Editors" screen to the admin panel.
