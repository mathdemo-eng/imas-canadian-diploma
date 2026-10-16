import type { Track } from '../content/types';
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
}

export interface ImportRow {
  student_id: string;
  full_name: string;
  /** The first password, such as the student's ID number. */
  password: string;
  track_id: string | null;
}

export interface ImportResult {
  student_id: string;
  status: 'created' | 'exists' | 'error';
  message?: string;
}

export async function fetchMyStudent(userId: string): Promise<StudentRecord | null> {
  if (!supabaseConfigured) return demo.students.find((s) => s.id === userId) ?? null;
  const sb = await getSupabase();
  const { data, error } = await sb.from('students').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StudentRecord | null) ?? null;
}

export async function listStudents(): Promise<StudentRecord[]> {
  if (!supabaseConfigured) return [...demo.students].sort((a, b) => a.student_id.localeCompare(b.student_id));
  const sb = await getSupabase();
  const { data, error } = await sb.from('students').select('*').order('student_id');
  if (error) throw new Error(error.message);
  return data as StudentRecord[];
}

export async function updateStudent(id: string, patch: Pick<StudentRecord, 'full_name' | 'track_id'>) {
  if (!supabaseConfigured) {
    const s = demo.students.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
    return;
  }
  const sb = await getSupabase();
  const { error } = await sb.from('students').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Creates sign-in accounts for a list of students. Students who already have an account are left unchanged. */
export async function importStudents(rows: ImportRow[]): Promise<ImportResult[]> {
  if (!supabaseConfigured) {
    return rows.map((r) => {
      const email = loginEmail(r.student_id);
      if (demo.accounts.has(email)) return { student_id: r.student_id, status: 'exists' as const };
      const id = `demo-${r.student_id}`;
      demo.accounts.set(email, { id, email, password: r.password });
      demo.students.push({ id, student_id: r.student_id, full_name: r.full_name, track_id: r.track_id, must_change_password: true, created_at: new Date().toISOString() });
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

/** Deletes a student's account and record. */
export async function removeStudent(studentId: string) {
  if (!supabaseConfigured) {
    demo.accounts.delete(loginEmail(studentId));
    demo.students = demo.students.filter((s) => s.student_id !== studentId);
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
};

function splitLine(line: string, sep: string): string[] {
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

/** "Dual Program · Science · Grade 10 entry", "CAD Science G10" and "cad-sci-g10" all become "cadscig10". */
function trackKey(s: string) {
  return s
    .toLowerCase()
    .replace(/\b(entry|program|programme|stream)\b/g, '')
    .replace(/\bdual\b/g, 'cad')
    .replace(/\bscience\b/g, 'sci')
    .replace(/\bcommerce\b/g, 'com')
    .replace(/\bgrade\s*/g, 'g')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Reads rows pasted from Excel or Google Sheets (tab-separated) or a CSV file.
 * The first row must be headings: Student ID, Full name, ID number, and optionally Track.
 */
export function parseStudentList(text: string, tracks: Track[]): { rows: ImportRow[]; problems: string[] } {
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
    rows.push({ student_id, full_name, password, track_id });
  });
  return { rows, problems };
}
