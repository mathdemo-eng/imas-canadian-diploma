import type { Track } from '../content/types';
import { normaliseAcademicYear } from './academic-year';
import { loginEmail } from './auth';
import { demo } from './demo-backend';
import { callStudentsFunction as callFunction } from './server-function';
import { getSupabase, supabaseConfigured } from './supabase';

export interface StudentRecord {
  /** The student's sign-in account id. */
  id: string;
  student_id: string;
  full_name: string;
  track_id: string | null;
  /** True until the student replaces their first password with their own. */
  must_change_password: boolean;
  created_at: string;
  current_grade: 10 | 11 | 12 | null;
  /** e.g. "2026-2027": the year the student is in their current grade. */
  academic_year: string | null;
  enrolment_status: 'active' | 'graduated' | 'withdrawn';
  graduated_year: string | null;
  /** The teacher assigned as their academic advisor (shown from Grade 12). */
  advisor_id: string | null;
  ielts_band: number | null;
  /** Portal access paused by staff. */
  blocked: boolean;
}

/** Fields staff can change on a student's record. */
export type StudentPatch = Partial<
  Pick<StudentRecord, 'full_name' | 'track_id' | 'current_grade' | 'academic_year' | 'enrolment_status' | 'graduated_year' | 'advisor_id' | 'ielts_band'>
>;

/** Older databases (before 0003_records.sql) don't have every column yet. */
function withDefaults(s: Partial<StudentRecord> & Pick<StudentRecord, 'id' | 'student_id' | 'full_name'>): StudentRecord {
  const merged: StudentRecord = {
    track_id: null,
    must_change_password: false,
    created_at: '',
    current_grade: null,
    academic_year: null,
    enrolment_status: 'active',
    graduated_year: null,
    advisor_id: null,
    ielts_band: null,
    blocked: false,
    ...s,
  };
  return { ...merged, ielts_band: merged.ielts_band === null ? null : Number(merged.ielts_band) };
}

export interface ImportRow {
  student_id: string;
  full_name: string;
  /** The first password, such as the student's ID number. */
  password: string;
  track_id: string | null;
  current_grade?: 10 | 11 | 12 | null;
  academic_year?: string | null;
}

export interface ImportResult {
  student_id: string;
  status: 'created' | 'exists' | 'error';
  message?: string;
}

export async function fetchMyStudent(userId: string): Promise<StudentRecord | null> {
  if (!supabaseConfigured) {
    const s = demo.students.find((x) => x.id === userId);
    return s ? structuredClone(s) : null;
  }
  const sb = await getSupabase();
  const { data, error } = await sb.from('students').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? withDefaults(data as StudentRecord) : null;
}

export async function listStudents(): Promise<StudentRecord[]> {
  if (!supabaseConfigured) return structuredClone(demo.students).sort((a, b) => a.student_id.localeCompare(b.student_id));
  const sb = await getSupabase();
  const out: StudentRecord[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('students').select('*').order('student_id').range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data as StudentRecord[]).map(withDefaults));
    if (data.length < 1000) return out;
  }
}

export async function updateStudent(id: string, patch: StudentPatch) {
  return updateStudents([id], patch);
}

/** Changes the same fields for several students at once. */
export async function updateStudents(ids: string[], patch: StudentPatch) {
  if (ids.length === 0) return;
  if (!supabaseConfigured) {
    for (const s of demo.students) if (ids.includes(s.id)) Object.assign(s, patch);
    return;
  }
  const sb = await getSupabase();
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await sb.from('students').update(patch).in('id', ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
  }
}

/** Creates sign-in accounts for a list of students. Students who already have an account are left unchanged. */
export async function importStudents(rows: ImportRow[]): Promise<ImportResult[]> {
  if (!supabaseConfigured) {
    return rows.map((r) => {
      const email = loginEmail(r.student_id);
      if (demo.accounts.has(email)) return { student_id: r.student_id, status: 'exists' as const };
      const id = `demo-${r.student_id}`;
      demo.accounts.set(email, { id, email, password: r.password });
      demo.students.push(
        withDefaults({
          id,
          student_id: r.student_id,
          full_name: r.full_name,
          track_id: r.track_id,
          current_grade: r.current_grade ?? null,
          academic_year: r.academic_year ?? null,
          must_change_password: true,
          created_at: new Date().toISOString(),
        }),
      );
      return { student_id: r.student_id, status: 'created' as const };
    });
  }
  const res = await callFunction<{ results: ImportResult[] }>({ action: 'import', rows });
  return res.results;
}

/** Gives a student a new temporary password. They must create their own again at their next sign-in. */
export async function resetStudentPassword(studentId: string, password: string) {
  if (!supabaseConfigured) {
    const account = demo.accounts.get(loginEmail(studentId));
    const record = demo.students.find((s) => s.student_id === studentId);
    if (!account || !record) throw new Error('Student not found.');
    account.password = password;
    record.must_change_password = true;
    return;
  }
  await callFunction({ action: 'reset', student_id: studentId, password });
}

/** Pauses a student's portal access: they can't sign in, and their records are hidden. The reason is for staff only. */
export async function blockStudent(studentId: string, reason: string) {
  if (!supabaseConfigured) {
    const s = demo.students.find((x) => x.student_id === studentId);
    if (!s) throw new Error('Student not found.');
    s.blocked = true;
    demo.records.notes = [...demo.records.notes.filter((n) => n.student_id !== s.id), { student_id: s.id, blocked_reason: reason, notes: demo.records.notes.find((n) => n.student_id === s.id)?.notes ?? '' }];
    if (demo.signedIn?.id === s.id) {
      demo.signedIn = null;
      demo.notify();
    }
    return;
  }
  await callFunction({ action: 'block', student_id: studentId, reason });
}

export async function unblockStudent(studentId: string) {
  if (!supabaseConfigured) {
    const s = demo.students.find((x) => x.student_id === studentId);
    if (!s) throw new Error('Student not found.');
    s.blocked = false;
    const n = demo.records.notes.find((x) => x.student_id === s.id);
    if (n) n.blocked_reason = '';
    return;
  }
  await callFunction({ action: 'unblock', student_id: studentId });
}

/** Deletes a student's account and record. */
export async function removeStudent(studentId: string) {
  if (!supabaseConfigured) {
    demo.accounts.delete(loginEmail(studentId));
    const gone = demo.students.find((s) => s.student_id === studentId)?.id;
    demo.students = demo.students.filter((s) => s.student_id !== studentId);
    demo.records.courses = demo.records.courses.filter((c) => c.student_id !== gone);
    return;
  }
  await callFunction({ action: 'delete', student_id: studentId });
}

// ---------------------------------------------------------------------------
// Reading a pasted spreadsheet or CSV file
// ---------------------------------------------------------------------------

const HEADERS: Record<keyof ImportRow, string[]> = {
  student_id: ['student_id', 'student id', 'studentid', 'id'],
  full_name: ['full_name', 'full name', 'name', 'student name'],
  password: ['id_number', 'id number', 'ic', 'ic number', 'passport', 'password', 'first password', 'initial password'],
  track_id: ['track', 'track_id', 'cohort', 'stream'],
  current_grade: ['grade', 'current grade', 'grade level', 'class'],
  academic_year: ['academic year', 'academic_year', 'year', 'school year', 'session'],
};

export function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const TRACK_WORDS: Record<string, string> = { dual: 'cad', science: 'sci', commerce: 'com' };
const IGNORED_WORDS = new Set(['entry', 'program', 'programme', 'stream', 'track', 'cohort']);

/**
 * The words of a track name, in any order: "Grade 10 CAN", "CAN · Grade 10 entry", "can g10" and
 * "CAN 10" all become "can g10"; "Dual Science Gr 11" and "cad-sci-g11" both become "cad g11 sci".
 */
function trackKey(s: string) {
  const words = s
    .toLowerCase()
    .replace(/\b(grade|gr|year)\s*\.?\s*(\d+)/g, 'g$2')
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !IGNORED_WORDS.has(w))
    .map((w) => TRACK_WORDS[w] ?? (/^\d+$/.test(w) ? `g${w}` : w));
  return [...new Set(words)].sort().join(' ');
}

/**
 * Reads rows pasted from Excel or Google Sheets (tab-separated) or a CSV file.
 * The first row must be headings: Student ID, Full name, ID number, and optionally Track.
 */
export function parseStudentList(text: string, tracks: Track[], defaultYear?: string): { rows: ImportRow[]; problems: string[] } {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lines.length === 0) return { rows: [], problems: [] };
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const head = splitLine(lines[0], sep).map((h) => h.toLowerCase());
  const col = Object.fromEntries(
    (Object.keys(HEADERS) as (keyof ImportRow)[]).map((k) => [k, head.findIndex((h) => HEADERS[k].includes(h))]),
  ) as Record<keyof ImportRow, number>;

  const problems: string[] = [];
  if (col.student_id < 0 || col.full_name < 0 || col.password < 0) {
    problems.push('The first row must be headings, including “Student ID”, “Full name” and “ID number”.');
    return { rows: [], problems };
  }

  const findTrack = (v: string) => {
    const k = trackKey(v);
    if (!k) return null;
    return tracks.find((t) => trackKey(t.id) === k || trackKey(t.name) === k)?.id ?? undefined;
  };

  const seen = new Set<string>();
  const rows: ImportRow[] = [];
  lines.slice(1).forEach((line, i) => {
    const cells = splitLine(line, sep);
    const n = i + 2;
    const student_id = (cells[col.student_id] ?? '').trim();
    const full_name = (cells[col.full_name] ?? '').trim();
    const password = (cells[col.password] ?? '').trim();
    if (!student_id && !full_name && !password) return;
    if (!/^[A-Za-z0-9._-]+$/.test(student_id)) return problems.push(`Row ${n}: the Student ID “${student_id}” can only use letters, numbers, dots, dashes and underscores.`);
    if (!full_name) return problems.push(`Row ${n}: the full name is missing.`);
    if (password.length < 6) return problems.push(`Row ${n} (${student_id}): the ID number must be at least 6 characters.`);
    if (seen.has(student_id.toLowerCase())) return problems.push(`Row ${n}: Student ID ${student_id} appears twice.`);
    seen.add(student_id.toLowerCase());
    let track_id: string | null = null;
    if (col.track_id >= 0 && cells[col.track_id]) {
      const t = findTrack(cells[col.track_id]);
      if (t === undefined) problems.push(`Row ${n} (${student_id}): track “${cells[col.track_id]}” wasn’t recognised, so it was left empty.`);
      else track_id = t;
    }
    const row: ImportRow = { student_id, full_name, password, track_id };
    if (col.current_grade >= 0 && cells[col.current_grade]) {
      const g = parseGrade(cells[col.current_grade]);
      if (g === null) problems.push(`Row ${n} (${student_id}): grade “${cells[col.current_grade]}” should be 10, 11 or 12, so it was left empty.`);
      else row.current_grade = g;
    }
    if (col.academic_year >= 0 && cells[col.academic_year]) {
      const y = normaliseAcademicYear(cells[col.academic_year]);
      if (y === null) problems.push(`Row ${n} (${student_id}): academic year “${cells[col.academic_year]}” should look like 2026-2027, so it was left empty.`);
      else row.academic_year = y;
    }
    if (row.current_grade && !row.academic_year && defaultYear) row.academic_year = defaultYear;
    rows.push(row);
  });
  return { rows, problems };
}

/** "10", "Grade 10", "G10" and "Gr 10" all become 10. */
export function parseGrade(v: string): 10 | 11 | 12 | null {
  const m = /^(?:grade|gr|g)?\s*\.?\s*(10|11|12)$/i.exec(v.trim());
  return m ? (Number(m[1]) as 10 | 11 | 12) : null;
}
