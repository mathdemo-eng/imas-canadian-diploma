# IMAS Canadian Diploma website

The guide to the New Brunswick (Canada) High School Diploma at IMAS International School, for new and current students. Stage 1 of a two-stage programme. Stage 2 adds a student portal.

**Hosting and day-to-day editing:** see [docs/HOSTING-AND-MAINTENANCE-GUIDE.md](docs/HOSTING-AND-MAINTENANCE-GUIDE.md).

## What's inside

| Part | Where |
|---|---|
| Public site: eight chapters and two appendices, read like a book with page turns | `src/pages`, `src/components` |
| Admin panel at `/admin` (Google sign-in, editors listed in Supabase) | `src/admin` |
| Content model and built-in content | `src/content/types.ts`, `src/content/seed/` |
| Database tables, security rules, seed | `supabase/` |
| Tests | `tests/` (unit), `tests/e2e/` (browser), `supabase/tests/` (database rules) |

Without database settings the site runs on its built-in content, and the admin panel works in demo mode, so changes are not saved.

## Commands

```bash
npm install
npm run dev            # local development
npm run build          # production build → dist/
npm test               # unit tests
npm run test:e2e       # browser tests (builds must be current: run npm run build first)
npm run seed:sql       # regenerate supabase/seed.sql from src/content/seed
npm run build:artifact # single-file preview → dist-artifact/canadian-diploma.html
```

Environment variables (see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Sources for the content

- IMAS subject plan ("For Claude - website"): cohort tracks, subjects and course totals
- IMAS assessment brief: 60% continuous assessment / 40% final examination, with no midterms for CAN students
- AEI graduation requirements (requirements only)
- Ministry of Education approval (JPN Selangor, 10 December 2025) and the MQA entry qualifications list (December 2025)
- AEI partner universities: St. Thomas, Mount Allison, Saint Mary's
