import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Trophy } from 'lucide-react';
import { courseTitle } from '../content/labels';
import { shortAcademicYear } from '../lib/academic-year';
import { groupByYear, outcomeOf } from '../lib/progress';
import type { StudentCourse } from '../lib/records';
import type { PortalData } from './StudentPortal';
import { MarkBar, OutcomeChip, formatMark } from './ui';

/** The student's marks, by year and grade. A mark appears once feedback on that course is sent. */
export function GradesView({ d }: { d: PortalData }) {
  const reduced = useReducedMotion();
  const pass = d.site.settings.pass_mark;
  const finished = d.file.courses.filter((c) => c.status === 'completed');
  const groups = groupByYear(finished).reverse();
  const visible = finished.filter((c) => d.marks.has(c.id));
  const best = [...visible].sort((a, b) => d.marks.get(b.id)!.mark - d.marks.get(a.id)!.mark).slice(0, 3);
  const title = (sc: StudentCourse) => {
    const c = d.course(sc.course_id);
    return c ? courseTitle(c.name, c.code) : sc.course_id;
  };

  if (finished.length === 0) {
    return <p className="rounded-xl bg-sheet-2 p-5 text-ink-2">Your grades will appear here when your first courses are completed.</p>;
  }

  return (
    <div className="grid gap-10">
      <p className="measure text-ink-2">
        Each course’s final mark combines continuous assessment ({d.site.settings.ca_weight}%) and the final exam ({d.site.settings.exam_weight}%). You need{' '}
        {pass}% to pass. {d.site.settings.feedback_required && 'Send feedback on a course to see its mark.'}
      </p>

      {best.length >= 2 && (
        <section aria-labelledby="best-title" className="grid gap-3 rounded-2xl bg-sheet-2 p-5">
          <h2 id="best-title" className="flex items-center gap-2 t-label text-ink-3">
            <Trophy size={16} aria-hidden className="text-blue" /> Your strongest subjects
          </h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {best.map((sc, i) => (
              <li key={sc.id} className="grid gap-1">
                <span className="font-display text-3xl font-semibold t-num">{formatMark(d.marks.get(sc.id)!.mark)}</span>
                <span className="text-sm text-ink-2">
                  <span className="sr-only">{i + 1}. </span>
                  {title(sc)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {groups.map((g) => {
        const rows = g.terms.flatMap((t) => t.courses);
        const shown = rows.filter((r) => d.marks.has(r.id)).map((r) => d.marks.get(r.id)!.mark);
        const avg = shown.length ? Math.round((shown.reduce((a, b) => a + b, 0) / shown.length) * 10) / 10 : null;
        return (
          <section key={g.academic_year} aria-labelledby={`grades-${g.academic_year}`} className="grid gap-3">
            <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-ink pb-2">
              <h2 id={`grades-${g.academic_year}`} className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-display text-3xl font-semibold">Grade {g.grade}</span>
                <span className="font-mono text-sm text-ink-3">{shortAcademicYear(g.academic_year)}</span>
              </h2>
              {avg !== null && (
                <p className="text-sm text-ink-2">
                  Average of marks shown <span className="font-semibold t-num">{formatMark(avg)}</span>
                </p>
              )}
            </header>
            <ul className="grid">
              {rows.map((sc, i) => {
                const mark = d.marks.get(sc.id);
                const outcome = outcomeOf(sc, mark, pass);
                return (
                  <motion.li
                    key={sc.id}
                    initial={reduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.025 }}
                    className="grid items-center gap-x-4 gap-y-2 border-b border-rule py-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_12.5rem]"
                  >
                    <div className="grid min-w-0 gap-0.5">
                      <p className="font-semibold">{title(sc)}</p>
                      <p className="text-sm text-ink-3">
                        Grade {sc.grade_level} · {shortAcademicYear(sc.academic_year)}
                        {sc.attempt > 1 ? ` · attempt ${sc.attempt}` : ''}
                      </p>
                      {d.viewer === 'staff' && d.site.settings.feedback_required && mark && !d.feedbackDone.has(sc.id) && (
                        <p className="flex items-center gap-1 text-sm text-blue">
                          <Lock size={13} aria-hidden /> Hidden from the student until they send feedback
                        </p>
                      )}
                    </div>
                    {mark ? (
                      <div className="flex items-center gap-3">
                        <span className="w-14 shrink-0 text-right font-display text-xl font-semibold t-num">{formatMark(mark.mark)}</span>
                        <MarkBar mark={mark.mark} pass={pass} />
                      </div>
                    ) : outcome === 'awaiting_feedback' && d.viewer === 'student' ? (
                      <button
                        type="button"
                        onClick={() => d.go('feedback', { course: sc.id })}
                        className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-blue px-4 text-sm font-semibold text-blue hover:bg-blue-tint"
                      >
                        <Lock size={15} aria-hidden /> Give feedback to see your mark
                      </button>
                    ) : (
                      <span className="text-sm text-ink-3">{outcome === 'awaiting_mark' ? 'Your teacher hasn’t entered the mark yet.' : ''}</span>
                    )}
                    <span className="sm:justify-self-end">
                      <OutcomeChip outcome={outcome} staff={d.viewer === 'staff'} />
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
