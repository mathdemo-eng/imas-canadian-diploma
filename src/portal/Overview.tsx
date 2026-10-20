import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CalendarCheck2, CalendarRange, Lock, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { shortAcademicYear } from '../lib/academic-year';
import { MapleLeafIcon } from '../components/media';
import { GraduateSeal } from './GraduateSeal';
import type { PortalData } from './StudentPortal';
import { ProgressRing, TeacherPhoto } from './ui';

export function Overview({ d, footer }: { d: PortalData; footer?: ReactNode }) {
  const reduced = useReducedMotion();
  const { student, progress, pending } = d;
  const track = d.site.tracks.find((t) => t.id === student.track_id);
  const advisor = student.current_grade === 12 ? d.teacher(student.advisor_id) : undefined;
  const rise = (i: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.06 * i, duration: 0.4, ease: [0.22, 0.8, 0.3, 1] as const } };

  return (
    <div className="grid gap-8">
      <dl className="flex flex-wrap gap-x-8 gap-y-3 border-b border-rule pb-6">
        {[
          ['Student ID', <span className="font-mono">{student.student_id}</span>],
          ['Cohort', track?.name ?? 'Not set yet'],
          ['Grade', student.enrolment_status === 'graduated' ? 'Graduated' : student.current_grade ? `Grade ${student.current_grade}` : 'Not set yet'],
          ['Academic year', student.academic_year ? shortAcademicYear(student.academic_year) : 'Not set yet'],
        ].map(([k, v]) => (
          <div key={String(k)} className="grid gap-0.5">
            <dt className="t-label text-ink-3">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {d.graduate && <GraduateSeal student={student} />}
      {student.enrolment_status === 'graduated' && !d.graduate && (
        <button
          type="button"
          onClick={() => d.go('feedback')}
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-blue bg-blue-tint p-5 text-left hover:bg-sheet-2"
        >
          <MapleLeafIcon size={32} className="shrink-0 text-blue" />
          <span className="grid min-w-0 flex-[1_1_14rem] gap-0.5">
            <span className="font-display text-xl font-semibold">Something is waiting for you</span>
            <span className="text-ink-2">Send your feedback on your Grade 12 courses to see your graduation status.</span>
          </span>
          <ArrowRight className="ml-auto shrink-0 text-blue" aria-hidden />
        </button>
      )}

      {pending.length > 0 && (
        <motion.div {...rise(0)} className="flex flex-wrap items-center gap-4 rounded-2xl border-l-4 border-blue bg-blue-tint px-5 py-4">
          <Lock className="shrink-0 text-blue" aria-hidden />
          <p className="min-w-0 flex-[1_1_16rem]">
            <span className="font-semibold">
              {pending.length === 1 ? '1 course is' : `${pending.length} courses are`} waiting for your feedback.
            </span>{' '}
            <span className="text-ink-2">Each mark appears as soon as you send feedback on that course.</span>
          </p>
          <button type="button" onClick={() => d.go('feedback')} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-blue px-5 font-semibold text-on-blue hover:bg-blue-deep">
            Give feedback <ArrowRight size={16} aria-hidden />
          </button>
        </motion.div>
      )}

      {progress ? (
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <motion.div {...rise(1)}>
            <ProgressRing covered={progress.covered} pending={progress.pendingResults} total={progress.total} />
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: CalendarCheck2,
                label: student.current_grade ? `Left this year · Grade ${student.current_grade}` : 'Left this year',
                value: progress.thisYear.length,
                unit: progress.thisYear.length === 1 ? 'subject' : 'subjects',
              },
              {
                icon: CalendarRange,
                label: student.current_grade && student.current_grade < 12 ? `Next year · Grade ${student.current_grade + 1}` : 'Next year',
                value: student.current_grade === 12 ? '—' : progress.nextYear.length,
                unit: student.current_grade === 12 ? 'Final year' : progress.nextYear.length === 1 ? 'subject' : 'subjects',
              },
              {
                icon: Sparkles,
                label: student.enrolment_status === 'graduated' ? 'Graduated' : 'Expected graduation',
                value: progress.expectedGraduation ? `July ${progress.expectedGraduation}` : '—',
                unit: `${progress.remaining.length} ${progress.remaining.length === 1 ? 'subject' : 'subjects'} left in total`,
              },
            ].map((t, i) => (
              <motion.button
                key={t.label}
                type="button"
                {...rise(i + 2)}
                onClick={() => d.go('graduation')}
                className="grid content-start gap-1 rounded-2xl border border-rule bg-sheet-2 p-4 text-left hover:border-blue"
              >
                <t.icon size={18} aria-hidden className="text-blue" />
                <span className="text-sm text-ink-3">{t.label}</span>
                <span className="font-display text-3xl font-semibold leading-tight t-num">{t.value}</span>
                <span className="text-sm text-ink-2">{t.unit}</span>
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-sheet-2 p-5 text-ink-2">Your cohort hasn’t been set yet, so your progress can’t be shown. Your coordinator will add it.</p>
      )}

      {advisor && (
        <motion.button
          type="button"
          {...rise(5)}
          onClick={() => d.go('advisor')}
          className="flex items-center gap-4 rounded-2xl border border-rule p-4 text-left hover:border-blue"
        >
          <TeacherPhoto name={advisor.full_name} photo={advisor.photo} className="h-14 w-14 shrink-0 text-lg" />
          <span className="grid min-w-0 gap-0.5">
            <span className="t-label text-ink-3">Your academic advisor</span>
            <span className="font-display text-xl font-semibold">{advisor.full_name}</span>
            <span className="truncate text-sm text-ink-2">{advisor.title}</span>
          </span>
          <ArrowRight className="ml-auto shrink-0 text-blue" aria-hidden />
        </motion.button>
      )}

      {footer}
    </div>
  );
}
