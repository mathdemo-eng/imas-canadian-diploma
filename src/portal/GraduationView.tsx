import { motion, useReducedMotion } from 'framer-motion';
import { Languages } from 'lucide-react';
import { useId } from 'react';
import { TERM_LABEL } from '../content/labels';
import type { Standing, SubjectStatus } from '../lib/progress';
import type { PortalData } from './StudentPortal';
import { STANDING, StandingChip } from './ui';

const CELL: Record<Standing, string> = {
  covered: 'bg-viz-1',
  covered_pending: '',
  in_progress: 'bg-blue-tint ring-2 ring-inset ring-blue',
  to_retake: 'bg-maroon',
  upcoming: 'bg-sheet-2 ring-1 ring-inset ring-rule-strong',
  not_started: 'bg-sheet-2 ring-1 ring-inset ring-rule-strong',
};

/** Time to graduate: subjects covered, what is left this year and next year, and in total. */
export function GraduationView({ d }: { d: PortalData }) {
  const p = d.progress;
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, '');
  if (!p) return <p className="rounded-xl bg-sheet-2 p-5 text-ink-2">Your cohort hasn’t been set yet, so your path to graduation can’t be shown.</p>;
  const grades = ([10, 11, 12] as const).filter((g) => p.subjects.some((s) => s.subject.grade === g));
  const g = d.student.current_grade;
  const stripes = { backgroundImage: `repeating-linear-gradient(45deg, var(--viz-1) 0 3px, var(--blue-tint) 3px 7px)` };

  return (
    <div className="grid gap-10">
      <section aria-labelledby={`${id}-head`} className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id={`${id}-head`} className="grid">
            <span className="font-display text-5xl font-semibold leading-none t-num">
              {p.covered} <span className="text-3xl text-ink-3">/ {p.total}</span>
            </span>
            <span className="text-ink-2">subjects covered towards your diploma</span>
          </h2>
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <dt className="t-label text-ink-3">Left to graduate</dt>
              <dd className="font-display text-3xl font-semibold t-num">{p.remaining.length}</dd>
            </div>
            <div>
              <dt className="t-label text-ink-3">{d.student.enrolment_status === 'graduated' ? 'Graduated' : 'Expected graduation'}</dt>
              <dd className="font-display text-3xl font-semibold t-num">{p.expectedGraduation ? `July ${p.expectedGraduation}` : '—'}</dd>
            </div>
          </dl>
        </div>

        {/* The journey map: one tile per subject, grouped by grade. */}
        <div className="grid gap-4 sm:grid-cols-3">
          {grades.map((grade, gi) => {
            const list = p.subjects.filter((s) => s.subject.grade === grade);
            const done = list.filter((s) => s.standing === 'covered' || s.standing === 'covered_pending').length;
            return (
              <div key={grade} className={`grid content-start gap-2 rounded-2xl p-4 ${grade === g ? 'bg-blue-tint' : 'bg-sheet-2'}`}>
                <p className="flex items-baseline justify-between">
                  <span className="font-semibold">Grade {grade}</span>
                  <span className="text-sm text-ink-2 t-num">
                    {done} of {list.length}
                  </span>
                </p>
                <ul className="flex flex-wrap gap-1.5" aria-label={`Grade ${grade} subjects`}>
                  {list.map((s, i) => (
                    <motion.li
                      key={s.subject.key}
                      title={`${s.subject.title}: ${STANDING[s.standing].label}`}
                      initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: gi * 0.15 + i * 0.035, type: 'spring', stiffness: 380, damping: 22 }}
                      className={`h-6 w-6 rounded-md ${CELL[s.standing]}`}
                      style={s.standing === 'covered_pending' ? stripes : undefined}
                    >
                      <span className="sr-only">
                        {s.subject.title}: {STANDING[s.standing].label}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2" aria-label="Key">
          {(['covered', 'covered_pending', 'in_progress', 'to_retake', 'upcoming'] as const).map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={`h-3.5 w-3.5 rounded ${CELL[s]}`} style={s === 'covered_pending' ? stripes : undefined} />
              {STANDING[s].label}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <SubjectList title={g ? `Left this year · Grade ${g}` : 'Left this year'} items={p.thisYear} empty="Nothing left this year." />
        <SubjectList
          title={g && g < 12 ? `Next year · Grade ${g + 1}` : 'Next year'}
          items={p.nextYear}
          empty={g === 12 ? 'This is your final year.' : 'Nothing planned yet.'}
        />
        <SubjectList title="To retake" items={p.toRetake} empty="Nothing to retake." />
      </div>

      <section aria-labelledby={`${id}-ielts`} className="flex flex-wrap items-center gap-5 rounded-2xl border border-rule p-5">
        <Languages size={28} aria-hidden className="text-blue" />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h2 id={`${id}-ielts`} className="font-semibold">
            IELTS
          </h2>
          <p className="text-ink-2">
            You need band {p.ielts.required} to graduate.{' '}
            {p.ielts.band === null
              ? 'Your result will appear here once the school records it. IMAS prepares you and arranges your exam.'
              : p.ielts.met
                ? 'Requirement met.'
                : 'Keep going: the school’s IELTS classes are there to help you reach it.'}
          </p>
        </div>
        <p className="font-display text-4xl font-semibold t-num">{p.ielts.band ?? '—'}</p>
      </section>
    </div>
  );
}

function SubjectList({ title, items, empty }: { title: string; items: SubjectStatus[]; empty: string }) {
  return (
    <section className="grid content-start gap-3 rounded-2xl border border-rule p-5">
      <h3 className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <span className="font-display text-2xl font-semibold t-num">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-ink-3">{empty}</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((s) => (
            <li key={s.subject.key} className="grid gap-1 border-t border-rule pt-2">
              <span className="text-[0.95rem]">{s.subject.title}</span>
              <span className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
                Grade {s.subject.grade} · {TERM_LABEL[s.subject.term]}
                <StandingChip standing={s.standing} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
