# IMAS Canadian Diploma website

The guide to the New Brunswick (Canada) High School Diploma at IMAS International School, Malaysia, plus the Student Portal.
Owner: the Deputy Head of Secondary (Academic), who is **not a programmer**. Explain things in plain language, step by step, and name the exact buttons and screens.

- Live site: https://imas-canadian.netlify.app (admin at `/admin`, Student Portal at `/portal`)
- Hosting: Netlify (deploys automatically from `main` on GitHub). Database and sign-in: Supabase (Singapore).
- Hosting guide: `docs/HOSTING-AND-MAINTENANCE-GUIDE.md`
- **Next piece of work: the AI academic advisor (Claude Haiku), Phase B of `docs/STAGE-2-PLAN.md`.** Student records (Phase A) are built: read the plan before continuing.

## Student records rules (agreed October 2026)

- Staff see and edit every student's records; **View as student** (`/admin/students/:id/view`) shows the portal exactly as the student sees it.
- Blocking (Edge Function `block`/`unblock`) bans sign-in and hides records; the reason is staff-only (`student_notes`).
- Feedback gating is **per course**: a student sees a course's mark only after sending feedback on it (database policy on `course_marks`). The "Canadian Diploma Graduate" label needs feedback on every Grade 12 course. Switch: Site settings → `feedback_required`.
- Feedback results are anonymous; breakdowns need at least 3 responses.
- Subjects counted for graduation = NB courses in the cohort plan, excluding Grade 10 extensions; courses on one card count once (`src/lib/progress.ts`).
- Promotion is suggested (repeat from `repeat_threshold` courses not passed, default 3), staff decide, every decision is logged in `promotions` and the latest can be undone.
- The academic advisor is a real teacher (Teachers page), shown to students from Grade 12.

## Content rules from the school (final; they override older documents)

- CAN students have **no midterms**. Assessment: 60% continuous assessment (assignments, end-of-chapter tests, project) + 40% final exam. Pass mark 60%; attendance at least 90%.
- Semester 1: September–February. Semester 2: March–July.
- IELTS band 6 is required to graduate. The school prepares students for IELTS and arranges the exam.
- Minimum programme: 2 years (join in Grade 10 or Grade 11). Two streams: CAN, and the Dual Program (CAD = IGCSE + Canadian diploma).
- "Extension to Grade 10" courses are not new subjects. "Prep" courses prepare for the Grade 12 subjects.
- Bahasa Malaysia and Sejarah are **optional** subjects offered after school hours; they are not compulsory and not a graduation requirement (no Pendidikan Islam/Moral requirement either).
- Assessment: do not present "assessment for/of learning" (formative/summative); it was removed as confusing next to 60/40.
- Use the course totals stated in the school's subject document. Do not add subjects from the AEI requirements document.
- Partner universities (per AEI): St. Thomas, Mount Allison, Saint Mary's.
- No fees on the site; point to Admissions. English only. IMAS is the first accredited NB offshore school in Malaysia.

## Code

Vite + React + TypeScript, Tailwind CSS 4, framer-motion (page-turn "book" design), TanStack Query, Supabase.

```bash
npm install
npm run build          # production build → dist/
npx tsc -b             # type-check
npx vitest run         # unit tests
npx playwright test    # browser tests (run npm run build first)
npm run build:artifact # single-file preview for a private Artifact
```

- Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` the site runs on built-in content and the admin panel and portal work in demo mode (student `260001` / `A1234567`).
- Database: `supabase/migrations/0001_content.sql`, `0002_students.sql`, `0003_records.sql`, `supabase/seed.sql`. Security tests: `supabase/tests/` (run on a local PostgreSQL 16, see its README).
- Student accounts are created and passwords set only by the Edge Function `supabase/functions/manage-students` (holds the service role key). Never put the service role or secret key in the website or Netlify.
- Students sign in as `StudentID@imas.edu.my`; first password = ID number; the portal stays locked until they set their own.
- Before pushing: type-check, unit tests, build, browser tests; update the hosting guide when setup steps change.
- To test the live site from a cloud session, the environment must allow `netlify.app`, `supabase.co` and `supabase.com`.
