# Stage 2 plan: grades and the AI academic advisor

Agreed with the Deputy Head (Academic) on 20 October 2026.
**Phase A (student records) is built.** Next is Phase B. When work resumes, start with **"What we still need from the school"** below.

## The idea

Claude Haiku (model `claude-haiku-5-5`) reads each student's grades, explains where they stand, and suggests what to do and how to improve. Haiku is **not trained**. Every request gives it a **briefing pack**: the whole programme, the school's guidance, and that one student's record. Editing the programme in the admin panel updates what Haiku knows straight away.

## The briefing pack

| Part | Content | Source |
|---|---|---|
| Programme | 6 cohort tracks, subjects by grade and semester, prep and extension courses, credit-hours | Database (`tracks`, `courses`, `placements`), already built |
| Rules | 60% continuous assessment (assignments, end-of-chapter tests, project) + 40% final exam, **no midterms**; 60% pass mark; 90% attendance; graduation requirements; IELTS band 6; Semester 1 Sep–Feb, Semester 2 Mar–Jul | Database (`site_settings`) and the site's content, already built |
| Universities | St. Thomas, Mount Allison, Saint Mary's: scholarships and entry requirements | Database (`partners`), already built |
| School guidance | Support at IMAS (IELTS classes, counsellor, extra help), study strategies per subject, when to refer a student to a teacher, tone, things never to promise (e.g. guaranteed admission) | **New:** an "Advisor handbook" page in the admin panel. Claude drafts it; the school edits it |
| The student | Track, courses, grades per component, attendance, IELTS results, teacher comments | **New:** grade tables (Phase A) |

Keep the whole pack under 100,000 tokens: Haiku's price rises above that. The estimate is 20,000–30,000 tokens.

## Design rules

1. **Code does the maths, Haiku explains.** The server works out each course mark (60/40), credits earned, attendance, the IELTS gap, and "the final exam mark needed to reach 60%". These go to Haiku as facts.
2. **Fixed output format** (structured output): strengths; courses at risk and why; three concrete actions per weak course; whether the student is on track to graduate; whether a teacher should step in.
3. **Every piece of advice is saved** in an `advisor_notes` table, so staff can see exactly what each student was told.
4. **The API key lives only in Supabase** (Edge Function secret `ANTHROPIC_API_KEY`), never in Netlify or the website. Set a monthly spending limit in the Anthropic Console.
5. **Send only what's needed.** No IC numbers and no full names; Student ID and first name at most. The school's PDPA notice must mention that grades are processed by an AI service outside Malaysia.
6. **Limits:** a maximum number of chat questions per student per week, enforced on the server.

## Build order

- **Phase A: student records (no AI). Done, October 2026.** Tables `student_courses`, `course_marks` (final, continuous assessment, exam), `course_feedback`, `teachers`, `promotions`, `student_notes`, plus grade, year, enrolment, advisor, IELTS band and blocked on `students` (`0003_records.sql`, tested in `supabase/tests/records-test.sql`). Admin: student page, View as student, block, subjects and grades sheets (group or one student), Plan a year, Promotion with undo, Teachers, Feedback results. Portal tabs: Overview, My subjects, My grades, Time to graduate, Advisor (Grade 12), Feedback. Not yet stored: attendance and the separate assignment/test/project percentages; add them when the school's gradebook export arrives.
- **Phase B: advisor, staff only.** Advisor handbook editor; briefing-pack builder; an admin test screen ("pick a student → Generate advice") so staff can judge quality before students see anything.
- **Phase C: students.** Weekly advice notes generated overnight with the Message Batches API (half price), optionally approved by a teacher before release; then, if wanted, an "Ask the advisor" chat in the portal with a weekly question limit.

## Cost estimate (300 students, prices as of October 2026)

- Haiku 5.5: $0.10 per million input tokens / $0.50 per million output tokens (prompts up to 100K tokens). Roughly **$1–8 a month**.
- For comparison: Sonnet 5.5 about $110 a month and Opus 5.5 about $210 a month for open chat (about 20 questions per student per month). Weekly batch notes cost roughly half.

## What we still need from the school

1. **A sample grades export** with names and IDs removed, showing exactly how the gradebook records marks (columns such as Student ID, Course, Semester, Assignments %, End-of-chapter tests %, Project %, Final exam %, Attendance %), plus mock and actual IELTS results if recorded.
2. **Who sees advice first:** students directly, or a teacher who approves it? Recommended: teacher approval for the first term.
3. **Weekly notes, chat, or both?**
4. **For Phase B:** an Anthropic API account with billing and a monthly spending limit (Claude will guide the setup).

## Other open items (from setup, October 2026)

- Privacy page for the site (English, plus Malay for the school to check), linked from the footer and the portal sign-in. Offered, not yet requested.
- School PDPA notice: check it covers the student portal and storage in Singapore.
- Request Supabase's data processing agreement (dashboard → legal documents).
- Two-step verification on the Supabase, Netlify and GitHub accounts.
- Google Search Console: the school sends the HTML verification tag; Claude adds it to `index.html`.
- Optional: buy a domain (or ask IT for `canadian.imas.edu.my`), then update Supabase **Site URL**.
- Supabase Pro (about US$25 a month) before grades are stored, for daily backups and no pausing.
- Dual Commerce, Grade 10 entry (`cad-com-g10`): the plan lists 23 countable subjects, but the school's document states 22. Ask the school which is right, then fix the plan (Subjects in tracks) or the stated total (Cohort tracks).
