-- IMAS Canadian Diploma website: content tables (Stage 1).
-- Run once in Supabase → SQL Editor, then run supabase/seed.sql.
--
-- Security model
--   • Anyone can read published content (the public website).
--   • Only people listed in public.admins can add, change or delete content.
--   • Staff sign in with their email and password; their email must be in public.admins.
--
-- Student accounts are added by 0002_students.sql. Later Stage 2 migrations will add
-- enrolments, grades, ielts_results and advisor_notes. Nothing here needs to change for that.

-- ---------------------------------------------------------------------------
-- Editors
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  email    text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);

-- True when the signed-in user's email is listed in public.admins.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Keeps updated_at current on every change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id           text primary key,
  name         text not null,
  code         text not null default '',
  cluster      text not null check (cluster in ('language-arts', 'humanities', 'sciences', 'mathematics', 'creative-arts', 'wellness', 'career', 'school', 'prep')),
  kind         text not null check (kind in ('nb', 'school', 'prep')),
  credit_hours int  not null default 4 check (credit_hours >= 0),
  description  text not null default '',
  sort         int  not null default 0,
  updated_at   timestamptz not null default now()
);

create table if not exists public.tracks (
  id             text primary key,
  name           text not null,
  stream         text not null check (stream in ('CAN', 'CAD')),
  focus          text check (focus in ('science', 'commerce')),
  entry_grade    int  not null check (entry_grade in (10, 11)),
  duration_years int  not null check (duration_years between 1 and 4),
  stated_total   int  not null default 0 check (stated_total >= 0),
  summary        text not null default '',
  sort           int  not null default 0,
  updated_at     timestamptz not null default now()
);

-- Which course each track takes, in which grade and semester.
-- Deleting a course or a track removes its placements too.
create table if not exists public.placements (
  id         text primary key,
  track_id   text not null references public.tracks (id) on update cascade on delete cascade,
  grade      int  not null check (grade in (10, 11, 12)),
  term       text not null check (term in ('FY', 'S1', 'S2')),
  slot       int  not null default 0,
  course_id  text not null references public.courses (id) on update cascade on delete cascade,
  extension  boolean not null default false,
  note       text not null default '',
  updated_at timestamptz not null default now()
);
create index if not exists placements_track_idx on public.placements (track_id);
create index if not exists placements_course_idx on public.placements (course_id);

create table if not exists public.partners (
  id               text primary key,
  name             text not null,
  location         text not null default '',
  website          text not null default '',
  figure           text not null default '',
  figure_label     text not null default '',
  summary          text not null default '',
  highlights       text[] not null default '{}',
  eligibility_note text not null default '',
  contact_email    text not null default '',
  image_url        text not null default '',
  image_credit     text not null default '',
  sort             int  not null default 0,
  published        boolean not null default true,
  updated_at       timestamptz not null default now()
);

create table if not exists public.faqs (
  id         text primary key,
  question   text not null,
  answer     text not null,
  audience   text not null default 'all' check (audience in ('all', 'new', 'current')),
  sort       int  not null default 0,
  published  boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id           text primary key,
  title        text not null,
  body         text not null,
  audience     text not null default 'current' check (audience in ('all', 'new', 'current')),
  published_at date not null default current_date,
  published    boolean not null default true,
  updated_at   timestamptz not null default now()
);

create table if not exists public.documents (
  id          text primary key,
  title       text not null,
  description text not null default '',
  url         text not null,
  category    text not null default '',
  sort        int  not null default 0,
  published   boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['site_settings', 'courses', 'tracks', 'placements', 'partners', 'faqs', 'announcements', 'documents'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.admins        enable row level security;
alter table public.site_settings enable row level security;
alter table public.courses       enable row level security;
alter table public.tracks        enable row level security;
alter table public.placements    enable row level security;
alter table public.partners      enable row level security;
alter table public.faqs          enable row level security;
alter table public.announcements enable row level security;
alter table public.documents     enable row level security;

do $$
declare t text;
begin
  -- Always public: settings and the academic plan.
  foreach t in array array['site_settings', 'courses', 'tracks', 'placements'] loop
    execute format('drop policy if exists "Anyone can read" on public.%I', t);
    execute format('create policy "Anyone can read" on public.%I for select using (true)', t);
  end loop;

  -- Public only when published; editors see everything.
  foreach t in array array['partners', 'faqs', 'announcements', 'documents'] loop
    execute format('drop policy if exists "Anyone can read published" on public.%I', t);
    execute format('create policy "Anyone can read published" on public.%I for select using (published or public.is_admin())', t);
  end loop;

  -- Only editors can change content.
  foreach t in array array['site_settings', 'courses', 'tracks', 'placements', 'partners', 'faqs', 'announcements', 'documents'] loop
    execute format('drop policy if exists "Editors can add" on public.%I', t);
    execute format('drop policy if exists "Editors can change" on public.%I', t);
    execute format('drop policy if exists "Editors can delete" on public.%I', t);
    execute format('create policy "Editors can add" on public.%I for insert with check (public.is_admin())', t);
    execute format('create policy "Editors can change" on public.%I for update using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "Editors can delete" on public.%I for delete using (public.is_admin())', t);
  end loop;
end $$;

-- Editors can see and manage the list of editors.
drop policy if exists "Editors can read editors" on public.admins;
drop policy if exists "Editors can add editors" on public.admins;
drop policy if exists "Editors can remove editors" on public.admins;
create policy "Editors can read editors" on public.admins for select using (public.is_admin());
create policy "Editors can add editors" on public.admins for insert with check (public.is_admin());
create policy "Editors can remove editors" on public.admins for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Privileges for Supabase's API roles (RLS above still decides row by row)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.site_settings, public.courses, public.tracks, public.placements,
                public.partners, public.faqs, public.announcements, public.documents to anon, authenticated;
grant insert, update, delete on public.site_settings, public.courses, public.tracks, public.placements,
                public.partners, public.faqs, public.announcements, public.documents to authenticated;
grant select, insert, delete on public.admins to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
