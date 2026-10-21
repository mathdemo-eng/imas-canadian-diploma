import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Download, FileUp, ListPlus, Search, TrendingUp, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { shortAcademicYear } from '../lib/academic-year';
import { loginEmail } from '../lib/auth';
import { fetchAllRecords } from '../lib/records';
import { downloadText, groupSheetCsv, type SheetKind } from '../lib/sheets';
import { importStudents, parseStudentList, updateStudents, type ImportResult, type StudentPatch, type StudentRecord } from '../lib/students';
import { isPreviewBuild, supabaseConfigured } from '../lib/supabase';
import { useAdmin } from './AdminLayout';
import { Field, Message, StudentChips, btn, downloadsOff, errorText, gradeYear, input, refreshRecords, useCurrentYear, useStudents, useTeachers, yearOptions } from './kit';

/** Accounts are created this many at a time, so a list of 300 shows steady progress. */
const BATCH = 25;

const EXAMPLE = `Student ID\tFull name\tID number\tTrack\tGrade\tAcademic year
260001\tAisha Rahman\t080512101234\tCAN · Grade 10 entry\t10\t2026-2027
260002\tDaniel Lim\tA12345678\tcad-sci-g11\t11\t2026-2027`;

type Show = 'all' | 'active' | 'graduated' | 'withdrawn' | 'blocked' | 'waiting';

const SHOW_LABEL: Record<Show, string> = {
  all: 'Everyone',
  active: 'Studying now',
  graduated: 'Graduated',
  withdrawn: 'Left the programme',
  blocked: 'Blocked',
  waiting: 'Waiting for first sign-in',
};

export function StudentsPage() {
  const { content } = useAdmin();
  const students = useStudents();
  const [query, setQuery] = useState('');
  const [cohort, setCohort] = useState('');
  const [grade, setGrade] = useState('');
  const [show, setShow] = useState<Show>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const all = students.data ?? [];
  const trackName = (id: string | null) => content.tracks.find((t) => t.id === id)?.name ?? '';

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((s) => {
      if (q && !`${s.student_id} ${s.full_name}`.toLowerCase().includes(q)) return false;
      if (cohort && (cohort === 'none' ? s.track_id : s.track_id !== cohort)) return false;
      if (grade && (grade === 'none' ? s.current_grade : String(s.current_grade) !== grade)) return false;
      if (show === 'blocked') return s.blocked;
      if (show === 'waiting') return s.must_change_password;
      if (show !== 'all') return s.enrolment_status === show;
      return true;
    });
  }, [all, query, cohort, grade, show]);

  const chosen = all.filter((s) => selected.has(s.id));
  const allVisibleChosen = visible.length > 0 && visible.every((s) => selected.has(s.id));
  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((cur) => {
      const next = new Set(cur);
      for (const s of visible) {
        if (allVisibleChosen) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });

  const counts = {
    active: all.filter((s) => s.enrolment_status === 'active').length,
    blocked: all.filter((s) => s.blocked).length,
    waiting: all.filter((s) => s.must_change_password).length,
  };

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="t-h1">Students</h1>
          <p className="measure text-ink-2">
            Every student in the programme. Open a student to see their subjects and marks, change their grade, block their access or see their portal exactly
            as they do. Tick several students to change them together.
          </p>
        </div>
        <button type="button" className={btn.primary} onClick={() => setAdding((a) => !a)} aria-expanded={adding || all.length === 0}>
          <UserPlus size={18} aria-hidden /> Add students
        </button>
      </div>

      {(adding || (students.data && all.length === 0)) && <AddStudents onClose={all.length ? () => setAdding(false) : undefined} />}

      <section aria-labelledby="students-list-title" className="grid grid-cols-1 gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="students-list-title" className="t-h2">
            All students <span className="font-mono text-base font-normal text-ink-3 t-num">{all.length}</span>
          </h2>
          {all.length > 0 && (
            <p className="text-sm text-ink-2">
              {counts.active} studying now · {counts.waiting} waiting for their first sign-in{counts.blocked ? ` · ${counts.blocked} blocked` : ''}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <label className="grid gap-1 text-sm font-semibold">
            Search
            <span className="relative">
              <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                id="search-students"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Student ID or name"
                className={`${input} pl-9`}
              />
            </span>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Cohort
            <select id="filter-cohort" value={cohort} onChange={(e) => setCohort(e.target.value)} className={input}>
              <option value="">All cohorts</option>
              {content.tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="none">Not set</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Grade
            <select id="filter-grade" value={grade} onChange={(e) => setGrade(e.target.value)} className={input}>
              <option value="">All grades</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
              <option value="none">Not set</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Show
            <select id="filter-students" value={show} onChange={(e) => setShow(e.target.value as Show)} className={input}>
              {(Object.keys(SHOW_LABEL) as Show[]).map((k) => (
                <option key={k} value={k}>
                  {SHOW_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {chosen.length > 0 && <GroupActions chosen={chosen} onClear={() => setSelected(new Set())} />}

        {students.isLoading && <p role="status" className="text-ink-3">Loading students…</p>}
        {students.isError && <p className="text-maroon">The student list couldn’t be loaded: {errorText(students.error)}</p>}
        {students.data && all.length > 0 && visible.length === 0 && (
          <p className="rounded-xl border border-dashed border-rule-strong p-6 text-ink-3">No students match these filters.</p>
        )}
        {visible.length > 0 && (
          <div className="grid overflow-hidden rounded-xl border border-rule bg-sheet">
            <label className="flex items-center gap-3 border-b border-rule bg-sheet-2 px-4 py-2 text-sm font-semibold">
              <input type="checkbox" checked={allVisibleChosen} onChange={toggleAll} className="h-5 w-5 accent-blue" />
              {allVisibleChosen ? 'Untick' : 'Tick'} all {visible.length} shown
            </label>
            <ul className="grid">
              {visible.map((s) => (
                <li
                  key={s.id}
                  className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-rule px-4 py-3 last:border-b-0 lg:grid-cols-[auto_6.5rem_minmax(0,1fr)_minmax(0,13rem)_9rem_minmax(0,13rem)] ${
                    selected.has(s.id) ? 'bg-blue-tint' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    aria-label={`Select ${s.full_name}`}
                    className="h-5 w-5 accent-blue lg:row-span-1"
                  />
                  <span className="font-mono text-sm text-ink-2">{s.student_id}</span>
                  <Link to={`/admin/students/${encodeURIComponent(s.student_id)}`} className="col-start-2 font-semibold text-ink hover:text-blue hover:underline lg:col-start-auto">
                    {s.full_name}
                  </Link>
                  <span className="col-start-2 truncate text-sm text-ink-2 lg:col-start-auto">{trackName(s.track_id) || 'No cohort set'}</span>
                  <span className="col-start-2 text-sm text-ink-2 lg:col-start-auto">{gradeYear(s, shortAcademicYear)}</span>
                  <span className="col-start-2 lg:col-start-auto">
                    <StudentChips student={s} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Changing several students at once
// ---------------------------------------------------------------------------

type GroupField = 'cohort' | 'grade' | 'advisor' | 'status';

function GroupActions({ chosen, onClear }: { chosen: StudentRecord[]; onClear: () => void }) {
  const { content } = useAdmin();
  const teachers = useTeachers();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const current = useCurrentYear();
  const [field, setField] = useState<GroupField>('grade');
  const [cohort, setCohort] = useState('');
  const [grade, setGrade] = useState('');
  const [year, setYear] = useState(current);
  const [advisor, setAdvisor] = useState('');
  const [status, setStatus] = useState<StudentRecord['enrolment_status']>('active');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const n = chosen.length;
  const who = `${n} ${n === 1 ? 'student' : 'students'}`;

  async function apply() {
    let patch: StudentPatch;
    if (field === 'cohort') patch = { track_id: cohort || null };
    else if (field === 'grade') patch = { current_grade: grade ? (Number(grade) as 10 | 11 | 12) : null, academic_year: year || null };
    else if (field === 'advisor') patch = { advisor_id: advisor || null };
    else patch = { enrolment_status: status };
    setBusy(true);
    setMsg(null);
    try {
      await updateStudents(
        chosen.map((s) => s.id),
        patch,
      );
      await refreshRecords(qc);
      setMsg({ ok: true, text: `Saved for ${who}.` });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function sheet(kind: SheetKind) {
    setMsg(null);
    try {
      const records = await qc.fetchQuery({ queryKey: ['records-all'], queryFn: fetchAllRecords });
      const { csv, rows } = groupSheetCsv(kind, chosen, records, content, teachers.data ?? [], year);
      if (rows === 0) return setMsg({ ok: false, text: `None of them has subjects for ${year}, and their cohort plan couldn’t fill the sheet (check their cohort and grade).` });
      downloadText(`${kind}-${year}-${n}-students.csv`, csv);
      setMsg({ ok: true, text: `Downloaded a ${kind} sheet with ${rows} rows. Fill it in, then upload it on the Subjects & grades page.` });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    }
  }

  return (
    <section aria-label="Change the ticked students" className="grid gap-4 rounded-2xl border-2 border-blue bg-sheet p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">
          {who} ticked{n <= 4 ? `: ${chosen.map((s) => s.full_name).join(', ')}` : ''}
        </p>
        <button type="button" onClick={onClear} className={btn.quiet}>
          <X size={16} aria-hidden /> Untick all
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-semibold">
          Change their
          <select id="group-field" value={field} onChange={(e) => setField(e.target.value as GroupField)} className={input}>
            <option value="grade">Grade and academic year</option>
            <option value="cohort">Cohort</option>
            <option value="advisor">Academic advisor</option>
            <option value="status">Enrolment</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {field === 'cohort' && (
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
              Cohort
              <select id="group-cohort" value={cohort} onChange={(e) => setCohort(e.target.value)} className={input}>
                <option value="">Not set</option>
                {content.tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {field === 'grade' && (
            <>
              <label className="grid gap-1 text-sm font-semibold">
                Grade
                <select id="group-grade" value={grade} onChange={(e) => setGrade(e.target.value)} className={input}>
                  <option value="">Not set</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </label>
              <YearSelect id="group-year" label="Academic year" value={year} onChange={setYear} current={current} />
            </>
          )}
          {field === 'advisor' && (
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
              Academic advisor
              <select id="group-advisor" value={advisor} onChange={(e) => setAdvisor(e.target.value)} className={input}>
                <option value="">None</option>
                {(teachers.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                    {t.active ? '' : ' (hidden from students)'}
                  </option>
                ))}
              </select>
            </label>
          )}
          {field === 'status' && (
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
              Enrolment
              <select id="group-status" value={status} onChange={(e) => setStatus(e.target.value as StudentRecord['enrolment_status'])} className={input}>
                <option value="active">Studying now</option>
                <option value="graduated">Graduated</option>
                <option value="withdrawn">Left the programme</option>
              </select>
            </label>
          )}
        </div>
        <button type="button" onClick={apply} disabled={busy} className={btn.primary}>
          {busy ? 'Saving…' : `Apply to ${who}`}
        </button>
      </div>
      {field === 'status' && (
        <p className="text-sm text-ink-3">To move students up a grade, repeat a grade or graduate them, use Promotion: it also adds next year’s subjects and can be undone.</p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-4">
        <span className="text-sm font-semibold text-ink-2">For {year}:</span>
        {downloadsOff ? (
          <span className="text-sm text-ink-3">Sheet downloads work on the live website, not in this preview.</span>
        ) : (
          <>
            <button type="button" onClick={() => void sheet('subjects')} className={btn.secondary}>
              <Download size={16} aria-hidden /> Their subjects sheet
            </button>
            <button type="button" onClick={() => void sheet('grades')} className={btn.secondary}>
              <Download size={16} aria-hidden /> Their grades sheet
            </button>
          </>
        )}
        <button type="button" onClick={() => navigate('/admin/records?tab=group', { state: { studentList: chosen.map((s) => s.student_id) } })} className={btn.secondary}>
          <ListPlus size={16} aria-hidden /> Add subjects to them
        </button>
        <button type="button" onClick={() => navigate('/admin/promotion', { state: { studentIds: chosen.map((s) => s.id) } })} className={btn.secondary}>
          <TrendingUp size={16} aria-hidden /> Promote them <ArrowRight size={14} aria-hidden />
        </button>
      </div>
      {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
    </section>
  );
}

export function YearSelect({ id, label, value, onChange, current, allowEmpty = false }: { id: string; label: string; value: string; onChange: (v: string) => void; current: string; allowEmpty?: boolean }) {
  const options = yearOptions(current, 4, 2);
  if (value && !options.includes(value)) options.unshift(value);
  return (
    <Field id={id} label={label}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={input}>
        {allowEmpty && <option value="">Not set</option>}
        {options.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Adding students from a spreadsheet
// ---------------------------------------------------------------------------

function AddStudents({ onClose }: { onClose?: () => void }) {
  const { content } = useAdmin();
  const qc = useQueryClient();
  const year = useCurrentYear();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState('');
  const parsed = useMemo(() => parseStudentList(text, content.tracks, year), [text, content.tracks, year]);
  const showGrade = parsed.rows.some((r) => r.current_grade || r.academic_year);

  async function readFile(file: File | undefined) {
    if (!file) return;
    setText(await file.text());
    setResults(null);
  }

  async function run() {
    setBusy(true);
    setError('');
    setResults(null);
    const rows = parsed.rows;
    const out: ImportResult[] = [];
    setProgress({ done: 0, total: rows.length });
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        out.push(...(await importStudents(rows.slice(i, i + BATCH))));
        setProgress({ done: Math.min(i + BATCH, rows.length), total: rows.length });
      }
      setText('');
    } catch (e) {
      setError(`${out.length ? `Stopped after ${out.length} students. ` : ''}${errorText(e)}`);
    } finally {
      setResults(out);
      setBusy(false);
      await qc.invalidateQueries({ queryKey: ['students'] });
    }
  }

  const count = (s: ImportResult['status']) => results?.filter((r) => r.status === s).length ?? 0;
  const failed = results?.filter((r) => r.status === 'error') ?? [];

  return (
    <section aria-labelledby="add-students-title" className="grid grid-cols-1 gap-4 rounded-2xl border border-rule bg-sheet p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="add-students-title" className="flex items-center gap-2 t-h3">
          <UserPlus size={20} aria-hidden className="text-blue" /> Add students
        </h2>
        {onClose && (
          <button type="button" onClick={onClose} className={btn.quiet}>
            <X size={16} aria-hidden /> Close
          </button>
        )}
      </div>
      <p className="measure text-ink-2">
        Each student signs in with their Student ID (the account is <span className="font-mono">ID@imas.edu.my</span>). Their first password is their ID number,
        and the portal makes them create their own before they can use it.
      </p>
      <ol className="grid list-decimal gap-1 pl-5 text-ink-2">
        <li>
          In Excel or Google Sheets, make columns headed <strong className="text-ink">Student ID</strong>, <strong className="text-ink">Full name</strong> and{' '}
          <strong className="text-ink">ID number</strong> (IC or passport number). <strong className="text-ink">Track</strong>,{' '}
          <strong className="text-ink">Grade</strong> and <strong className="text-ink">Academic year</strong> columns are optional; without a year, {year} is used.
        </li>
        <li>Select the rows, including the heading row, copy them and paste them in the box. Or choose a CSV file.</li>
        <li>Check the preview, then create the accounts. Students who already have an account are left as they are.</li>
      </ol>
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-blue">See an example</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-sheet-2 p-3 font-mono text-[0.8rem] leading-relaxed" tabIndex={0}>
          {EXAMPLE.replace(/\t/g, '   │ ')}
        </pre>
        <p className="mt-2 text-ink-3">The track can be its name or its code. Codes: {content.tracks.map((t) => t.id).join(', ')}.</p>
      </details>

      <label htmlFor="students-paste" className="font-semibold">
        Paste the rows here
      </label>
      <textarea
        id="students-paste"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResults(null);
        }}
        rows={6}
        spellCheck={false}
        placeholder={'Student ID\tFull name\tID number\tTrack\tGrade\tAcademic year'}
        className="rounded-lg border border-rule-strong bg-sheet px-3 py-2 font-mono text-sm"
      />
      <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-rule-strong px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue focus-within:outline focus-within:outline-2 focus-within:outline-blue">
        <FileUp size={16} aria-hidden /> Choose a CSV file
        <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="sr-only" onChange={(e) => void readFile(e.target.files?.[0])} />
      </label>

      {text.trim() && (
        <div className="grid grid-cols-1 gap-3">
          <Problems problems={parsed.problems} />
          {parsed.rows.length > 0 && (
            <>
              <p className="font-semibold">
                {parsed.rows.length} {parsed.rows.length === 1 ? 'student' : 'students'} ready to add
              </p>
              <div className="max-h-72 overflow-auto rounded-lg border border-rule" tabIndex={0} role="region" aria-label="Students to add">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-sheet-2">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Student ID</th>
                      <th className="px-3 py-2 font-semibold">Full name</th>
                      <th className="px-3 py-2 font-semibold">Signs in as</th>
                      <th className="px-3 py-2 font-semibold">First password</th>
                      <th className="px-3 py-2 font-semibold">Track</th>
                      {showGrade && <th className="px-3 py-2 font-semibold">Grade · Year</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.map((r) => (
                      <tr key={r.student_id} className="border-t border-rule">
                        <td className="px-3 py-1.5 font-mono">{r.student_id}</td>
                        <td className="px-3 py-1.5">{r.full_name}</td>
                        <td className="px-3 py-1.5 font-mono text-ink-2">{loginEmail(r.student_id)}</td>
                        <td className="px-3 py-1.5 font-mono text-ink-2">{'•'.repeat(Math.max(0, r.password.length - 3)) + r.password.slice(-3)}</td>
                        <td className="px-3 py-1.5 text-ink-2">{content.tracks.find((t) => t.id === r.track_id)?.name ?? '—'}</td>
                        {showGrade && (
                          <td className="px-3 py-1.5 text-ink-2">
                            {[r.current_grade ? `Grade ${r.current_grade}` : '', r.academic_year ?? ''].filter(Boolean).join(' · ') || '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={run} disabled={busy} className={`${btn.primary} w-fit`}>
                {busy ? `Creating accounts… ${progress.done} of ${progress.total}` : `Create ${parsed.rows.length} ${parsed.rows.length === 1 ? 'account' : 'accounts'}`}
              </button>
            </>
          )}
        </div>
      )}

      {busy && (
        <progress value={progress.done} max={progress.total || 1} className="h-2 w-full accent-blue" aria-label="Accounts created so far">
          {progress.done} of {progress.total}
        </progress>
      )}

      {results && (
        <div role="status" className="grid gap-2 rounded-xl bg-sheet-2 px-4 py-3">
          <p className="font-semibold">
            {count('created')} created · {count('exists')} already had an account{failed.length ? ` · ${failed.length} not added` : ''}
          </p>
          {failed.length > 0 && (
            <ul className="grid list-disc gap-0.5 pl-5 text-sm text-ink-2">
              {failed.map((r) => (
                <li key={r.student_id}>
                  <span className="font-mono">{r.student_id}</span>: {r.message}
                </li>
              ))}
            </ul>
          )}
          {count('created') > 0 && <p className="text-sm text-ink-2">Tell students to sign in at the Student Portal with their Student ID and ID number.</p>}
        </div>
      )}
      {error && <p className="text-maroon">{error}</p>}
      {isPreviewBuild && <p className="text-sm text-ink-3">Preview: accounts you add here work on the preview’s Student Portal until you reload.</p>}
      {!supabaseConfigured && !isPreviewBuild && <p className="text-sm text-ink-3">Demo mode: accounts are kept only until you reload.</p>}
    </section>
  );
}

/** The things a pasted sheet couldn't use, explained. */
export function Problems({ problems, title }: { problems: string[]; title?: string }) {
  if (problems.length === 0) return null;
  return (
    <div className="rounded-xl border-l-4 border-maroon bg-maroon-tint px-4 py-3">
      <p className="font-semibold">{title ?? `Please check ${problems.length === 1 ? 'this' : `these ${problems.length} things`}`}</p>
      <ul className="mt-1 grid list-disc gap-0.5 pl-5 text-sm text-ink-2">
        {problems.slice(0, 12).map((p) => (
          <li key={p}>{p}</li>
        ))}
        {problems.length > 12 && <li>…and {problems.length - 12} more.</li>}
      </ul>
    </div>
  );
}
