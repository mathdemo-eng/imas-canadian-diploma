import { useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ClipboardCheck, Download, FileSpreadsheet, FileUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TERM_LABEL, courseTitle } from '../content/labels';
import { planYearRows } from '../lib/progress';
import { addMissingStudentCourses, saveSheetRows } from '../lib/records';
import { STATUS_LABEL, downloadText, exportRecordsCsv, groupSheetCsv, parseRecordsSheet, templateCsv, type SheetKind } from '../lib/sheets';
import type { StudentRecord } from '../lib/students';
import { formatMark } from '../portal/ui';
import { useAdmin } from './AdminLayout';
import { Field, Message, Panel, btn, downloadsOff, errorText, input, refreshRecords, useAllRecords, useCurrentYear, useStudents, useTeachers } from './kit';
import { Problems, YearSelect } from './StudentsPage';

type Tab = SheetKind | 'plan';

const TABS: { id: Tab; label: string; icon: typeof FileSpreadsheet }[] = [
  { id: 'subjects', label: 'Subjects sheet', icon: FileSpreadsheet },
  { id: 'grades', label: 'Grades sheet', icon: ClipboardCheck },
  { id: 'plan', label: 'Plan a year', icon: CalendarPlus },
];

export function RecordsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'subjects') as Tab;

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="grid gap-2">
        <h1 className="t-h1">Subjects &amp; grades</h1>
        <p className="measure text-ink-2">
          Update the subjects students have covered and their marks from a spreadsheet: for one student, a class or the whole school. Each student sees only their
          own records in the Student Portal. Uploading the same sheet again updates the records; it never makes duplicates.
        </p>
      </div>

      <div role="tablist" aria-label="Subjects and grades" className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab}
            onClick={() => setParams({ tab: t.id })}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold ${t.id === tab ? 'bg-blue text-on-blue' : 'text-ink-2 hover:bg-sheet hover:text-blue'}`}
          >
            <t.icon size={17} aria-hidden /> {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="grid grid-cols-1 gap-6">
        {tab === 'plan' ? <PlanYearForGroup /> : <SheetImport key={tab} kind={tab} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Getting a sheet, and uploading it again
// ---------------------------------------------------------------------------

function SheetImport({ kind }: { kind: SheetKind }) {
  const { content } = useAdmin();
  const students = useStudents();
  const teachers = useTeachers();
  const records = useAllRecords();
  const qc = useQueryClient();
  const year = useCurrentYear();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const parsed = useMemo(
    () => parseRecordsSheet(kind, text, { students: students.data ?? [], content, teachers: teachers.data ?? [], settings: content.settings, defaultYear: year }),
    [kind, text, students.data, teachers.data, content, year],
  );
  const existing = records.data?.courses ?? [];
  const exists = (r: (typeof parsed.rows)[number]) =>
    existing.some((c) => c.student_id === r.student.id && c.course_id === r.course.id && c.academic_year === r.academic_year);
  const newCount = parsed.rows.filter((r) => !exists(r)).length;
  const ready = students.data && teachers.data && records.data;

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      setMsg({ ok: false, text: 'That is an Excel file. In Excel choose File → Save As → CSV, or copy the rows and paste them in the box.' });
      return;
    }
    setText(await file.text());
    setMsg(null);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const { added, updated } = await saveSheetRows(kind, parsed.rows, existing);
      await refreshRecords(qc);
      const people = new Set(parsed.rows.map((r) => r.student.id)).size;
      setText('');
      setMsg({ ok: true, text: `Saved for ${people} ${people === 1 ? 'student' : 'students'}: ${added} new ${added === 1 ? 'record' : 'records'}, ${updated} updated.` });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel
        id={`${kind}-get`}
        title="1. Get a sheet"
        intro={
          kind === 'subjects'
            ? 'One row per student, course and academic year. Status is Completed, In progress, Upcoming or Withdrawn (empty means Completed).'
            : `One row per student, course and academic year. Enter the final mark, or the continuous assessment and final exam marks and the final mark is worked out (${content.settings.ca_weight}% + ${content.settings.exam_weight}%). Rows left without marks are skipped.`
        }
      >
        {downloadsOff ? (
          <p className="text-sm text-ink-3">Downloads work on the live website, not in this preview. The columns are: {kind === 'subjects' ? 'Student ID, Full name, Academic year, Grade, Semester, Course, Status, Teacher' : 'Student ID, Full name, Academic year, Grade, Semester, Course, Final mark, Continuous assessment, Final exam'}.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn.secondary} onClick={() => downloadText(`${kind}-template.csv`, templateCsv(kind, content, year))}>
                <Download size={16} aria-hidden /> Blank template
              </button>
              <button
                type="button"
                className={btn.secondary}
                disabled={!ready}
                onClick={() => downloadText(`${kind}-all-records.csv`, exportRecordsCsv(kind, students.data!, records.data!, content, teachers.data!))}
              >
                <Download size={16} aria-hidden /> Everything recorded so far
              </button>
            </div>
            {ready && <GroupSheet kind={kind} students={students.data!} />}
          </>
        )}
      </Panel>

      <Panel id={`${kind}-upload`} title="2. Upload it" intro="Copy the rows from Excel or Google Sheets (including the heading row) and paste them here, or choose the CSV file.">
        <label htmlFor={`${kind}-paste`} className="font-semibold">
          Paste the rows here
        </label>
        <textarea
          id={`${kind}-paste`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setMsg(null);
          }}
          rows={7}
          spellCheck={false}
          className="rounded-lg border border-rule-strong bg-sheet px-3 py-2 font-mono text-sm"
        />
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-rule-strong px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue focus-within:outline focus-within:outline-2 focus-within:outline-blue">
          <FileUp size={16} aria-hidden /> Choose a CSV file
          <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain,.xlsx,.xls" className="sr-only" onChange={(e) => void readFile(e.target.files?.[0])} />
        </label>

        {text.trim() && !ready && <p className="text-ink-3">Loading students and records…</p>}
        {text.trim() && ready && (
          <div className="grid grid-cols-1 gap-3">
            <Problems problems={parsed.problems} />
            {parsed.blank > 0 && (
              <p className="text-sm text-ink-3">
                {parsed.blank} {parsed.blank === 1 ? 'row has' : 'rows have'} no marks yet and will be skipped.
              </p>
            )}
            {parsed.rows.length > 0 && (
              <>
                <p className="font-semibold">
                  {parsed.rows.length} {parsed.rows.length === 1 ? 'row' : 'rows'} ready · {newCount} new · {parsed.rows.length - newCount} {parsed.rows.length - newCount === 1 ? 'update' : 'updates'}
                </p>
                <div className="max-h-80 overflow-auto rounded-lg border border-rule" tabIndex={0} role="region" aria-label="Rows to save">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-sheet-2">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Student</th>
                        <th className="px-3 py-2 font-semibold">Course</th>
                        <th className="px-3 py-2 font-semibold">Year · Grade</th>
                        <th className="px-3 py-2 font-semibold">Semester</th>
                        <th className="px-3 py-2 font-semibold">{kind === 'subjects' ? 'Status' : 'Final mark'}</th>
                        <th className="px-3 py-2 font-semibold">
                          <span className="sr-only">New or update</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 300).map((r) => (
                        <tr key={`${r.student.id}-${r.course.id}-${r.academic_year}`} className="border-t border-rule">
                          <td className="px-3 py-1.5">
                            <span className="font-mono text-ink-2">{r.student.student_id}</span> {r.student.full_name}
                          </td>
                          <td className="px-3 py-1.5">{courseTitle(r.course.name, r.course.code)}</td>
                          <td className="px-3 py-1.5 text-ink-2">
                            {r.academic_year} · {r.grade_level}
                          </td>
                          <td className="px-3 py-1.5 text-ink-2">{TERM_LABEL[r.term]}</td>
                          <td className="px-3 py-1.5">{kind === 'subjects' ? STATUS_LABEL[r.status] : formatMark(r.mark!.mark)}</td>
                          <td className="px-3 py-1.5 text-ink-3">{exists(r) ? 'update' : 'new'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsed.rows.length > 300 && <p className="text-sm text-ink-3">Showing the first 300 rows. All {parsed.rows.length} will be saved.</p>}
                <button type="button" onClick={save} disabled={busy} className={`${btn.primary} w-fit`}>
                  {busy ? 'Saving…' : `Save ${parsed.rows.length} ${parsed.rows.length === 1 ? 'row' : 'rows'}`}
                </button>
              </>
            )}
          </div>
        )}
        {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
        {kind === 'grades' && content.settings.feedback_required && (
          <p className="text-sm text-ink-3">Students see each mark after they send their feedback on that course (Site settings → Student records).</p>
        )}
      </Panel>
    </>
  );
}

/** Students chosen by cohort and grade, or one student by ID. */
function useGroup(students: StudentRecord[]) {
  const [cohort, setCohort] = useState('');
  const [grade, setGrade] = useState('');
  const [one, setOne] = useState('');
  const single = one.trim() ? students.find((s) => s.student_id.toLowerCase() === one.trim().toLowerCase()) : undefined;
  const group = one.trim()
    ? single
      ? [single]
      : []
    : students.filter((s) => s.enrolment_status === 'active' && (!cohort || s.track_id === cohort) && (!grade || String(s.current_grade) === grade));
  return { cohort, setCohort, grade, setGrade, one, setOne, group, unknown: Boolean(one.trim()) && !single };
}

function GroupFilters({ id, g }: { id: string; g: ReturnType<typeof useGroup> }) {
  const { content } = useAdmin();
  return (
    <>
      <Field id={`${id}-cohort`} label="Cohort">
        <select id={`${id}-cohort`} value={g.cohort} onChange={(e) => g.setCohort(e.target.value)} className={input} disabled={Boolean(g.one.trim())}>
          <option value="">All cohorts</option>
          {content.tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`${id}-grade`} label="Grade">
        <select id={`${id}-grade`} value={g.grade} onChange={(e) => g.setGrade(e.target.value)} className={input} disabled={Boolean(g.one.trim())}>
          <option value="">All grades</option>
          <option value="10">Grade 10</option>
          <option value="11">Grade 11</option>
          <option value="12">Grade 12</option>
        </select>
      </Field>
      <Field id={`${id}-one`} label="Or one student" help="Their Student ID">
        <input id={`${id}-one`} value={g.one} onChange={(e) => g.setOne(e.target.value)} placeholder="e.g. 260001" className={`${input} font-mono`} />
      </Field>
    </>
  );
}

function GroupSheet({ kind, students }: { kind: SheetKind; students: StudentRecord[] }) {
  const { content } = useAdmin();
  const teachers = useTeachers();
  const records = useAllRecords();
  const current = useCurrentYear();
  const [year, setYear] = useState(current);
  const g = useGroup(students);
  const [note, setNote] = useState('');

  function download() {
    const { csv, rows } = groupSheetCsv(kind, g.group, records.data!, content, teachers.data ?? [], year);
    if (rows === 0) return setNote(`Nothing to fill in: no subjects are recorded for ${year}, and the cohort plan couldn’t be used (check the students’ cohort and grade).`);
    const label = g.group.length === 1 ? g.group[0].student_id : [g.grade && `grade-${g.grade}`, g.cohort].filter(Boolean).join('-') || 'all';
    downloadText(`${kind}-${year}-${label}.csv`, csv);
    setNote(`Downloaded ${rows} rows for ${g.group.length} ${g.group.length === 1 ? 'student' : 'students'}.`);
  }

  return (
    <div className="grid gap-3 rounded-xl bg-sheet-2 p-4">
      <p className="font-semibold">A sheet ready to fill in</p>
      <p className="text-sm text-ink-2">
        Lists the chosen students’ subjects for one year: what is recorded already, or their cohort plan if nothing is recorded yet. You only fill in the{' '}
        {kind === 'subjects' ? 'status' : 'marks'}.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <YearSelect id={`${kind}-sheet-year`} label="Academic year" value={year} onChange={setYear} current={current} />
        <GroupFilters id={`${kind}-sheet`} g={g} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btn.primary} disabled={g.group.length === 0 || !records.data} onClick={download}>
          <Download size={16} aria-hidden /> Download for {g.group.length} {g.group.length === 1 ? 'student' : 'students'}
        </button>
        {g.unknown && <span className="text-sm text-maroon">No student has that ID.</span>}
      </div>
      {note && <p role="status" className="text-sm text-ink-2">{note}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Planning a year for a group
// ---------------------------------------------------------------------------

function PlanYearForGroup() {
  const { content } = useAdmin();
  const students = useStudents();
  const qc = useQueryClient();
  const current = useCurrentYear();
  const [year, setYear] = useState(current);
  const [status, setStatus] = useState<'in_progress' | 'upcoming'>('in_progress');
  const g = useGroup(students.data ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const usable = g.group.filter((s) => s.track_id && s.current_grade && s.academic_year === year);
  const skipped = g.group.length - usable.length;
  const rows = usable.flatMap((s) => planYearRows(s, content, s.current_grade!, year, status));

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const added = await addMissingStudentCourses(rows);
      await refreshRecords(qc);
      setMsg({ ok: true, text: `Added ${added} subject records for ${usable.length} students${rows.length > added ? ` (${rows.length - added} were already there)` : ''}.` });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      id="plan"
      title="Start a year from the cohort plans"
      intro="At the start of the year, give each student every course of their cohort’s plan for their grade, so their portal shows what they are studying. Courses already recorded are left alone, so this is safe to run again."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <YearSelect id="plan-group-year" label="Academic year" value={year} onChange={setYear} current={current} />
        <GroupFilters id="plan-group" g={g} />
        <Field id="plan-group-status" label="Add them as">
          <select id="plan-group-status" value={status} onChange={(e) => setStatus(e.target.value as 'in_progress' | 'upcoming')} className={input}>
            <option value="in_progress">In progress</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </Field>
      </div>
      <p className="text-ink-2">
        {usable.length} {usable.length === 1 ? 'student' : 'students'} in {year} · {rows.length} course records to add
        {skipped > 0 && (
          <span className="text-ink-3">
            {' '}
            · {skipped} left out because their cohort or grade isn’t set, or they are not in {year}
          </span>
        )}
      </p>
      <button type="button" onClick={run} disabled={busy || rows.length === 0} className={`${btn.primary} w-fit`}>
        {busy ? 'Adding…' : `Add subjects for ${usable.length} ${usable.length === 1 ? 'student' : 'students'}`}
      </button>
      {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
      <p className="text-sm text-ink-3">At the end of the year, Promotion moves students on and can add the next grade’s courses at the same time.</p>
    </Panel>
  );
}
