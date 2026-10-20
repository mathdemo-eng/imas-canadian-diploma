import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, Eye, KeyRound, ListPlus, NotebookPen, Pencil, RotateCcw, Trash2, TrendingUp, Unlock, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TERM_LABEL, courseTitle } from '../content/labels';
import type { Term } from '../content/types';
import { shortAcademicYear } from '../lib/academic-year';
import { groupByYear, graduationProgress, outcomeOf, pendingFeedback, planYearRows } from '../lib/progress';
import { DECISION_LABEL, undoPromotion } from '../lib/promotion';
import {
  addMissingStudentCourses,
  deleteFeedback,
  deleteMark,
  deleteStudentCourse,
  fetchStudentNotes,
  saveMarks,
  saveStudentCourses,
  saveStudentNotes,
  type CourseStatus,
  type Promotion,
  type StudentCourse,
  type StudentFile,
} from '../lib/records';
import { STATUS_LABEL, parseMark } from '../lib/sheets';
import { blockStudent, removeStudent, resetStudentPassword, unblockStudent, updateStudent, type StudentRecord } from '../lib/students';
import { OutcomeChip, formatMark } from '../portal/ui';
import { useAdmin } from './AdminLayout';
import { Field, Message, Panel, StudentChips, btn, errorText, gradeYear, input, refreshRecords, useCurrentYear, usePromotions, useStaffFile, useStudents, useTeachers } from './kit';
import { YearSelect } from './StudentsPage';

type Msg = { ok: boolean; text: string } | null;

/** Runs a change, refreshes what depends on it, and reports the outcome. */
function useAction() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
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
  return { busy, msg, setMsg, act };
}

export function StudentDetailPage() {
  const { studentId = '' } = useParams();
  const students = useStudents();
  const student = students.data?.find((s) => s.student_id === studentId);

  if (students.isLoading) return <p role="status" className="text-ink-3">Loading…</p>;
  if (students.isError) return <p className="text-maroon">The student couldn’t be loaded: {errorText(students.error)}</p>;
  if (!student) {
    return (
      <div className="grid gap-4">
        <BackLink />
        <h1 className="t-h1">Student not found</h1>
        <p className="text-ink-2">There is no student with the ID {studentId}. They may have been removed.</p>
      </div>
    );
  }
  return <StudentDetail key={student.id} student={student} />;
}

function BackLink() {
  return (
    <Link to="/admin/students" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-blue">
      <ArrowLeft size={16} aria-hidden /> All students
    </Link>
  );
}

function StudentDetail({ student }: { student: StudentRecord }) {
  const { content } = useAdmin();
  const file = useStaffFile(student.id);
  const track = content.tracks.find((t) => t.id === student.track_id);
  const progress = file.data ? graduationProgress(student, content, file.data, content.settings) : null;
  const waiting = file.data ? pendingFeedback(file.data, content.settings).length : 0;

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="grid gap-3">
        <BackLink />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <p className="font-mono text-ink-3">{student.student_id}</p>
            <h1 className="t-h1">{student.full_name}</h1>
            <p className="text-ink-2">
              {track?.name ?? 'No cohort set'} · {gradeYear(student, shortAcademicYear)}
            </p>
            <StudentChips student={student} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/admin/students/${encodeURIComponent(student.student_id)}/view`} className={btn.primary}>
              <Eye size={18} aria-hidden /> View as student
            </Link>
            <Link to="/admin/promotion" state={{ studentIds: [student.id] }} className={btn.secondary}>
              <TrendingUp size={18} aria-hidden /> Promote
            </Link>
          </div>
        </div>
        {progress && (
          <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Subjects covered', `${progress.covered} / ${progress.total}`],
              ['Left to graduate', progress.remaining.length],
              [student.enrolment_status === 'graduated' ? 'Graduated' : 'Expected graduation', progress.expectedGraduation ? `July ${progress.expectedGraduation}` : '—'],
              ['Feedback to send', waiting],
            ].map(([k, v]) => (
              <div key={String(k)} className="grid gap-0.5 rounded-xl border border-rule bg-sheet p-4">
                <dt className="text-sm text-ink-3">{k}</dt>
                <dd className="font-display text-2xl font-semibold t-num">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <ProfilePanel student={student} />
        <div className="grid min-w-0 gap-6">
          <AccessPanel student={student} />
          <NotesPanel student={student} />
        </div>
      </div>
      <RecordsPanel student={student} file={file.data} loading={file.isLoading} error={file.error} />
      <HistoryPanel student={student} file={file.data} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subjects and marks
// ---------------------------------------------------------------------------

function RecordsPanel({ student, file, loading, error }: { student: StudentRecord; file?: StudentFile; loading: boolean; error: unknown }) {
  const { content } = useAdmin();
  const teachers = useTeachers();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<'subject' | 'plan' | null>(null);
  const groups = useMemo(() => (file ? groupByYear(file.courses).reverse() : []), [file]);
  const marks = new Map(file?.marks.map((m) => [m.student_course_id, m]));
  const feedback = new Set(file?.feedback.map((f) => f.student_course_id));
  const course = (id: string) => content.courses.find((c) => c.id === id);
  const teacher = (id: string | null) => teachers.data?.find((t) => t.id === id);

  return (
    <Panel
      id="records"
      title="Subjects and marks"
      intro="Everything this student has studied, is studying and will study, by academic year. Edit a row to change its status, teacher or mark."
      actions={
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn.secondary} onClick={() => setAdding(adding === 'plan' ? null : 'plan')} aria-expanded={adding === 'plan'}>
            <ListPlus size={16} aria-hidden /> Plan a year
          </button>
          <button type="button" className={btn.secondary} onClick={() => setAdding(adding === 'subject' ? null : 'subject')} aria-expanded={adding === 'subject'}>
            Add a subject
          </button>
        </div>
      }
    >
      {adding === 'plan' && <PlanYear student={student} onDone={() => setAdding(null)} />}
      {adding === 'subject' && <AddSubject student={student} onDone={() => setAdding(null)} />}
      {loading && <p role="status" className="text-ink-3">Loading subjects…</p>}
      {Boolean(error) && <Message tone="error">{errorText(error)}</Message>}
      {file && groups.length === 0 && (
        <p className="rounded-xl border border-dashed border-rule-strong p-5 text-ink-3">
          No subjects recorded yet. Use <strong>Plan a year</strong> to add a whole year from the cohort plan, or upload a sheet on the Subjects &amp; grades page.
        </p>
      )}
      {groups.map((g) => (
        <section key={g.academic_year} aria-labelledby={`year-${g.academic_year}`} className="grid gap-2">
          <h3 id={`year-${g.academic_year}`} className="flex items-baseline gap-3 border-b-2 border-ink pb-1.5">
            <span className="font-display text-xl font-semibold">Grade {g.grade}</span>
            <span className="font-mono text-sm text-ink-3">{g.academic_year}</span>
          </h3>
          <ul className="grid">
            {g.terms
              .flatMap((t) => t.courses)
              .map((sc) => {
                const c = course(sc.course_id);
                const m = marks.get(sc.id);
                const outcome = outcomeOf(sc, m, content.settings.pass_mark);
                return (
                  <li key={sc.id} className="border-b border-rule py-2.5">
                    <div className="grid items-center gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_5rem_12.5rem_auto]">
                      <div className="grid min-w-0 gap-0.5">
                        <p className="font-semibold">{c ? courseTitle(c.name, c.code) : sc.course_id}</p>
                        <p className="text-sm text-ink-3">
                          {TERM_LABEL[sc.term]}
                          {sc.grade_level !== g.grade ? ` · Grade ${sc.grade_level} course` : ''}
                          {sc.attempt > 1 ? ` · attempt ${sc.attempt}` : ''}
                          {teacher(sc.teacher_id) ? ` · ${teacher(sc.teacher_id)!.full_name}` : ''}
                          {sc.status === 'completed' && content.settings.feedback_required
                            ? feedback.has(sc.id)
                              ? ' · feedback sent'
                              : m
                                ? ' · mark hidden from the student until they send feedback'
                                : ' · feedback not sent yet'
                            : ''}
                        </p>
                      </div>
                      <span className="font-display text-lg font-semibold t-num">{m ? formatMark(m.mark) : '—'}</span>
                      <OutcomeChip outcome={outcome} staff />
                      <button
                        type="button"
                        onClick={() => setEditing(editing === sc.id ? null : sc.id)}
                        aria-expanded={editing === sc.id}
                        aria-label={`Edit ${c ? courseTitle(c.name, c.code) : sc.course_id}, ${sc.academic_year}`}
                        className={btn.quiet}
                      >
                        <Pencil size={15} aria-hidden /> Edit
                      </button>
                    </div>
                    {editing === sc.id && <RecordEditor sc={sc} feedbackSent={feedback.has(sc.id)} onDone={() => setEditing(null)} mark={m} />}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </Panel>
  );
}

const STATUSES: CourseStatus[] = ['upcoming', 'in_progress', 'completed', 'withdrawn'];
const TERMS: Term[] = ['FY', 'S1', 'S2'];

function RecordEditor({ sc, mark, feedbackSent, onDone }: { sc: StudentCourse; mark?: { mark: number; ca_mark: number | null; exam_mark: number | null }; feedbackSent: boolean; onDone: () => void }) {
  const { content } = useAdmin();
  const teachers = useTeachers();
  const { busy, msg, setMsg, act } = useAction();
  const [status, setStatus] = useState<CourseStatus>(sc.status);
  const [term, setTerm] = useState<Term>(sc.term);
  const [grade, setGrade] = useState(String(sc.grade_level));
  const [teacher, setTeacher] = useState(sc.teacher_id ?? '');
  const [final, setFinal] = useState(mark ? String(mark.mark) : '');
  const [ca, setCa] = useState(mark?.ca_mark != null ? String(mark.ca_mark) : '');
  const [exam, setExam] = useState(mark?.exam_mark != null ? String(mark.exam_mark) : '');
  const [confirm, setConfirm] = useState(false);
  const k = `rec-${sc.id}`;
  const { ca_weight, exam_weight } = content.settings;

  async function save(e: FormEvent) {
    e.preventDefault();
    const [f, a, x] = [parseMark(final), parseMark(ca), parseMark(exam)];
    if (f === null || a === null || x === null) return setMsg({ ok: false, text: 'Marks must be numbers from 0 to 100.' });
    let value = f;
    if (value === undefined && a !== undefined && x !== undefined) value = Math.round(((a * ca_weight + x * exam_weight) / 100) * 10) / 10;
    if (value !== undefined && status !== 'completed') return setMsg({ ok: false, text: 'A course with a mark must be marked Completed.' });
    const ok = await act(async () => {
      await saveStudentCourses([
        { student_id: sc.student_id, course_id: sc.course_id, academic_year: sc.academic_year, grade_level: Number(grade) as 10 | 11 | 12, term, status, teacher_id: teacher || null },
      ]);
      if (value !== undefined) await saveMarks([{ student_course_id: sc.id, mark: value, ca_mark: a ?? null, exam_mark: x ?? null }]);
      else if (mark) await deleteMark(sc.id);
    }, 'Saved.');
    if (ok) onDone();
  }

  return (
    <form onSubmit={save} className="mt-3 grid gap-4 rounded-xl bg-sheet-2 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field id={`${k}-status`} label="Status">
          <select id={`${k}-status`} value={status} onChange={(e) => setStatus(e.target.value as CourseStatus)} className={input}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${k}-term`} label="Semester">
          <select id={`${k}-term`} value={term} onChange={(e) => setTerm(e.target.value as Term)} className={input}>
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {TERM_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${k}-grade`} label="Course grade">
          <select id={`${k}-grade`} value={grade} onChange={(e) => setGrade(e.target.value)} className={input}>
            {[10, 11, 12].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${k}-teacher`} label="Teacher">
          <select id={`${k}-teacher`} value={teacher} onChange={(e) => setTeacher(e.target.value)} className={input}>
            <option value="">Not set</option>
            {(teachers.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={`${k}-final`} label="Final mark (%)" help="Leave empty if not marked yet.">
          <input id={`${k}-final`} inputMode="decimal" value={final} onChange={(e) => setFinal(e.target.value)} className={input} />
        </Field>
        <Field id={`${k}-ca`} label={`Continuous assessment (${ca_weight}%)`} help="Optional.">
          <input id={`${k}-ca`} inputMode="decimal" value={ca} onChange={(e) => setCa(e.target.value)} className={input} />
        </Field>
        <Field id={`${k}-exam`} label={`Final exam (${exam_weight}%)`} help="With both, the final mark is worked out if left empty.">
          <input id={`${k}-exam`} inputMode="decimal" value={exam} onChange={(e) => setExam(e.target.value)} className={input} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className={btn.primary}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onDone} className={btn.quiet}>
          Cancel
        </button>
        {feedbackSent && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(() => deleteFeedback(sc.id), 'Feedback removed. The student can send it again; the mark stays hidden from them until they do.')}
            className={btn.quiet}
          >
            <RotateCcw size={15} aria-hidden /> Let them redo feedback
          </button>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {confirm ? (
            <>
              <span className="text-sm">Remove this subject{mark ? ' and its mark' : ''}?</span>
              <button type="button" disabled={busy} onClick={() => void act(() => deleteStudentCourse(sc.id), 'Removed.').then((ok) => ok && onDone())} className={btn.danger}>
                Yes, remove
              </button>
              <button type="button" onClick={() => setConfirm(false)} className={btn.quiet}>
                Keep
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className={`${btn.quiet} text-maroon`}>
              <Trash2 size={15} aria-hidden /> Remove subject
            </button>
          )}
        </span>
      </div>
      {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
    </form>
  );
}

function PlanYear({ student, onDone }: { student: StudentRecord; onDone: () => void }) {
  const { content } = useAdmin();
  const current = useCurrentYear();
  const { busy, msg, act } = useAction();
  const [grade, setGrade] = useState(String(student.current_grade ?? 10));
  const [year, setYear] = useState(student.academic_year ?? current);
  const [status, setStatus] = useState<'upcoming' | 'in_progress'>('in_progress');
  const track = content.tracks.find((t) => t.id === student.track_id);
  const rows = planYearRows(student, content, Number(grade) as 10 | 11 | 12, year, status);

  if (!track) return <Message tone="info">Set the student’s cohort first (in Profile), so their plan is known.</Message>;
  return (
    <div className="grid gap-3 rounded-xl bg-sheet-2 p-4">
      <p className="text-ink-2">
        Adds every course of the <strong className="text-ink">{track.name}</strong> plan for one grade. Courses already recorded for that year are left as they are.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="plan-grade" label="Grade">
          <select id="plan-grade" value={grade} onChange={(e) => setGrade(e.target.value)} className={input}>
            {[10, 11, 12].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </Field>
        <YearSelect id="plan-year" label="Academic year" value={year} onChange={setYear} current={current} />
        <Field id="plan-status" label="Add them as">
          <select id="plan-status" value={status} onChange={(e) => setStatus(e.target.value as 'upcoming' | 'in_progress')} className={input}>
            <option value="in_progress">In progress</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || rows.length === 0}
          onClick={() => {
            let added = 0;
            void act(
              async () => {
                added = await addMissingStudentCourses(rows);
              },
              () => `Added ${added} of ${rows.length} courses for ${year}${added < rows.length ? ` (${rows.length - added} were already recorded)` : ''}.`,
            );
          }}
          className={btn.primary}
        >
          {rows.length ? `Add ${rows.length} courses` : 'No courses in the plan for this grade'}
        </button>
        <button type="button" onClick={onDone} className={btn.quiet}>
          Cancel
        </button>
      </div>
      {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
    </div>
  );
}

function AddSubject({ student, onDone }: { student: StudentRecord; onDone: () => void }) {
  const { content } = useAdmin();
  const current = useCurrentYear();
  const { busy, msg, setMsg, act } = useAction();
  const courses = [...content.courses].sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
  const [courseId, setCourseId] = useState('');
  const [year, setYear] = useState(student.academic_year ?? current);
  const [grade, setGrade] = useState(String(student.current_grade ?? 10));
  const [term, setTerm] = useState<Term>('FY');
  const [status, setStatus] = useState<CourseStatus>('in_progress');

  // Default the semester to where the course sits in the student's plan.
  useEffect(() => {
    const p = content.placements.find((x) => x.track_id === student.track_id && x.course_id === courseId);
    if (p) {
      setTerm(p.term);
      setGrade(String(p.grade));
    }
  }, [courseId, content.placements, student.track_id]);

  return (
    <form
      className="grid gap-3 rounded-xl bg-sheet-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!courseId) return setMsg({ ok: false, text: 'Choose a course.' });
        void act(
          () => saveStudentCourses([{ student_id: student.id, course_id: courseId, academic_year: year, grade_level: Number(grade) as 10 | 11 | 12, term, status }]),
          'Subject added.',
        ).then((ok) => ok && onDone());
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="add-course" label="Course">
          <select id="add-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className={input}>
            <option value="">Choose…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {courseTitle(c.name, c.code)}
              </option>
            ))}
          </select>
        </Field>
        <YearSelect id="add-year" label="Academic year" value={year} onChange={setYear} current={current} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="add-grade" label="Course grade">
          <select id="add-grade" value={grade} onChange={(e) => setGrade(e.target.value)} className={input}>
            {[10, 11, 12].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </Field>
        <Field id="add-term" label="Semester">
          <select id="add-term" value={term} onChange={(e) => setTerm(e.target.value as Term)} className={input}>
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {TERM_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="add-status" label="Status">
          <select id="add-status" value={status} onChange={(e) => setStatus(e.target.value as CourseStatus)} className={input}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={btn.primary}>
          Add subject
        </button>
        <button type="button" onClick={onDone} className={btn.quiet}>
          Cancel
        </button>
      </div>
      {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Profile, access and notes
// ---------------------------------------------------------------------------

function ProfilePanel({ student }: { student: StudentRecord }) {
  const { content } = useAdmin();
  const teachers = useTeachers();
  const current = useCurrentYear();
  const { busy, msg, setMsg, act } = useAction();
  const [name, setName] = useState(student.full_name);
  const [track, setTrack] = useState(student.track_id ?? '');
  const [grade, setGrade] = useState(student.current_grade ? String(student.current_grade) : '');
  const [year, setYear] = useState(student.academic_year ?? '');
  const [status, setStatus] = useState(student.enrolment_status);
  const [gradYear, setGradYear] = useState(student.graduated_year ?? '');
  const [advisor, setAdvisor] = useState(student.advisor_id ?? '');
  const [ielts, setIelts] = useState(student.ielts_band === null ? '' : String(student.ielts_band));

  function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setMsg({ ok: false, text: 'The name can’t be empty.' });
    const band = ielts.trim() === '' ? null : Number(ielts);
    if (band !== null && !(band >= 0 && band <= 9 && Math.round(band * 2) === band * 2)) return setMsg({ ok: false, text: 'The IELTS band should be from 0 to 9, in steps of 0.5.' });
    void act(
      () =>
        updateStudent(student.id, {
          full_name: name.trim(),
          track_id: track || null,
          current_grade: grade ? (Number(grade) as 10 | 11 | 12) : null,
          academic_year: year || null,
          enrolment_status: status,
          graduated_year: status === 'graduated' ? gradYear || year || null : null,
          advisor_id: advisor || null,
          ielts_band: band,
        }),
      'Saved.',
    );
  }

  const k = 'profile';
  return (
    <Panel id="profile" title="Profile">
      <form onSubmit={save} className="grid gap-3">
        <Field id={`${k}-name`} label="Full name">
          <input id={`${k}-name`} value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </Field>
        <Field id={`${k}-track`} label="Cohort">
          <select id={`${k}-track`} value={track} onChange={(e) => setTrack(e.target.value)} className={input}>
            <option value="">Not set</option>
            {content.tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id={`${k}-grade`} label="Current grade">
            <select id={`${k}-grade`} value={grade} onChange={(e) => setGrade(e.target.value)} className={input}>
              <option value="">Not set</option>
              {[10, 11, 12].map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </Field>
          <YearSelect id={`${k}-year`} label="Academic year" value={year} onChange={setYear} current={current} allowEmpty />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id={`${k}-status`} label="Enrolment">
            <select id={`${k}-status`} value={status} onChange={(e) => setStatus(e.target.value as StudentRecord['enrolment_status'])} className={input}>
              <option value="active">Studying now</option>
              <option value="graduated">Graduated</option>
              <option value="withdrawn">Left the programme</option>
            </select>
          </Field>
          {status === 'graduated' ? (
            <YearSelect id={`${k}-grad`} label="Graduated in" value={gradYear || year} onChange={setGradYear} current={current} />
          ) : (
            <Field id={`${k}-ielts`} label="IELTS band">
              <input id={`${k}-ielts`} inputMode="decimal" value={ielts} onChange={(e) => setIelts(e.target.value)} placeholder="e.g. 6.5" className={input} />
            </Field>
          )}
        </div>
        {status === 'graduated' && (
          <Field id={`${k}-ielts`} label="IELTS band">
            <input id={`${k}-ielts`} inputMode="decimal" value={ielts} onChange={(e) => setIelts(e.target.value)} placeholder="e.g. 6.5" className={input} />
          </Field>
        )}
        <Field id={`${k}-advisor`} label="Academic advisor" help="Shown to the student from Grade 12, with a button to book an appointment.">
          <select id={`${k}-advisor`} value={advisor} onChange={(e) => setAdvisor(e.target.value)} className={input}>
            <option value="">None</option>
            {(teachers.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
                {t.active ? '' : ' (hidden from students)'}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" disabled={busy} className={`${btn.primary} w-fit`}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
        {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
      </form>
    </Panel>
  );
}

function AccessPanel({ student }: { student: StudentRecord }) {
  const navigate = useNavigate();
  const notes = useQuery({ queryKey: ['student-notes', student.id], queryFn: () => fetchStudentNotes(student.id) });
  const qc = useQueryClient();
  const { busy, msg, setMsg, act } = useAction();
  const [reason, setReason] = useState('');
  const [temp, setTemp] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const first = student.full_name.split(' ')[0];

  return (
    <Panel id="access" title="Portal access">
      <p className="flex items-center gap-2 text-ink-2">
        <UserRound size={16} aria-hidden className="shrink-0 text-blue" />
        <span>
          Signs in as <span className="font-mono text-ink">{student.student_id}</span>
          {student.must_change_password ? ' · hasn’t created their own password yet' : ' · has their own password'}
        </span>
      </p>

      {student.blocked ? (
        <div className="grid gap-3 rounded-xl border-l-4 border-maroon bg-maroon-tint p-4">
          <p className="font-semibold">Access is blocked</p>
          <p className="text-sm text-ink-2">
            Reason (staff only): {notes.data?.blocked_reason ? <span className="text-ink">{notes.data.blocked_reason}</span> : 'not recorded'}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await unblockStudent(student.student_id);
                await qc.invalidateQueries({ queryKey: ['student-notes', student.id] });
              }, `${first} can sign in again.`)
            }
            className={`${btn.secondary} w-fit`}
          >
            <Unlock size={16} aria-hidden /> Unblock
          </button>
        </div>
      ) : (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) return setMsg({ ok: false, text: 'Write the reason, for example “Fees unpaid for Semester 1”. Only staff see it.' });
            void act(async () => {
              await blockStudent(student.student_id, reason.trim());
              await qc.invalidateQueries({ queryKey: ['student-notes', student.id] });
              setReason('');
            }, `${first}’s access is blocked. They see: “Your portal access is paused. Please contact the Canadian Diploma office at school.”`);
          }}
        >
          <label htmlFor="block-reason" className="text-sm font-semibold">
            Block access
          </label>
          <p className="text-sm text-ink-3">They can’t sign in and their records are hidden until you unblock them. Nothing is deleted.</p>
          <textarea id="block-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (only staff see it)" className={`${input} py-2`} />
          <button type="submit" disabled={busy} className={`${btn.danger} w-fit`}>
            <Ban size={15} aria-hidden /> Block access
          </button>
        </form>
      )}

      <form
        className="grid gap-2 border-t border-rule pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (temp.trim().length < 6) return setMsg({ ok: false, text: 'The temporary password must be at least 6 characters.' });
          void act(
            () => resetStudentPassword(student.student_id, temp.trim()),
            `Password reset. Give ${first} the temporary password; they will create their own when they next sign in.`,
          ).then(() => setTemp(''));
        }}
      >
        <label htmlFor="reset-temp" className="text-sm font-semibold">
          Forgotten password? Set a temporary one
        </label>
        <div className="flex flex-wrap gap-2">
          <input id="reset-temp" value={temp} onChange={(e) => setTemp(e.target.value)} autoComplete="off" placeholder="e.g. their ID number" className={`${input} min-w-0 flex-1 font-mono`} />
          <button type="submit" disabled={busy} className={btn.secondary}>
            <KeyRound size={16} aria-hidden /> Reset password
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-4">
        {confirmRemove ? (
          <>
            <p className="text-sm">
              Remove <strong>{student.full_name}</strong>, their sign-in account and all their records? This can’t be undone. To keep their records, block them or
              set Enrolment to “Left the programme” instead.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act(() => removeStudent(student.student_id), '').then((ok) => ok && navigate('/admin/students'))}
              className={btn.danger}
            >
              Yes, remove
            </button>
            <button type="button" onClick={() => setConfirmRemove(false)} className={btn.quiet}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmRemove(true)} className={`${btn.quiet} -ml-3 text-maroon`}>
            <Trash2 size={15} aria-hidden /> Remove student
          </button>
        )}
      </div>
      {msg && msg.text && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
    </Panel>
  );
}

function NotesPanel({ student }: { student: StudentRecord }) {
  const notes = useQuery({ queryKey: ['student-notes', student.id], queryFn: () => fetchStudentNotes(student.id) });
  const qc = useQueryClient();
  const { busy, msg, act } = useAction();
  const [text, setText] = useState<string | null>(null);
  const value = text ?? notes.data?.notes ?? '';

  return (
    <Panel id="notes" title="Staff notes" intro="Private notes for the Canadian Diploma team. The student never sees them.">
      <label htmlFor="staff-notes" className="sr-only">
        Staff notes
      </label>
      <textarea id="staff-notes" value={value} onChange={(e) => setText(e.target.value)} rows={4} className={`${input} py-2`} disabled={notes.isLoading} />
      <button
        type="button"
        disabled={busy || text === null}
        onClick={() =>
          void act(async () => {
            await saveStudentNotes({ student_id: student.id, blocked_reason: notes.data?.blocked_reason ?? '', notes: value });
            await qc.invalidateQueries({ queryKey: ['student-notes', student.id] });
            setText(null);
          }, 'Notes saved.')
        }
        className={`${btn.secondary} w-fit`}
      >
        <NotebookPen size={16} aria-hidden /> Save notes
      </button>
      {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Promotion history
// ---------------------------------------------------------------------------

function HistoryPanel({ student, file }: { student: StudentRecord; file?: StudentFile }) {
  const promotions = usePromotions(student.id);
  const { busy, msg, act } = useAction();
  const [confirm, setConfirm] = useState<string | null>(null);
  const list = promotions.data ?? [];
  const latest = list.find((p) => !p.undone_at);

  return (
    <Panel id="history" title="Promotion history" intro="Each end-of-year decision for this student. The most recent one can be undone.">
      {promotions.isLoading && <p className="text-ink-3">Loading…</p>}
      {list.length === 0 && promotions.data && <p className="text-ink-3">No decisions yet.</p>}
      <ol className="grid gap-2">
        {list.map((p) => (
          <li key={p.id} className={`grid gap-1 rounded-xl border border-rule p-3 ${p.undone_at ? 'opacity-60' : ''}`}>
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">
                {DECISION_LABEL[p.decision]}
                {p.undone_at ? ' · undone' : ''}
              </span>
              <span className="text-sm text-ink-3">{new Date(p.decided_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </p>
            <p className="text-sm text-ink-2">{describeMove(p)}</p>
            <p className="text-sm text-ink-3">
              By {p.decided_by}
              {p.note ? ` · “${p.note}”` : ''}
            </p>
            {p.id === latest?.id && (
              <UndoButton p={p} student={student} file={file} busy={busy} confirming={confirm === p.id} setConfirm={setConfirm} act={act} />
            )}
          </li>
        ))}
      </ol>
      {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
    </Panel>
  );
}

export function describeMove(p: Pick<Promotion, 'decision' | 'from_grade' | 'to_grade' | 'from_year' | 'to_year'>) {
  const from = [p.from_grade ? `Grade ${p.from_grade}` : '', p.from_year ?? ''].filter(Boolean).join(', ');
  if (p.decision === 'graduated') return `Graduated from ${from || 'the programme'}`;
  if (p.decision === 'withdrawn') return `Left the programme (was ${from || 'enrolled'})`;
  const to = [p.to_grade ? `Grade ${p.to_grade}` : '', p.to_year ?? ''].filter(Boolean).join(', ');
  return `${from || '—'} → ${to || '—'}`;
}

export function UndoButton({
  p,
  student,
  file,
  busy,
  confirming,
  setConfirm,
  act,
}: {
  p: Promotion;
  student: StudentRecord;
  file?: { courses: StudentCourse[]; marks: { student_course_id: string }[] };
  busy: boolean;
  confirming: boolean;
  setConfirm: (id: string | null) => void;
  act: (fn: () => Promise<unknown>, done: string | (() => string)) => Promise<boolean>;
}) {
  const added = file?.courses.filter((c) => c.promotion_id === p.id) ?? [];
  const marked = added.filter((c) => file?.marks.some((m) => m.student_course_id === c.id)).length;
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirm(p.id)} className={`${btn.quiet} -ml-3 w-fit`}>
        <RotateCcw size={15} aria-hidden /> Undo
      </button>
    );
  }
  return (
    <div className="grid gap-2 rounded-lg bg-sheet-2 p-3">
      <p className="text-sm">
        Put {student.full_name} back to {[p.from_grade ? `Grade ${p.from_grade}` : '', p.from_year].filter(Boolean).join(', ') || 'where they were'}
        {added.length ? ` and remove the ${added.length} subjects this decision added` : ''}?
        {marked ? <strong> {marked} of those subjects already have marks, which will be deleted too.</strong> : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act(() => undoPromotion(p, student), 'Undone.').then(() => setConfirm(null))}
          className={btn.danger}
        >
          Yes, undo
        </button>
        <button type="button" onClick={() => setConfirm(null)} className={btn.quiet}>
          Keep it
        </button>
      </div>
    </div>
  );
}
