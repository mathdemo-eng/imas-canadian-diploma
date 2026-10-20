import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, RotateCcw, UserRound } from 'lucide-react';
import { CLUSTER_LABEL, TERM_LABEL, TERM_MONTHS, courseTitle } from '../content/labels';
import type { Term } from '../content/types';
import { shiftAcademicYear, shortAcademicYear } from '../lib/academic-year';
import { groupByYear, isExtension, outcomeOf, planYearRows } from '../lib/progress';
import type { StudentCourse } from '../lib/records';
import type { PortalData } from './StudentPortal';
import { Chip, OutcomeChip } from './ui';

/** Every subject the student has taken, is taking and will take, year by year. */
export function SubjectsView({ d }: { d: PortalData }) {
  const reduced = useReducedMotion();
  const groups = groupByYear(d.file.courses.filter((c) => c.status !== 'withdrawn' || d.viewer === 'staff'));
  const { student } = d;

  // The rest of the journey, from the cohort plan, for grades with no records yet.
  const recordedGrades = new Set(d.file.courses.map((c) => c.grade_level));
  const future: { grade: 10 | 11 | 12; year: string | null; rows: ReturnType<typeof planYearRows> }[] = [];
  if (student.current_grade && student.enrolment_status === 'active') {
    for (let g = student.current_grade + 1; g <= 12; g++) {
      if (recordedGrades.has(g as 10 | 11 | 12)) continue;
      const year = student.academic_year ? shiftAcademicYear(student.academic_year, g - student.current_grade) : null;
      const rows = planYearRows(student, d.site, g as 10 | 11 | 12, year ?? '');
      if (rows.length) future.push({ grade: g as 10 | 11 | 12, year, rows });
    }
  }

  if (groups.length === 0 && future.length === 0) {
    return <p className="rounded-xl bg-sheet-2 p-5 text-ink-2">Your subjects will appear here once your coordinator adds them.</p>;
  }

  return (
    <div className="grid gap-12">
      <p className="measure text-ink-2">
        Your subjects year by year: what you have covered, what you are studying now and what is coming next. A course that continues from Grade 10 isn’t a new
        subject.
      </p>
      {groups.map((g, gi) => (
        <section key={g.academic_year} aria-labelledby={`year-${g.academic_year}`} className="grid gap-5">
          <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-ink pb-2">
            <h2 id={`year-${g.academic_year}`} className="font-display text-3xl font-semibold">
              Grade {g.grade}
            </h2>
            <span className="font-mono text-sm text-ink-3">{shortAcademicYear(g.academic_year)}</span>
            {g.academic_year === student.academic_year && <Chip icon={CalendarClock} tone="blue">This year</Chip>}
          </header>
          <div className={`grid gap-6 ${g.terms.length > 1 ? 'lg:grid-cols-2' : ''}`}>
            {g.terms.map((t) => (
              <TermBlock key={t.term} term={t.term} courses={t.courses} d={d} delay={reduced ? 0 : gi * 0.05} />
            ))}
          </div>
        </section>
      ))}

      {future.map((f) => (
        <section key={f.grade} aria-labelledby={`future-${f.grade}`} className="grid gap-5 opacity-90">
          <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-dashed border-rule-strong pb-2">
            <h2 id={`future-${f.grade}`} className="font-display text-3xl font-semibold text-ink-2">
              Grade {f.grade}
            </h2>
            {f.year && <span className="font-mono text-sm text-ink-3">{shortAcademicYear(f.year)}</span>}
            <span className="text-sm text-ink-3">Planned from your cohort’s academic plan</span>
          </header>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {f.rows.map((r) => {
              const c = d.course(r.course_id);
              return (
                <li key={r.course_id} className="rounded-xl border border-dashed border-rule-strong px-4 py-3">
                  <p className="font-semibold">{c ? courseTitle(c.name, c.code) : r.course_id}</p>
                  <p className="text-sm text-ink-3">{TERM_LABEL[r.term as Term]}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TermBlock({ term, courses, d, delay }: { term: Term; courses: StudentCourse[]; d: PortalData; delay: number }) {
  const reduced = useReducedMotion();
  return (
    <div className="grid content-start gap-3">
      <p className="flex items-baseline justify-between gap-2">
        <span className="t-label text-blue">{TERM_LABEL[term]}</span>
        <span className="text-sm text-ink-3">{TERM_MONTHS[term]}</span>
      </p>
      <ul className="grid gap-2">
        {courses.map((sc, i) => {
          const c = d.course(sc.course_id);
          const outcome = outcomeOf(sc, d.marks.get(sc.id), d.site.settings.pass_mark);
          const teacher = d.teacher(sc.teacher_id);
          const extension = isExtension(d.site, d.student.track_id, sc.course_id, sc.grade_level);
          return (
            <motion.li
              key={sc.id}
              initial={reduced ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + i * 0.03, duration: 0.3 }}
              className={`grid gap-2 rounded-xl border bg-sheet px-4 py-3 ${outcome === 'passed' ? 'border-rule' : outcome === 'not_passed' ? 'border-maroon' : 'border-rule'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid min-w-0 gap-0.5">
                  <p className="font-semibold">{c ? courseTitle(c.name, c.code) : sc.course_id}</p>
                  {c && <p className="text-sm text-ink-3">{CLUSTER_LABEL[c.cluster]}</p>}
                </div>
                <OutcomeChip outcome={outcome} staff={d.viewer === 'staff'} />
              </div>
              {(extension || sc.attempt > 1 || teacher || sc.grade_level !== groupGrade(d, sc)) && (
                <div className="flex flex-wrap gap-2 text-sm text-ink-2">
                  {extension && <span className="rounded-full bg-forest-tint px-2.5 py-0.5 font-semibold text-forest">Continues from Grade 10</span>}
                  {sc.attempt > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-maroon-tint px-2.5 py-0.5 font-semibold text-maroon">
                      <RotateCcw size={13} aria-hidden /> Retake · attempt {sc.attempt}
                    </span>
                  )}
                  {sc.grade_level !== groupGrade(d, sc) && <span className="rounded-full bg-sheet-2 px-2.5 py-0.5">Grade {sc.grade_level} course</span>}
                  {teacher && (
                    <span className="inline-flex items-center gap-1">
                      <UserRound size={14} aria-hidden /> {teacher.full_name}
                    </span>
                  )}
                </div>
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/** The grade the student was in during that year (the highest grade among that year's records). */
function groupGrade(d: PortalData, sc: StudentCourse) {
  return Math.max(...d.file.courses.filter((c) => c.academic_year === sc.academic_year).map((c) => c.grade_level));
}
