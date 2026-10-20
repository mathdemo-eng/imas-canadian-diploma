import { useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, MessageSquareHeart, PartyPopper } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { courseTitle } from '../content/labels';
import { shortAcademicYear } from '../lib/academic-year';
import { FEEDBACK_FORM, REQUIRED_IDS, missingAnswers, type Question } from '../lib/feedback-form';
import { submitFeedback, type FeedbackAnswers, type StudentCourse } from '../lib/records';
import type { PortalData } from './StudentPortal';

/** Course feedback: what's waiting, and the form itself. */
export function FeedbackView({ d }: { d: PortalData }) {
  const [params] = useSearchParams();
  const [justSent, setJustSent] = useState<string | null>(null);
  const selected = d.pending.find((c) => c.id === params.get('course'));
  const done = d.file.courses.filter((c) => d.feedbackDone.has(c.id));
  const title = (sc: StudentCourse) => {
    const c = d.course(sc.course_id);
    return c ? courseTitle(c.name, c.code) : sc.course_id;
  };

  if (selected) return <FeedbackForm d={d} sc={selected} title={title(selected)} onSent={() => setJustSent(selected.id)} />;

  const sent = justSent ? d.file.courses.find((c) => c.id === justSent) : undefined;
  return (
    <div className="grid gap-8">
      {sent && (
        <div role="status" className="flex flex-wrap items-center gap-4 rounded-2xl bg-green-tint px-5 py-4">
          <PartyPopper className="shrink-0 text-green-ink" aria-hidden />
          <p className="min-w-0 flex-[1_1_16rem]">
            <span className="font-semibold">Thank you! Your feedback on {title(sent)} is sent.</span>{' '}
            <span className="text-ink-2">Your mark is now unlocked if it has been entered.</span>
          </p>
          <button type="button" onClick={() => d.go('grades')} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-blue px-5 font-semibold text-on-blue hover:bg-blue-deep">
            See my grades <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      )}

      <p className="measure text-ink-2">
        After each course, tell us how it went. Your answers help your teachers improve their lessons. Teachers see summaries without your name.
        {d.site.settings.feedback_required && ' Each course’s mark appears once you send its feedback.'}
      </p>

      <section aria-labelledby="fb-pending" className="grid gap-3">
        <h2 id="fb-pending" className="t-label text-ink-3">
          Waiting for your feedback
        </h2>
        {d.pending.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-sheet-2 p-5 text-ink-2">
            <CheckCircle2 size={18} className="text-green-ink" aria-hidden /> You’re all done. New courses appear here when they finish.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {d.pending.map((sc) => {
              const teacher = d.teacher(sc.teacher_id);
              return (
                <li key={sc.id}>
                  <button
                    type="button"
                    onClick={() => d.go('feedback', { course: sc.id })}
                    className="grid h-full w-full gap-1 rounded-2xl border-2 border-blue bg-sheet p-5 text-left transition-colors hover:bg-blue-tint"
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <MessageSquareHeart size={18} aria-hidden className="text-blue" /> {title(sc)}
                    </span>
                    <span className="text-sm text-ink-2">
                      Grade {sc.grade_level} · {shortAcademicYear(sc.academic_year)}
                      {teacher ? ` · ${teacher.full_name}` : ''}
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1 font-semibold text-blue">
                      Start · about 3 minutes <ArrowRight size={16} aria-hidden />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section aria-labelledby="fb-done" className="grid gap-3">
          <h2 id="fb-done" className="t-label text-ink-3">
            Sent
          </h2>
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {done.map((sc) => (
              <li key={sc.id} className="flex items-center justify-between gap-3 border-b border-rule py-2 text-[0.95rem]">
                <span className="min-w-0">{title(sc)}</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm text-green-ink">
                  <CheckCircle2 size={15} aria-hidden /> Sent
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function FeedbackForm({ d, sc, title, onSent }: { d: PortalData; sc: StudentCourse; title: string; onSent: () => void }) {
  const qc = useQueryClient();
  const reduced = useReducedMotion();
  const [answers, setAnswers] = useState<FeedbackAnswers>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const teacher = d.teacher(sc.teacher_id);
  const answered = REQUIRED_IDS.filter((id) => answers[id] !== undefined && answers[id] !== '').length;
  const set = (id: string, v: string | number) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setError('');
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = missingAnswers(answers);
    if (missing.length) {
      setError(`Please answer every question with options (${missing.length} left).`);
      document.getElementById(`q-${missing[0]}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    try {
      const clean: FeedbackAnswers = {};
      for (const [k, v] of Object.entries(answers)) clean[k] = typeof v === 'string' ? v.trim().slice(0, 1000) : v;
      await submitFeedback(d.student.id, sc.id, clean);
      await qc.invalidateQueries({ queryKey: ['student-file', d.student.id] });
      onSent();
      d.go('feedback');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-10" noValidate>
      <div className="grid gap-3">
        <button type="button" onClick={() => d.go('feedback')} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-blue">
          <ArrowLeft size={16} aria-hidden /> All feedback
        </button>
        <h2 className="font-display text-4xl font-semibold leading-tight">{title}</h2>
        <p className="text-ink-2">
          Grade {sc.grade_level} · {shortAcademicYear(sc.academic_year)}
          {teacher ? ` · taught by ${teacher.full_name}` : ''}
        </p>
        <div className="flex items-center gap-3" aria-live="polite">
          <div className="h-2 w-48 overflow-hidden rounded-full bg-sheet-2 ring-1 ring-rule">
            <motion.div className="h-full rounded-full bg-viz-1" animate={{ width: `${(answered / REQUIRED_IDS.length) * 100}%` }} />
          </div>
          <span className="text-sm text-ink-2 t-num">
            {answered} of {REQUIRED_IDS.length} answered
          </span>
        </div>
      </div>

      {FEEDBACK_FORM.map((section) => (
        <fieldset key={section.id} className="grid gap-6 border-t border-rule pt-6">
          <legend className="sr-only">{section.title}</legend>
          <div className="grid gap-1">
            <h3 className="font-display text-2xl font-semibold">
              {section.id === 'teacher' && teacher ? `Your teacher: ${teacher.full_name}` : section.title}
            </h3>
            <p className="text-ink-2">{section.intro}</p>
          </div>
          {section.questions.map((q) => (
            <QuestionField key={q.id} q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} disabled={d.readOnly} />
          ))}
        </fieldset>
      ))}

      {error && (
        <p role="alert" className="rounded-lg bg-maroon-tint px-3 py-2 text-maroon">
          {error}
        </p>
      )}
      {d.readOnly ? (
        <p className="text-ink-3">Staff preview: only the student can send this form.</p>
      ) : (
        <button type="submit" disabled={busy} className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-blue px-7 text-lg font-semibold text-on-blue hover:bg-blue-deep disabled:opacity-60">
          {busy ? 'Sending…' : 'Send feedback'}
        </button>
      )}
      <p className="text-sm text-ink-3">You can’t change your answers after sending.</p>
    </form>
  );
}

function QuestionField({ q, value, onChange, disabled }: { q: Question; value: string | number | undefined; onChange: (v: string | number) => void; disabled: boolean }) {
  const id = `q-${q.id}`;
  if (q.kind === 'text') {
    return (
      <div className="grid gap-1.5">
        <label htmlFor={id} className="font-semibold">
          {q.text} <span className="font-normal text-ink-3">(optional)</span>
        </label>
        <textarea
          id={id}
          rows={3}
          maxLength={1000}
          value={String(value ?? '')}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.hint}
          className="rounded-lg border border-rule-strong bg-sheet px-3 py-2"
        />
      </div>
    );
  }
  const options = q.kind === 'rating' ? q.scale.map((label, i) => ({ value: i + 1, label })) : q.options.map((label) => ({ value: label, label }));
  return (
    <fieldset id={id} className="grid gap-2 scroll-mt-28">
      <legend className="mb-2 font-semibold">{q.text}</legend>
      <div className={`grid gap-1.5 ${options.length === 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-3'}`}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={String(o.value)}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue sm:justify-center sm:text-center ${
                checked ? 'border-blue bg-blue text-on-blue' : 'border-rule hover:border-blue'
              } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <input type="radio" name={id} checked={checked} disabled={disabled} onChange={() => onChange(o.value)} className="sr-only" />
              {q.kind === 'rating' && <span className={`font-mono text-xs ${checked ? '' : 'text-ink-3'} sm:hidden`}>{o.value}</span>}
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
