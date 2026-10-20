import { Download, EyeOff, MessageSquareQuote } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { courseTitle } from '../content/labels';
import { FEEDBACK_FORM, type Question } from '../lib/feedback-form';
import type { Feedback } from '../lib/records';
import { downloadText, toCsv } from '../lib/sheets';
import { useAdmin } from './AdminLayout';
import { Field, Message, Panel, btn, downloadsOff, errorText, input, useAllRecords, useStudents, useTeachers } from './kit';

/** Breakdowns need at least this many responses, so no single student's answers can be picked out. */
const MIN_RESPONSES = 3;

const section = (id: 'teacher' | 'course' | 'words') => FEEDBACK_FORM.find((s) => s.id === id)!;
const ratings = (id: 'teacher' | 'course') => section(id).questions.filter((q): q is Extract<Question, { kind: 'rating' }> => q.kind === 'rating');

function average(list: Feedback[], qid: string): number | null {
  const vals = list.map((f) => f.answers[qid]).filter((v): v is number => typeof v === 'number');
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

const one = (n: number | null) => (n === null ? '—' : n.toFixed(1));

export function FeedbackResultsPage() {
  const { content } = useAdmin();
  const records = useAllRecords();
  const teachers = useTeachers();
  const students = useStudents();
  const [year, setYear] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [courseId, setCourseId] = useState('');

  const data = records.data;
  const years = useMemo(() => [...new Set((data?.courses ?? []).filter((c) => c.status === 'completed').map((c) => c.academic_year))].sort().reverse(), [data]);
  const match = (r: { academic_year: string; teacher_id: string | null; course_id: string }) =>
    (!year || r.academic_year === year) && (!teacherId || r.teacher_id === teacherId) && (!courseId || r.course_id === courseId);
  const completed = (data?.courses ?? []).filter((c) => c.status === 'completed' && match(c));
  const sent = new Set((data?.feedback ?? []).map((f) => f.student_course_id));
  const feedback = (data?.feedback ?? []).filter(match);
  const done = completed.filter((c) => sent.has(c.id)).length;
  const pct = completed.length ? Math.round((done / completed.length) * 100) : 0;

  const pendingByStudent = new Map<string, number>();
  for (const c of completed) if (!sent.has(c.id)) pendingByStudent.set(c.student_id, (pendingByStudent.get(c.student_id) ?? 0) + 1);
  const waiting = [...pendingByStudent.entries()]
    .map(([id, n]) => ({ student: students.data?.find((s) => s.id === id), n }))
    .filter((x) => x.student)
    .sort((a, b) => b.n - a.n || a.student!.student_id.localeCompare(b.student!.student_id));

  const course = (id: string) => content.courses.find((c) => c.id === id);
  const teacherName = (id: string | null) => teachers.data?.find((t) => t.id === id)?.full_name ?? 'No teacher set';
  const byTeacher = groupBy(feedback, (f) => f.teacher_id ?? '');
  const byCourse = groupBy(feedback, (f) => f.course_id);
  const words = section('words').questions;

  function exportCsv() {
    const qs = FEEDBACK_FORM.flatMap((s) => s.questions);
    const rows = feedback.map((f) => {
      const c = course(f.course_id);
      return [f.academic_year, c ? courseTitle(c.name, c.code) : f.course_id, teacherName(f.teacher_id), ...qs.map((q) => f.answers[q.id] ?? '')];
    });
    downloadText(`feedback-${year || 'all-years'}.csv`, toCsv([['Academic year', 'Course', 'Teacher', ...qs.map((q) => q.text)], ...rows]));
  }

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="grid gap-2">
        <h1 className="t-h1">Feedback</h1>
        <p className="measure text-ink-2">
          What students say about each course and its teacher. Students send feedback after each completed course; it is required before they can see that
          course’s mark (and, in Grade 12, their graduation label). Results here are anonymous: no names are shown, and a breakdown appears only once{' '}
          {MIN_RESPONSES} or more students have answered.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="fb-year" label="Academic year">
          <select id="fb-year" value={year} onChange={(e) => setYear(e.target.value)} className={input}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>
        <Field id="fb-teacher" label="Teacher">
          <select id="fb-teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={input}>
            <option value="">All teachers</option>
            {(teachers.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="fb-course" label="Course">
          <select id="fb-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className={input}>
            <option value="">All courses</option>
            {[...content.courses]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {courseTitle(c.name, c.code)}
                </option>
              ))}
          </select>
        </Field>
      </div>

      {records.isLoading && <p role="status" className="text-ink-3">Loading feedback…</p>}
      {records.isError && <Message tone="error">{errorText(records.error)}</Message>}

      {data && (
        <>
          <Panel id="fb-progress" title="Who has sent feedback">
            <div className="grid gap-2">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-display text-5xl font-semibold leading-none t-num">{pct}%</span>
                <span className="text-ink-2">
                  {done} of {completed.length} completed courses have feedback
                </span>
              </p>
              <div className="h-3 overflow-hidden rounded-full bg-sheet-2 ring-1 ring-rule" role="img" aria-label={`${pct}% of completed courses have feedback`}>
                <div className="h-full rounded-full bg-viz-1" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {waiting.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-blue">
                  {waiting.length} {waiting.length === 1 ? 'student hasn’t' : 'students haven’t'} finished their feedback
                </summary>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {waiting.map(({ student: s, n }) => (
                    <li key={s!.id}>
                      <Link to={`/admin/students/${encodeURIComponent(s!.student_id)}`} className="hover:text-blue hover:underline">
                        {s!.full_name}
                      </Link>{' '}
                      <span className="text-ink-3">
                        · {n} {n === 1 ? 'course' : 'courses'}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Panel>

          {feedback.length === 0 ? (
            <p className="rounded-xl border border-dashed border-rule-strong p-6 text-ink-3">No feedback yet for this selection.</p>
          ) : (
            <>
              <section aria-labelledby="fb-teachers" className="grid gap-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 id="fb-teachers" className="t-h2">
                    By teacher
                  </h2>
                  {!downloadsOff && (
                    <button type="button" onClick={exportCsv} className={btn.secondary}>
                      <Download size={16} aria-hidden /> Download answers (anonymous)
                    </button>
                  )}
                </div>
                <p className="text-sm text-ink-3">Average agreement from 1 (strongly disagree) to 5 (strongly agree).</p>
                <ul className="grid gap-4 lg:grid-cols-2">
                  {[...byTeacher.entries()]
                    .sort((a, b) => Number(!a[0]) - Number(!b[0]) || b[1].length - a[1].length)
                    .map(([tid, list]) => (
                      <li key={tid || 'none'} className="grid content-start gap-3 rounded-2xl border border-rule bg-sheet p-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="font-display text-xl font-semibold">{teacherName(tid || null)}</h3>
                          <span className="text-sm text-ink-3">
                            {list.length} {list.length === 1 ? 'response' : 'responses'}
                          </span>
                        </div>
                        {list.length < MIN_RESPONSES ? (
                          <Hidden />
                        ) : (
                          <>
                            <p className="flex items-baseline gap-2">
                              <span className="font-display text-4xl font-semibold leading-none t-num">{one(average(list, 'overall'))}</span>
                              <span className="text-sm text-ink-2">overall course rating out of 5</span>
                            </p>
                            <RatingBars list={list} questions={ratings('teacher')} />
                          </>
                        )}
                      </li>
                    ))}
                </ul>
              </section>

              <Panel id="fb-courses" title="By course">
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Feedback by course">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-rule-strong">
                        <th className="py-2 pr-3 font-semibold">Course</th>
                        <th className="py-2 pr-3 font-semibold t-num">Responses</th>
                        <th className="py-2 pr-3 font-semibold">Overall</th>
                        <th className="py-2 pr-3 font-semibold">Useful content</th>
                        <th className="py-2 pr-3 font-semibold">Prepared for next level</th>
                        <th className="py-2 font-semibold">Workload “too heavy”</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...byCourse.entries()]
                        .sort((a, b) => (course(a[0])?.name ?? a[0]).localeCompare(course(b[0])?.name ?? b[0]))
                        .map(([cid, list]) => {
                          const c = course(cid);
                          const show = list.length >= MIN_RESPONSES;
                          const heavy = list.filter((f) => f.answers.c_workload === 'Too heavy').length;
                          return (
                            <tr key={cid} className="border-b border-rule">
                              <td className="py-2 pr-3">{c ? courseTitle(c.name, c.code) : cid}</td>
                              <td className="py-2 pr-3 t-num">{list.length}</td>
                              <td className="py-2 pr-3 t-num">{show ? one(average(list, 'overall')) : '—'}</td>
                              <td className="py-2 pr-3 t-num">{show ? one(average(list, 'c_relevance')) : '—'}</td>
                              <td className="py-2 pr-3 t-num">{show ? one(average(list, 'c_prepared')) : '—'}</td>
                              <td className="py-2 t-num">{show ? `${Math.round((heavy / list.length) * 100)}%` : '—'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-ink-3">“—” means fewer than {MIN_RESPONSES} responses so far.</p>
              </Panel>

              <Panel id="fb-words" title="In students’ own words" intro="Comments are shown without names, newest first.">
                {feedback.length < MIN_RESPONSES ? (
                  <Hidden />
                ) : (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {words.map((q) => {
                      const list = feedback
                        .filter((f) => typeof f.answers[q.id] === 'string' && String(f.answers[q.id]).trim())
                        .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
                      return (
                        <section key={q.id} className="grid content-start gap-3">
                          <h3 className="flex items-center gap-2 font-semibold">
                            <MessageSquareQuote size={18} aria-hidden className="text-blue" /> {q.text}
                          </h3>
                          {list.length === 0 ? (
                            <p className="text-sm text-ink-3">No comments yet.</p>
                          ) : (
                            <ul className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1" tabIndex={0} aria-label={q.text}>
                              {list.map((f) => {
                                const c = course(f.course_id);
                                return (
                                  <li key={f.student_course_id} className="grid gap-1 rounded-xl bg-sheet-2 p-3">
                                    <p>“{String(f.answers[q.id]).trim()}”</p>
                                    <p className="text-xs text-ink-3">
                                      {c ? courseTitle(c.name, c.code) : f.course_id} · {f.academic_year}
                                    </p>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </>
          )}
        </>
      )}
    </div>
  );
}

function groupBy<T>(rows: T[], key: (r: T) => string) {
  const out = new Map<string, T[]>();
  for (const r of rows) out.set(key(r), [...(out.get(key(r)) ?? []), r]);
  return out;
}

function Hidden() {
  return (
    <p className="flex items-center gap-2 text-sm text-ink-3">
      <EyeOff size={16} aria-hidden /> Shown once {MIN_RESPONSES} or more students have answered, to keep feedback anonymous.
    </p>
  );
}

/** One bar per statement, on the 1–5 scale, with the value written beside it. */
function RatingBars({ list, questions }: { list: Feedback[]; questions: { id: string; text: string }[] }) {
  return (
    <ul className="grid gap-2">
      {questions.map((q) => {
        const avg = average(list, q.id);
        const width = avg === null ? 0 : ((avg - 1) / 4) * 100;
        return (
          <li key={q.id} className="grid gap-1" title={`${q.text}: ${one(avg)} out of 5`}>
            <span className="text-sm text-ink-2">{q.text}</span>
            <span className="flex items-center gap-3">
              <span className="relative h-2.5 flex-1 rounded-full bg-sheet-2 ring-1 ring-rule" aria-hidden>
                <span className="absolute inset-y-0 left-0 rounded-full bg-viz-1" style={{ width: `${Math.max(2, width)}%` }} />
              </span>
              <span className="w-8 text-right text-sm font-semibold t-num">{one(avg)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
