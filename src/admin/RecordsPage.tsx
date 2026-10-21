import { useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ClipboardCheck, Download, FileSpreadsheet, FileUp, Search, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { TERM_LABEL, courseTitle } from '../content/labels';
import type { Term } from '../content/types';
import { groupSubjectRows, planYearRows, type GroupSubjectOptions } from '../lib/progress';
import { addMissingStudentCourses, saveSheetRows, type CourseStatus } from '../lib/records';
import { STATUS_LABEL, downloadText, exportRecordsCsv, groupSheetCsv, parseRecordsSheet, templateCsv, type SheetKind } from '../lib/sheets';
import type { StudentRecord } from '../lib/students';
import { formatMark } from '../portal/ui';
import { useAdmin } from './AdminLayout';
import { Field, Message, Panel, btn, downloadsOff, errorText, input, refreshRecords, useAllRecords, useCurrentYear, useStudents, useTeachers } from './kit';
import { Problems, YearSelect } from './StudentsPage';

type Tab = SheetKind | 'group' | 'plan';

const TABS: { id: Tab; label: string; icon: typeof FileSpreadsheet }[] = [
  { id: 'subjects', label: 'Subjects sheet', icon: FileSpreadsheet },
  { id: 'grades', label: 'Grades sheet', icon: ClipboardCheck },
  { id: 'group', label: 'Subjects for a group', icon: UsersRound },
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
        {tab === 'plan' ? <PlanYearForGroup /> : tab === 'group' ? <SubjectsForGroup /> : <SheetImport key={tab} kind={tab} />}
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

// ---------------------------------------------------------------------------
// The same subjects for a group of students
// ---------------------------------------------------------------------------

/** Student IDs pasted from a sheet column: one per line, or separated by commas, semicolons or spaces. */
function readIdList(text: string) {
  return [...new Set(text.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))];
}

function SubjectsForGroup() {
  const { content } = useAdmin();
  const students = useStudents();
  const teachers = useTeachers();
  const records = useAllRecords();
  const qc = useQueryClient();
  const current = useCurrentYear();
  const location = useLocation();
  const preset = (location.state as { studentList?: string[] } | null)?.studentList;

  const [who, setWho] = useState<'list' | 'cohort'>('list');
  const [idText, setIdText] = useState(preset?.join('\n') ?? '');
  const [cohort, setCohort] = useState('');
  const [grade, setGrade] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [find, setFind] = useState('');
  const [planTrack, setPlanTrack] = useState(content.tracks[0]?.id ?? '');
  const [planGrade, setPlanGrade] = useState('10');
  const [year, setYear] = useState(current);
  const [term, setTerm] = useState<'plan' | Term>('plan');
  const [courseGrade, setCourseGrade] = useState<'plan' | '10' | '11' | '12'>('plan');
  const [status, setStatus] = useState<CourseStatus>('in_progress');
  const [teacher, setTeacher] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const all = students.data ?? [];
  const byId = new Map(all.map((s) => [s.student_id.toLowerCase(), s]));
  const typed = readIdList(idText);
  const unknown = typed.filter((id) => !byId.has(id.toLowerCase()));
  const group: StudentRecord[] =
    who === 'list'
      ? typed.flatMap((id) => byId.get(id.toLowerCase()) ?? [])
      : all.filter((s) => s.enrolment_status === 'active' && (!cohort || s.track_id === cohort) && (!grade || String(s.current_grade) === grade));

  const courses = [...content.courses].sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
  const q = find.trim().toLowerCase();
  const shown = courses.filter((c) => !q || courseTitle(c.name, c.code).toLowerCase().includes(q));
  const toggle = (id: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const tickPlan = () =>
    setPicked((cur) => new Set([...cur, ...content.placements.filter((p) => p.track_id === planTrack && String(p.grade) === planGrade).map((p) => p.course_id)]));

  const options: GroupSubjectOptions = {
    year,
    term,
    grade: courseGrade === 'plan' ? 'plan' : (Number(courseGrade) as 10 | 11 | 12),
    status,
    teacherId: teacher || null,
  };
  const ids = courses.filter((c) => picked.has(c.id)).map((c) => c.id);
  const { rows, skipped } = groupSubjectRows(group, ids, content, options, records.data?.courses ?? []);
  const people = group.length - skipped.length;

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const added = await addMissingStudentCourses(rows);
      await refreshRecords(qc);
      const kept = rows.length - added;
      setMsg({
        ok: true,
        text: `Added ${added} ${added === 1 ? 'record' : 'records'} for ${people} ${people === 1 ? 'student' : 'students'}.${kept ? ` ${kept} were already there for ${year} and were left as they were.` : ''}`,
      });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="measure text-ink-2">
        Give the same subjects to a group of students in one go: <strong className="text-ink">every subject you tick goes to every student</strong> you choose. (In a
        sheet, each row is one student and one course, so this saves writing a row for each pair.)
      </p>

      <Panel id="group-who" title="1. Which students">
        <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
          <legend className="sr-only">Choose students by</legend>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="group-who" checked={who === 'list'} onChange={() => setWho('list')} className="h-4 w-4 accent-blue" />
            Paste their Student IDs
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="group-who" checked={who === 'cohort'} onChange={() => setWho('cohort')} className="h-4 w-4 accent-blue" />
            Choose by cohort and grade
          </label>
        </fieldset>
        {who === 'list' ? (
          <Field id="group-ids" label="Student IDs" help="Copy the Student ID column from your sheet and paste it here: one ID per line, or separated by commas or spaces.">
            <textarea id="group-ids" value={idText} onChange={(e) => setIdText(e.target.value)} rows={5} spellCheck={false} placeholder={'260001\n260002\n260003'} className={`${input} py-2 font-mono text-sm`} />
          </Field>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="group-cohort" label="Cohort">
              <select id="group-cohort" value={cohort} onChange={(e) => setCohort(e.target.value)} className={input}>
                <option value="">All cohorts</option>
                {content.tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="group-grade" label="Grade">
              <select id="group-grade" value={grade} onChange={(e) => setGrade(e.target.value)} className={input}>
                <option value="">All grades</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </Field>
          </div>
        )}
        <p className="text-ink-2" role="status">
          <strong className="text-ink">
            {group.length} {group.length === 1 ? 'student' : 'students'}
          </strong>
          {group.length > 0 && group.length <= 8 ? `: ${group.map((s) => s.full_name).join(', ')}` : ''}
        </p>
        {who === 'list' && unknown.length > 0 && (
          <Message tone="error">
            No student has {unknown.length === 1 ? 'this ID' : 'these IDs'}: {unknown.slice(0, 12).join(', ')}
            {unknown.length > 12 ? ` and ${unknown.length - 12} more` : ''}. Check them, or add the students first.
          </Message>
        )}
      </Panel>

      <Panel id="group-what" title="2. Which subjects" intro="Tick the subjects, or tick a whole year of a cohort’s plan and then untick any you don’t want.">
        <div className="grid gap-3 rounded-xl bg-sheet-2 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_auto] sm:items-end">
          <Field id="group-plan-track" label="Tick the subjects of a cohort plan">
            <select id="group-plan-track" value={planTrack} onChange={(e) => setPlanTrack(e.target.value)} className={input}>
              {content.tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="group-plan-grade" label="For grade">
            <select id="group-plan-grade" value={planGrade} onChange={(e) => setPlanGrade(e.target.value)} className={input}>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
          </Field>
          <button type="button" onClick={tickPlan} className={btn.secondary}>
            Tick these
          </button>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="grid min-w-0 flex-[1_1_16rem] gap-1 text-sm font-semibold">
            Find a course
            <span className="relative">
              <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input id="group-find" type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="e.g. Biology" className={`${input} pl-9`} />
            </span>
          </label>
          <p className="flex items-center gap-3 text-sm">
            <strong>
              {picked.size} {picked.size === 1 ? 'subject' : 'subjects'} ticked
            </strong>
            {picked.size > 0 && (
              <button type="button" onClick={() => setPicked(new Set())} className={btn.quiet}>
                Untick all
              </button>
            )}
          </p>
        </div>
        <fieldset className="max-h-96 overflow-y-auto rounded-xl border border-rule p-2" aria-label="Subjects">
          <div className="grid gap-x-4 sm:grid-cols-2">
            {shown.map((c) => (
              <label key={c.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 ${picked.has(c.id) ? 'bg-blue-tint' : 'hover:bg-sheet-2'}`}>
                <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} className="h-5 w-5 shrink-0 accent-blue" />
                <span className="min-w-0">{courseTitle(c.name, c.code)}</span>
              </label>
            ))}
            {shown.length === 0 && <p className="p-2 text-ink-3">No course matches “{find}”.</p>}
          </div>
        </fieldset>
      </Panel>

      <Panel id="group-how" title="3. Year and details">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <YearSelect id="group-year" label="Academic year" value={year} onChange={setYear} current={current} />
          <Field id="group-term" label="Semester">
            <select id="group-term" value={term} onChange={(e) => setTerm(e.target.value as 'plan' | Term)} className={input}>
              <option value="plan">As in their plan</option>
              <option value="FY">Semesters 1 &amp; 2</option>
              <option value="S1">Semester 1</option>
              <option value="S2">Semester 2</option>
            </select>
          </Field>
          <Field id="group-course-grade" label="Course grade">
            <select id="group-course-grade" value={courseGrade} onChange={(e) => setCourseGrade(e.target.value as 'plan' | '10' | '11' | '12')} className={input}>
              <option value="plan">As in their plan</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
          </Field>
          <Field id="group-status" label="Add them as">
            <select id="group-status" value={status} onChange={(e) => setStatus(e.target.value as CourseStatus)} className={input}>
              <option value="in_progress">In progress</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field id="group-teacher" label="Teacher (optional)">
            <select id="group-teacher" value={teacher} onChange={(e) => setTeacher(e.target.value)} className={input}>
              <option value="">Not set</option>
              {(teachers.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-sm text-ink-3">
          “As in their plan” uses the semester and grade each subject has in each student’s cohort plan; a subject outside their plan gets Semesters 1 &amp; 2 and the
          student’s own grade. Choose a teacher only if one teacher teaches all the ticked subjects to this group.
        </p>
        {skipped.length > 0 && (
          <Message tone="error">
            {skipped.length} {skipped.length === 1 ? 'student is' : 'students are'} left out because their grade isn’t set and a subject isn’t in their plan:{' '}
            {skipped
              .slice(0, 6)
              .map((s) => s.full_name)
              .join(', ')}
            {skipped.length > 6 ? '…' : ''}. Set their grade on the Students page, or choose a Course grade above.
          </Message>
        )}
        <div className="grid gap-3 rounded-xl border-2 border-blue p-4">
          <p className="text-ink">
            {ids.length && people ? (
              <>
                <strong>
                  {ids.length} {ids.length === 1 ? 'subject' : 'subjects'} × {people} {people === 1 ? 'student' : 'students'} = {rows.length} records
                </strong>{' '}
                for {year}. Subjects a student already has for that year are left as they are.
              </>
            ) : (
              'Choose the students and tick at least one subject.'
            )}
          </p>
          <button type="button" onClick={run} disabled={busy || rows.length === 0 || !records.data} className={`${btn.primary} w-fit`}>
            {busy ? 'Adding…' : `Add ${ids.length} ${ids.length === 1 ? 'subject' : 'subjects'} to ${people} ${people === 1 ? 'student' : 'students'}`}
          </button>
          {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
        </div>
      </Panel>
    </>
  );
}
