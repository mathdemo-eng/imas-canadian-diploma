import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, CheckCircle2, Clock, Lock, MinusCircle, PlayCircle, RotateCcw, XCircle, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import type { Outcome, Standing } from '../lib/progress';

type Tone = 'green' | 'maroon' | 'blue' | 'neutral' | 'forest';

const TONE: Record<Tone, string> = {
  green: 'bg-green-tint text-green-ink',
  maroon: 'bg-maroon-tint text-maroon',
  blue: 'bg-blue-tint text-blue-deep',
  forest: 'bg-forest-tint text-forest',
  neutral: 'bg-sheet-2 text-ink-2 border border-rule',
};

export function Chip({ icon: Icon, tone, children }: { icon: LucideIcon; tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold leading-5 whitespace-nowrap ${TONE[tone]}`}>
      <Icon size={14} aria-hidden />
      {children}
    </span>
  );
}

export const OUTCOME: Record<Outcome, { label: string; icon: LucideIcon; tone: Tone }> = {
  passed: { label: 'Passed', icon: CheckCircle2, tone: 'green' },
  not_passed: { label: 'Not passed', icon: XCircle, tone: 'maroon' },
  awaiting_feedback: { label: 'Result ready: give feedback', icon: Lock, tone: 'blue' },
  awaiting_mark: { label: 'Mark not entered yet', icon: Clock, tone: 'neutral' },
  in_progress: { label: 'In progress', icon: PlayCircle, tone: 'blue' },
  upcoming: { label: 'Upcoming', icon: CalendarClock, tone: 'neutral' },
  withdrawn: { label: 'Withdrawn', icon: MinusCircle, tone: 'neutral' },
};

export function OutcomeChip({ outcome, staff = false }: { outcome: Outcome; staff?: boolean }) {
  const o = OUTCOME[outcome];
  const label = staff && outcome === 'awaiting_feedback' ? 'Locked until feedback' : o.label;
  return (
    <Chip icon={o.icon} tone={o.tone}>
      {label}
    </Chip>
  );
}

export const STANDING: Record<Standing, { label: string; icon: LucideIcon; tone: Tone }> = {
  covered: { label: 'Covered', icon: CheckCircle2, tone: 'green' },
  covered_pending: { label: 'Covered · result waiting', icon: Lock, tone: 'blue' },
  in_progress: { label: 'In progress', icon: PlayCircle, tone: 'blue' },
  to_retake: { label: 'To retake', icon: RotateCcw, tone: 'maroon' },
  upcoming: { label: 'Upcoming', icon: CalendarClock, tone: 'neutral' },
  not_started: { label: 'Not started', icon: Clock, tone: 'neutral' },
};

export function StandingChip({ standing }: { standing: Standing }) {
  const s = STANDING[standing];
  return (
    <Chip icon={s.icon} tone={s.tone}>
      {s.label}
    </Chip>
  );
}

/**
 * Subjects covered out of the total, as a ring: solid for passed, striped for covered with
 * the result still waiting. A legend names both, so the meaning never rests on colour alone.
 */
export function ProgressRing({ covered, pending, total }: { covered: number; pending: number; total: number }) {
  const id = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  const r = 52;
  const c = 2 * Math.PI * r;
  const passed = Math.max(0, covered - pending);
  const frac = (n: number) => (total ? n / total : 0);
  const gap = total > 0 && passed > 0 && pending > 0 ? 2 : 0;
  const passedLen = Math.max(0, frac(passed) * c - gap);
  const pendingLen = frac(pending) * c;
  return (
    <figure className="grid justify-items-center gap-3">
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" role="img" aria-label={`${covered} of ${total} subjects covered`}>
          <defs>
            <pattern id={`stripe-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--blue-tint)" />
              <rect width="2.2" height="5" fill="var(--viz-1)" />
            </pattern>
          </defs>
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--rule)" strokeWidth="12" />
          {pending > 0 && (
            <motion.circle
              cx="64"
              cy="64"
              r={r}
              fill="none"
              stroke={`url(#stripe-${id})`}
              strokeWidth="12"
              strokeLinecap="butt"
              strokeDasharray={`${pendingLen} ${c}`}
              initial={reduced ? false : { strokeDashoffset: pendingLen }}
              animate={{ strokeDashoffset: -(passedLen + gap) }}
              transition={{ duration: 1.1, ease: [0.22, 0.8, 0.3, 1], delay: 0.2 }}
            />
          )}
          <motion.circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke="var(--viz-1)"
            strokeWidth="12"
            strokeLinecap={passedLen > 6 ? 'round' : 'butt'}
            strokeDasharray={`${passedLen} ${c}`}
            initial={reduced ? false : { strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${passedLen} ${c}` }}
            transition={{ duration: 1.1, ease: [0.22, 0.8, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="font-display text-5xl font-semibold leading-none t-num">{covered}</span>
          <span className="mt-1 text-sm text-ink-3 t-num">of {total} subjects</span>
        </div>
      </div>
      <figcaption className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded-sm bg-viz-1" /> Passed <span className="font-semibold t-num">{passed}</span>
        </span>
        {pending > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <svg aria-hidden width="12" height="12" className="rounded-sm">
              <rect width="12" height="12" fill={`url(#stripe-${id})`} />
            </svg>
            Result waiting <span className="font-semibold t-num">{pending}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded-sm bg-rule" /> Still to do <span className="font-semibold t-num">{Math.max(0, total - covered)}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/** One mark as a bar on a 0–100 scale, with the pass mark drawn as a line. */
export function MarkBar({ mark, pass }: { mark: number; pass: number }) {
  const reduced = useReducedMotion();
  const ok = mark >= pass;
  return (
    <div className="relative h-2.5 w-full rounded-full bg-sheet-2 ring-1 ring-rule" title={`${formatMark(mark)} (pass mark ${pass}%)`}>
      <motion.div
        className={`h-full rounded-full ${ok ? 'bg-viz-1' : 'bg-maroon'}`}
        initial={reduced ? false : { width: 0 }}
        animate={{ width: `${mark}%` }}
        transition={{ duration: 0.8, ease: [0.22, 0.8, 0.3, 1] }}
      />
      <span aria-hidden className="absolute -top-1 bottom-[-4px] w-0.5 rounded bg-ink-3" style={{ left: `${pass}%` }} />
    </div>
  );
}

export function formatMark(n: number) {
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

/** Initials in a circle, used until a teacher's photo is added. */
export function Monogram({ name, className = '' }: { name: string; className?: string }) {
  const initials = name
    .replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <span aria-hidden className={`grid place-items-center rounded-full bg-gradient-to-br from-blue to-forest font-display font-semibold text-on-blue ${className}`}>
      {initials}
    </span>
  );
}

export function TeacherPhoto({ name, photo, className = '' }: { name: string; photo: string; className?: string }) {
  return photo ? <img src={photo} alt={`Photo of ${name}`} className={`rounded-full object-cover ${className}`} /> : <Monogram name={name} className={className} />;
}
