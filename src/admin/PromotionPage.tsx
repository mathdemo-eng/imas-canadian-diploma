import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, GraduationCap, RotateCcw, Search, TrendingUp, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { courseTitle } from '../content/labels';
import { nextAcademicYear } from '../lib/academic-year';
import { promotionChanges, suggestPromotion, type PromotionChoice, type Suggested, type Suggestion } from '../lib/progress';
import { DECISION_LABEL, applyPromotion } from '../lib/promotion';
import type { AllRecords, Promotion, PromotionDecision } from '../lib/records';
import type { StudentRecord } from '../lib/students';
import { Chip, formatMark } from '../portal/ui';
import { useAdmin } from './AdminLayout';
import { Field, Message, Panel, btn, errorText, input, refreshRecords, useAllRecords, useCurrentYear, useDecidedBy, usePromotions, useStudents } from './kit';
import { UndoButton, describeMove } from './StudentDetailPage';
import { YearSelect } from './StudentsPage';

type Decision = PromotionDecision | 'none';

const SUGGESTED: Record<Suggested, { label: string; icon: LucideIcon; tone: 'green' | 'maroon' | 'forest' | 'neutral'; decision: Decision }> = {
  promote: { label: 'Promote', icon: TrendingUp, tone: 'green', decision: 'promoted' },
  repeat: { label: 'Repeat the grade', icon: RotateCcw, tone: 'maroon', decision: 'repeated' },
  graduate: { label: 'Graduate', icon: GraduationCap, tone: 'forest', decision: 'graduated' },
  review: { label: 'Check first', icon: Search, tone: 'neutral', decision: 'none' },
};

interface Row {
  student: StudentRecord;
  suggestion: Suggestion;
}

export function PromotionPage() {
  const { content } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const students = useStudents();
  const records = useAllRecords();
  const promotions = usePromotions();
  const decidedBy = useDecidedBy();
  const current = useCurrentYear();
  const chosenIds = (location.state as { studentIds?: string[] } | null)?.studentIds;

  const [year, setYear] = useState(current);
  const [cohort, setCohort] = useState('');
  const [grade, setGrade] = useState('');
  const [query, setQuery] = useState('');
  const [choices, setChoices] = useState<Record<string, { decision: Decision; retake: PromotionChoice['retake'] }>>({});
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [planNext, setPlanNext] = useState(true);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ ok: number; failed: { name: string; error: string }[] } | null>(null);

  const rules = content.settings;
  const all = students.data ?? [];
  const view: AllRecords = records.data ?? { courses: [], marks: [], feedback: [] };

  // Students in the chosen year who are still studying.
  const inYear = all.filter((s) => s.enrolment_status === 'active' && s.academic_year === year && s.current_grade);
  const notSet = all.filter((s) => s.enrolment_status === 'active' && (!s.academic_year || !s.current_grade)).length;
  const behind = all.filter((s) => s.enrolment_status === 'active' && s.academic_year && s.academic_year < year && s.current_grade).length;

  const q = query.trim().toLowerCase();
  const rows: Row[] = !records.data
    ? []
    : inYear
        .filter((s) => !chosenIds || chosenIds.includes(s.id))
        .filter((s) => (!cohort || s.track_id === cohort) && (!grade || String(s.current_grade) === grade))
        .filter((s) => !q || `${s.student_id} ${s.full_name}`.toLowerCase().includes(q))
        .map((student) => ({ student, suggestion: suggestPromotion(student, content, view, rules, year) }));

  const choiceOf = (r: Row) => choices[r.student.id] ?? { decision: SUGGESTED[r.suggestion.decision].decision, retake: 'not_passed' as const };
  const setChoice = (id: string, patch: Partial<{ decision: Decision; retake: PromotionChoice['retake'] }>) =>
    setChoices((c) => ({ ...c, [id]: { ...(c[id] ?? choiceOf(rows.find((r) => r.student.id === id)!)), ...patch } }));

  const toApply = rows.filter((r) => ticked.has(r.student.id) && choiceOf(r).decision !== 'none');
  const tally = (d: PromotionDecision) => toApply.filter((r) => choiceOf(r).decision === d).length;
  const allTicked = rows.length > 0 && rows.every((r) => ticked.has(r.student.id));

  // Decisions already made for this year (the students have moved on, so they are not in the list above).
  const decided = (promotions.data ?? []).filter((p) => p.from_year === year && !p.undone_at);
  const latestFor = (studentId: string) => (promotions.data ?? []).find((p) => p.student_id === studentId && !p.undone_at);

  async function apply() {
    setBusy(true);
    setResult(null);
    setConfirming(false);
    const failed: { name: string; error: string }[] = [];
    let ok = 0;
    setProgress({ done: 0, total: toApply.length });
    for (const [i, r] of toApply.entries()) {
      const c = choiceOf(r);
      try {
        const changes = promotionChanges(r.student, content, view, rules, year, { decision: c.decision as PromotionDecision, retake: c.retake, planNext });
        await applyPromotion(r.student, changes, decidedBy, note.trim());
        ok++;
      } catch (e) {
        failed.push({ name: r.student.full_name, error: errorText(e) });
      }
      setProgress({ done: i + 1, total: toApply.length });
    }
    await refreshRecords(qc);
    setTicked(new Set());
    setChoices({});
    setResult({ ok, failed });
    setBusy(false);
  }

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="grid gap-2">
        <h1 className="t-h1">Promotion</h1>
        <p className="measure text-ink-2">
          At the end of each academic year, move students to the next grade, have them repeat it, or graduate them. The page suggests a decision from their
          marks; you always decide. Every decision is recorded and can be undone.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          ['Check the records', 'Every course of the year should be Completed with a mark. Missing marks are flagged below.'],
          ['Review the suggestions', `Promote if fewer than ${rules.repeat_threshold} courses are not passed (they are retaken next year). Grade 12 students graduate when every subject is passed.`],
          ['Tick and apply', 'Change any decision, tick the students, then apply. Their grade, year and next year’s subjects update together.'],
        ].map(([t, d], i) => (
          <li key={t} className="grid content-start gap-1 rounded-2xl border border-rule bg-sheet p-4">
            <span className="font-display text-2xl font-semibold text-blue t-num">{i + 1}</span>
            <span className="font-semibold">{t}</span>
            <span className="text-sm text-ink-2">{d}</span>
          </li>
        ))}
      </ol>

      <section aria-labelledby="promo-list-title" className="grid grid-cols-1 gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <YearSelect id="promo-year" label="End of academic year" value={year} onChange={setYear} current={current} />
          <Field id="promo-cohort" label="Cohort">
            <select id="promo-cohort" value={cohort} onChange={(e) => setCohort(e.target.value)} className={input}>
              <option value="">All cohorts</option>
              {content.tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="promo-grade" label="Grade">
            <select id="promo-grade" value={grade} onChange={(e) => setGrade(e.target.value)} className={input}>
              <option value="">All grades</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
          </Field>
          <Field id="promo-search" label="Search">
            <input id="promo-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Student ID or name" className={input} />
          </Field>
        </div>

        {chosenIds && (
          <p className="flex flex-wrap items-center gap-2 rounded-xl bg-blue-tint px-4 py-2 text-sm text-blue-deep">
            Showing the {chosenIds.length} {chosenIds.length === 1 ? 'student' : 'students'} you chose.
            <button type="button" onClick={() => navigate('/admin/promotion', { replace: true, state: null })} className="inline-flex items-center gap-1 font-semibold underline">
              <X size={14} aria-hidden /> Show everyone
            </button>
          </p>
        )}
        {(notSet > 0 || behind > 0) && (
          <p className="flex items-start gap-2 text-sm text-ink-2">
            <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0 text-maroon" />
            <span>
              {notSet > 0 && `${notSet} ${notSet === 1 ? 'student has' : 'students have'} no grade or academic year set, so they aren’t listed (set them on the Students page). `}
              {behind > 0 && `${behind} ${behind === 1 ? 'student is' : 'students are'} still in an earlier year: choose that year above to decide for them first.`}
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="promo-list-title" className="t-h2">
            To decide for {year} <span className="font-mono text-base font-normal text-ink-3 t-num">{rows.length}</span>
          </h2>
          {rows.length > 0 && (
            <label className="inline-flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="h-5 w-5 accent-blue"
                checked={allTicked}
                onChange={() => setTicked(allTicked ? new Set() : new Set(rows.map((r) => r.student.id)))}
              />
              Tick all {rows.length}
            </label>
          )}
        </div>

        {(students.isLoading || records.isLoading) && <p role="status" className="text-ink-3">Loading students and marks…</p>}
        {records.isError && <Message tone="error">{errorText(records.error)}</Message>}
        {records.data && rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-rule-strong p-6 text-ink-3">
            No students left to decide for {year}
            {cohort || grade || query ? ' with these filters' : ''}.
          </p>
        )}

        <ul className="grid gap-3" aria-label={`Students to decide for ${year}`}>
          {rows.map((r) => (
            <PromotionRow
              key={r.student.id}
              row={r}
              ticked={ticked.has(r.student.id)}
              onTick={() =>
                setTicked((t) => {
                  const n = new Set(t);
                  if (n.has(r.student.id)) n.delete(r.student.id);
                  else n.add(r.student.id);
                  return n;
                })
              }
              choice={choiceOf(r)}
              onChoice={(patch) => setChoice(r.student.id, patch)}
              planNext={planNext}
              view={view}
              year={year}
            />
          ))}
        </ul>
      </section>

      {rows.length > 0 && (
        <section aria-label="Apply decisions" className="z-20 grid gap-3 rounded-2xl sm:sticky sm:bottom-3 border-2 border-blue bg-sheet p-4 shadow-lg sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={planNext} onChange={(e) => setPlanNext(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-blue" />
              <span>
                <span className="font-semibold">Add the next grade’s courses</span> from each cohort plan when promoting (as Upcoming), so their portal shows next
                year straight away.
              </span>
            </label>
            <Field id="promo-note" label="Note for the history (optional)">
              <input id="promo-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Academic board, 10 July" className={input} />
            </Field>
            <button type="button" disabled={busy || toApply.length === 0} onClick={() => setConfirming(true)} className={btn.primary}>
              {busy ? `Applying… ${progress.done} of ${progress.total}` : `Apply ${toApply.length} ${toApply.length === 1 ? 'decision' : 'decisions'}`}
            </button>
          </div>
          {confirming && (
            <div role="group" aria-labelledby="promo-confirm" className="grid gap-3 rounded-xl bg-blue-tint p-4">
              <p id="promo-confirm" className="font-semibold">
                Apply these decisions for {year}?{' '}
                {(['promoted', 'repeated', 'graduated', 'withdrawn'] as const)
                  .filter((d) => tally(d))
                  .map((d) => `${tally(d)} ${DECISION_LABEL[d].toLowerCase()}`)
                  .join(' · ')}
              </p>
              <p className="text-sm text-ink-2">Each one can be undone afterwards, from this page or the student’s page.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={apply} className={btn.primary}>
                  Yes, apply
                </button>
                <button type="button" onClick={() => setConfirming(false)} className={btn.quiet}>
                  Not yet
                </button>
              </div>
            </div>
          )}
          {result && (
            <Message tone={result.failed.length ? 'error' : 'ok'}>
              {result.ok} {result.ok === 1 ? 'decision' : 'decisions'} applied.
              {result.failed.map((f) => ` ${f.name}: ${f.error}`).join(' ')}
            </Message>
          )}
        </section>
      )}

      <Panel id="decided" title={`Already decided for ${year}`} intro="These students have moved on. Undo a decision to put a student back and remove the subjects it added.">
        {decided.length === 0 ? (
          <p className="text-ink-3">Nothing decided for {year} yet.</p>
        ) : (
          <ul className="grid gap-2" aria-label={`Decided for ${year}`}>
            {decided.map((p) => (
              <DecidedRow key={p.id} p={p} student={all.find((s) => s.id === p.student_id)} latest={latestFor(p.student_id)?.id === p.id} view={view} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function PromotionRow({
  row,
  ticked,
  onTick,
  choice,
  onChoice,
  planNext,
  view,
  year,
}: {
  row: Row;
  ticked: boolean;
  onTick: () => void;
  choice: { decision: Decision; retake: PromotionChoice['retake'] };
  onChoice: (patch: Partial<{ decision: Decision; retake: PromotionChoice['retake'] }>) => void;
  planNext: boolean;
  view: AllRecords;
  year: string;
}) {
  const { content } = useAdmin();
  const { student: s, suggestion } = row;
  const sug = SUGGESTED[suggestion.decision];
  const track = content.tracks.find((t) => t.id === s.track_id);
  const marks = new Map(view.marks.map((m) => [m.student_course_id, m]));
  const course = (id: string) => content.courses.find((c) => c.id === id);
  const id = `promo-${s.id}`;

  let effect = '';
  if (choice.decision !== 'none') {
    const ch = promotionChanges(s, content, view, content.settings, year, { decision: choice.decision, retake: choice.retake, planNext });
    const retakes = ch.newCourses.filter((c) => c.attempt && c.attempt > 1).length;
    const next = nextAcademicYear(year);
    if (choice.decision === 'promoted') effect = `Grade ${ch.patch.current_grade} in ${next}`;
    if (choice.decision === 'repeated') effect = `Grade ${s.current_grade} again in ${next}`;
    if (choice.decision === 'graduated') effect = 'Marked as graduated';
    if (choice.decision === 'withdrawn') effect = 'Marked as having left; records are kept';
    if (ch.newCourses.length) effect += ` · adds ${ch.newCourses.length} ${ch.newCourses.length === 1 ? 'course' : 'courses'}${retakes ? ` (${retakes} to retake)` : ''}`;
  }

  return (
    <li className={`grid gap-3 rounded-2xl border bg-sheet p-4 ${ticked ? 'border-blue ring-1 ring-blue' : 'border-rule'}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,17rem)]">
        <input type="checkbox" checked={ticked} onChange={onTick} aria-label={`Tick ${s.full_name}`} className="mt-1 h-5 w-5 accent-blue" />
        <div className="grid min-w-0 gap-0.5">
          <Link to={`/admin/students/${encodeURIComponent(s.student_id)}`} className="font-semibold hover:text-blue hover:underline">
            {s.full_name}
          </Link>
          <span className="text-sm text-ink-3">
            <span className="font-mono">{s.student_id}</span> · Grade {s.current_grade} · {track?.name ?? 'No cohort'}
          </span>
        </div>
        <div className="col-start-2 grid min-w-0 gap-1.5 lg:col-start-auto">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-3">Suggested</span>
            <Chip icon={sug.icon} tone={sug.tone}>
              {sug.label}
            </Chip>
          </span>
          <ul className="grid gap-0.5 text-sm text-ink-2">
            {suggestion.reasons.map((x) => (
              <li key={x}>{x}</li>
            ))}
            {suggestion.warnings.map((w) => (
              <li key={w} className="flex items-start gap-1.5 text-maroon">
                <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0" /> {w}
              </li>
            ))}
          </ul>
          {suggestion.failed.length > 0 && (
            <p className="text-sm text-ink-2">
              Not passed:{' '}
              {suggestion.failed
                .map((f) => {
                  const c = course(f.course_id);
                  const m = marks.get(f.id);
                  return `${c ? courseTitle(c.name, c.code) : f.course_id}${m ? ` (${formatMark(m.mark)})` : ''}`;
                })
                .join(', ')}
            </p>
          )}
        </div>
        <div className="col-start-2 grid gap-2 lg:col-start-auto">
          <label htmlFor={`${id}-decision`} className="sr-only">
            Decision for {s.full_name}
          </label>
          <select
            id={`${id}-decision`}
            value={choice.decision}
            onChange={(e) => {
              onChoice({ decision: e.target.value as Decision });
              if (!ticked && e.target.value !== 'none') onTick();
            }}
            className={input}
          >
            <option value="none">No change for now</option>
            {s.current_grade !== 12 && <option value="promoted">Promote to Grade {(s.current_grade ?? 10) + 1}</option>}
            <option value="repeated">Repeat Grade {s.current_grade}</option>
            {s.current_grade === 12 && <option value="graduated">Graduate</option>}
            <option value="withdrawn">Left the programme</option>
          </select>
          {choice.decision === 'repeated' && (
            <>
              <label htmlFor={`${id}-retake`} className="sr-only">
                What {s.full_name} retakes
              </label>
              <select id={`${id}-retake`} value={choice.retake} onChange={(e) => onChoice({ retake: e.target.value as PromotionChoice['retake'] })} className={input}>
                <option value="not_passed">Retake courses not passed</option>
                <option value="all">Retake every course</option>
              </select>
            </>
          )}
          {effect && (
            <p className="flex items-start gap-1.5 text-sm text-ink-2">
              <ArrowRight size={14} aria-hidden className="mt-0.5 shrink-0 text-blue" /> {effect}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function DecidedRow({ p, student, latest, view }: { p: Promotion; student?: StudentRecord; latest: boolean; view: AllRecords }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function act(fn: () => Promise<unknown>, done: string | (() => string)) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      await refreshRecords(qc);
      setMsg({ ok: true, text: typeof done === 'function' ? done() : done });
      return true;
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="grid gap-1 rounded-xl border border-rule p-3">
      <p className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">
          {student ? (
            <Link to={`/admin/students/${encodeURIComponent(student.student_id)}`} className="hover:text-blue hover:underline">
              {student.full_name}
            </Link>
          ) : (
            'Removed student'
          )}{' '}
          · {DECISION_LABEL[p.decision]}
        </span>
        <span className="text-sm text-ink-3">by {p.decided_by}</span>
      </p>
      <p className="text-sm text-ink-2">{describeMove(p)}</p>
      {student && latest && <UndoButton p={p} student={student} file={view} busy={busy} confirming={confirm === p.id} setConfirm={setConfirm} act={act} />}
      {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
    </li>
  );
}
