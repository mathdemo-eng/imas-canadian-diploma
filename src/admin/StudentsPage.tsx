import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, FileUp, Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { loginEmail } from '../lib/auth';
import {
  importStudents,
  listStudents,
  parseStudentList,
  removeStudent,
  resetStudentPassword,
  updateStudent,
  type ImportResult,
  type StudentRecord,
} from '../lib/students';
import { isPreviewBuild, supabaseConfigured } from '../lib/supabase';
import { useAdmin } from './AdminLayout';

/** Accounts are created this many at a time, so a list of 300 shows steady progress. */
const BATCH = 25;

const EXAMPLE = `Student ID\tFull name\tID number\tTrack
260001\tAisha Rahman\t080512101234\tCAN · Grade 10 entry
260002\tDaniel Lim\tA12345678\tcad-sci-g11`;

type StatusFilter = 'all' | 'waiting' | 'set';

export function StudentsPage() {
  const { content } = useAdmin();
  const students = useQuery({ queryKey: ['students'], queryFn: listStudents });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const all = students.data ?? [];
  const waiting = all.filter((s) => s.must_change_password).length;
  const trackName = (id: string | null) => content.tracks.find((t) => t.id === id)?.name ?? '';

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((s) => status === 'all' || (status === 'waiting' ? s.must_change_password : !s.must_change_password))
      .filter((s) => !q || `${s.student_id} ${s.full_name}`.toLowerCase().includes(q));
  }, [all, query, status]);

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="grid gap-2">
        <h1 className="t-h1">Students</h1>
        <p className="measure text-ink-2">
          Sign-in accounts for the Student Portal. Each student signs in with their Student ID (the account is <span className="font-mono">ID@imas.edu.my</span>).
          Their first password is their ID number, and the portal makes them create their own before they can use it.
        </p>
        {isPreviewBuild && (
          <p className="text-sm text-ink-3">Preview: accounts you add here work on the preview’s Student Portal until you reload.</p>
        )}
      </div>

      <AddStudents />

      <section aria-labelledby="students-list-title" className="grid grid-cols-1 gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="students-list-title" className="t-h2">
            All students <span className="font-mono text-base font-normal text-ink-3 t-num">{all.length}</span>
          </h2>
          {all.length > 0 && (
            <p className="text-sm text-ink-2">
              {all.length - waiting} {all.length - waiting === 1 ? 'has' : 'have'} set their own password · {waiting} waiting for their first sign-in
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="grid flex-1 gap-1 text-sm font-semibold">
            Search
            <span className="relative">
              <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                id="search-students"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Student ID or name"
                className="min-h-11 w-full rounded-lg border border-rule-strong bg-sheet pl-9 pr-3 font-normal"
              />
            </span>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Show
            <select
              id="filter-students"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="min-h-11 rounded-lg border border-rule-strong bg-sheet px-3 font-normal"
            >
              <option value="all">Everyone</option>
              <option value="waiting">Waiting for first sign-in</option>
              <option value="set">Password set</option>
            </select>
          </label>
        </div>

        {students.isLoading && <p role="status" className="text-ink-3">Loading students…</p>}
        {students.isError && <p className="text-maroon">The student list couldn’t be loaded: {(students.error as Error).message}</p>}
        {students.data && visible.length === 0 && (
          <p className="rounded-xl border border-dashed border-rule-strong p-6 text-ink-3">
            {all.length === 0 ? 'No student accounts yet. Add them above.' : 'No students match your search.'}
          </p>
        )}
        {visible.length > 0 && (
          <ul className="grid gap-px overflow-hidden rounded-xl border border-rule bg-rule">
            {visible.map((s) => (
              <li key={s.id} className="bg-sheet">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === s.id ? null : s.id)}
                  aria-expanded={openId === s.id}
                  className="grid w-full gap-1 px-4 py-3 text-left hover:bg-sheet-2 sm:grid-cols-[7rem_1fr_minmax(0,18rem)_12.5rem] sm:items-center sm:gap-4"
                >
                  <span className="font-mono">{s.student_id}</span>
                  <span className="font-semibold">{s.full_name}</span>
                  <span className="truncate text-sm text-ink-2">{trackName(s.track_id) || 'No cohort set'}</span>
                  <StatusLabel student={s} />
                </button>
                {openId === s.id && <StudentEditor student={s} onClose={() => setOpenId(null)} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusLabel({ student }: { student: StudentRecord }) {
  return student.must_change_password ? (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink-3">
      <Clock size={15} aria-hidden /> Waiting for first sign-in
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm text-green-ink">
      <CheckCircle2 size={15} aria-hidden /> Password set
    </span>
  );
}

// ---------------------------------------------------------------------------
// Adding students from a spreadsheet
// ---------------------------------------------------------------------------

function AddStudents() {
  const { content } = useAdmin();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState('');
  const parsed = useMemo(() => parseStudentList(text, content.tracks), [text, content.tracks]);

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
      setError(`${out.length ? `Stopped after ${out.length} students. ` : ''}${e instanceof Error ? e.message : String(e)}`);
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
      <h2 id="add-students-title" className="flex items-center gap-2 t-h3">
        <UserPlus size={20} aria-hidden className="text-blue" /> Add students
      </h2>
      <ol className="grid list-decimal gap-1 pl-5 text-ink-2">
        <li>
          In Excel or Google Sheets, make columns headed <strong className="text-ink">Student ID</strong>, <strong className="text-ink">Full name</strong> and{' '}
          <strong className="text-ink">ID number</strong> (IC or passport number). A <strong className="text-ink">Track</strong> column is optional.
        </li>
        <li>Select the rows, including the heading row, copy them and paste them in the box. Or choose a CSV file.</li>
        <li>Check the preview, then create the accounts. Students who already have an account are left as they are.</li>
      </ol>
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-blue">See an example</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-sheet-2 p-3 font-mono text-[0.8rem] leading-relaxed" tabIndex={0}>
          {EXAMPLE.replace(/\t/g, '   │ ')}
        </pre>
        <p className="mt-2 text-ink-3">
          The track can be its name or its code. Codes: {content.tracks.map((t) => t.id).join(', ')}.
        </p>
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
        placeholder={'Student ID\tFull name\tID number\tTrack'}
        className="rounded-lg border border-rule-strong bg-sheet px-3 py-2 font-mono text-sm"
      />
      <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-rule-strong px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue focus-within:outline focus-within:outline-2 focus-within:outline-blue">
        <FileUp size={16} aria-hidden /> Choose a CSV file
        <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="sr-only" onChange={(e) => void readFile(e.target.files?.[0])} />
      </label>

      {text.trim() && (
        <div className="grid grid-cols-1 gap-3">
          {parsed.problems.length > 0 && (
            <div className="rounded-xl border-l-4 border-maroon bg-maroon-tint px-4 py-3">
              <p className="font-semibold">Please check {parsed.problems.length === 1 ? 'this' : `these ${parsed.problems.length} things`}</p>
              <ul className="mt-1 grid list-disc gap-0.5 pl-5 text-sm text-ink-2">
                {parsed.problems.slice(0, 12).map((p) => (
                  <li key={p}>{p}</li>
                ))}
                {parsed.problems.length > 12 && <li>…and {parsed.problems.length - 12} more.</li>}
              </ul>
            </div>
          )}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={run}
                disabled={busy}
                className="min-h-11 w-fit rounded-full bg-blue px-6 font-semibold text-on-blue hover:bg-blue-deep disabled:opacity-60"
              >
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
      {!supabaseConfigured && !isPreviewBuild && (
        <p className="text-sm text-ink-3">Demo mode: accounts are kept only until you reload.</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Editing one student
// ---------------------------------------------------------------------------

function StudentEditor({ student, onClose }: { student: StudentRecord; onClose: () => void }) {
  const { content } = useAdmin();
  const qc = useQueryClient();
  const [name, setName] = useState(student.full_name);
  const [track, setTrack] = useState(student.track_id ?? '');
  const [temp, setTemp] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const key = `student-${student.student_id}`;

  async function act(fn: () => Promise<unknown>, done: string, close = false) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ['students'] });
      if (close) return onClose();
      setMsg({ ok: true, text: done });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 border-t border-rule bg-sheet-2 px-4 py-5">
      <form
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return setMsg({ ok: false, text: 'The name can’t be empty.' });
          void act(() => updateStudent(student.id, { full_name: name.trim(), track_id: track || null }), 'Saved.');
        }}
      >
        <label className="grid gap-1 text-sm font-semibold">
          Full name
          <input id={`${key}-name`} value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 rounded-lg border border-rule-strong bg-sheet px-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Cohort
          <select id={`${key}-track`} value={track} onChange={(e) => setTrack(e.target.value)} className="min-h-11 rounded-lg border border-rule-strong bg-sheet px-3 font-normal">
            <option value="">Not set</option>
            {content.tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-blue px-5 font-semibold text-on-blue hover:bg-blue-deep disabled:opacity-60">
          Save
        </button>
      </form>

      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (temp.trim().length < 6) return setMsg({ ok: false, text: 'The temporary password must be at least 6 characters.' });
          void act(
            () => resetStudentPassword(student.student_id, temp.trim()),
            `Password reset. Give ${student.full_name.split(' ')[0]} the temporary password; they will create their own when they next sign in.`,
          ).then(() => setTemp(''));
        }}
      >
        <label htmlFor={`${key}-temp`} className="text-sm font-semibold">
          Forgotten password? Set a temporary one
        </label>
        <div className="flex flex-wrap gap-3">
          <input
            id={`${key}-temp`}
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            autoComplete="off"
            placeholder="e.g. their ID number"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-rule-strong bg-sheet px-3 font-mono"
          />
          <button type="submit" disabled={busy} className="min-h-11 rounded-full border border-rule-strong bg-sheet px-5 font-semibold hover:border-blue hover:text-blue disabled:opacity-60">
            Reset password
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        {confirming ? (
          <>
            <p className="text-sm">
              Remove <strong>{student.full_name}</strong> and their sign-in account? This can’t be undone.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act(() => removeStudent(student.student_id), '', true)}
              className="min-h-10 rounded-full bg-maroon px-4 text-sm font-semibold text-on-blue hover:opacity-90 disabled:opacity-60"
            >
              Yes, remove
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-10 rounded-full px-3 text-sm font-semibold text-ink-2 hover:text-blue">
              Keep
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setConfirming(true)} className="text-sm font-semibold text-maroon hover:underline">
              Remove student
            </button>
            <button type="button" onClick={onClose} className="ml-auto text-sm font-semibold text-ink-3 hover:text-blue">
              Close
            </button>
          </>
        )}
      </div>

      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-green-ink' : 'text-maroon'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
