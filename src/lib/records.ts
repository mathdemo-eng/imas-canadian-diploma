// Student records: subjects, marks, feedback, teachers and promotions.
// Connected to Supabase, the database's security rules decide what each person sees
// (a student only their own records, and a mark only after giving feedback).
// Without a database, everything runs on the in-memory demo data.

import { demo } from './demo-backend';
import { getSupabase, supabaseConfigured } from './supabase';
import type { Term } from '../content/types';
import type { ParsedRecord } from './sheets';

export type CourseStatus = 'upcoming' | 'in_progress' | 'completed' | 'withdrawn';

export interface Teacher {
  id: string;
  full_name: string;
  email: string;
  title: string;
  subjects: string;
  qualifications: string[];
  experience: string;
  joined_imas: number | null;
  /** A small image as a data: URL, or empty. */
  photo: string;
  active: boolean;
  sort: number;
}

export interface StudentCourse {
  id: string;
  student_id: string;
  course_id: string;
  academic_year: string;
  grade_level: 10 | 11 | 12;
  term: Term;
  status: CourseStatus;
  attempt: number;
  teacher_id: string | null;
  /** A mark has been entered (the student may not be allowed to see it yet). */
  has_mark: boolean;
  promotion_id: string | null;
}

export interface Mark {
  student_course_id: string;
  mark: number;
  ca_mark: number | null;
  exam_mark: number | null;
}

export type FeedbackAnswers = Record<string, string | number>;

export interface Feedback {
  student_course_id: string;
  student_id: string;
  course_id: string;
  academic_year: string;
  teacher_id: string | null;
  answers: FeedbackAnswers;
  submitted_at: string;
}

export type PromotionDecision = 'promoted' | 'repeated' | 'graduated' | 'withdrawn';

export interface Promotion {
  id: string;
  student_id: string;
  decision: PromotionDecision;
  from_grade: number | null;
  to_grade: number | null;
  from_year: string | null;
  to_year: string | null;
  from_status: string;
  note: string;
  decided_by: string;
  decided_at: string;
  undone_at: string | null;
}

export interface StudentNotes {
  student_id: string;
  blocked_reason: string;
  notes: string;
}

/** Everything about one student's studies. */
export interface StudentFile {
  courses: StudentCourse[];
  /** Only the marks the viewer may see. */
  marks: Mark[];
  feedback: Feedback[];
  teachers: Teacher[];
}

/** Every record (for the promotion and feedback pages). */
export interface AllRecords {
  courses: StudentCourse[];
  marks: Mark[];
  feedback: Feedback[];
}

const SETUP_HINT =
  'Student records aren’t set up in the database yet. Run supabase/migrations/0003_records.sql (see “Student records” in the Hosting & Maintenance Guide).';

/** Turns database errors into readable messages. */
function fail(error: { message: string; code?: string } | null): never {
  const msg = error?.message ?? 'Unknown error';
  if (/schema cache|does not exist|PGRST205|42P01/i.test(`${msg} ${error?.code ?? ''}`)) throw new Error(SETUP_HINT);
  throw new Error(msg);
}

export function isSetupMissing(e: unknown) {
  return e instanceof Error && e.message === SETUP_HINT;
}

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string; code?: string } | null }>;

/** Reads every row, a page at a time (the database returns at most 1,000 rows per request). */
async function readAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) fail(error);
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

function chunks<T>(rows: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `demo-${Math.random().toString(36).slice(2)}`);

// ---------------------------------------------------------------------------
// One student's file
// ---------------------------------------------------------------------------

/**
 * A student's subjects, marks, feedback and the teachers they need.
 * As a student (or staff previewing the student's view), marks are shown only where feedback
 * was sent, as the database itself does for students. Staff otherwise see everything.
 */
export async function fetchStudentFile(studentId: string, viewer: 'student' | 'staff', feedbackRequired = true): Promise<StudentFile> {
  const hideLocked = (file: StudentFile): StudentFile => {
    if (viewer === 'staff' || !feedbackRequired) return file;
    const done = new Set(file.feedback.map((f) => f.student_course_id));
    return { ...file, marks: file.marks.filter((m) => done.has(m.student_course_id)), teachers: file.teachers.filter((t) => t.active) };
  };
  if (!supabaseConfigured) {
    const courses = demo.records.courses.filter((c) => c.student_id === studentId);
    const ids = new Set(courses.map((c) => c.id));
    const feedback = demo.records.feedback.filter((f) => f.student_id === studentId);
    const marks = demo.records.marks.filter((m) => ids.has(m.student_course_id));
    return hideLocked(structuredClone({ courses, marks, feedback, teachers: demo.records.teachers }));
  }
  const sb = await getSupabase();
  const courses = await readAll<StudentCourse>((a, b) => sb.from('student_courses').select('*').eq('student_id', studentId).order('academic_year').range(a, b));
  const ids = courses.map((c) => c.id);
  const marks = ids.length ? await readAll<Mark>((a, b) => sb.from('course_marks').select('*').in('student_course_id', ids).range(a, b)) : [];
  const feedback = await readAll<Feedback>((a, b) => sb.from('course_feedback').select('*').eq('student_id', studentId).range(a, b));
  const teachers = await listTeachers();
  return hideLocked({ courses, marks: marks.map(numericMark), feedback, teachers });
}

function numericMark(m: Mark): Mark {
  return {
    ...m,
    mark: Number(m.mark),
    ca_mark: m.ca_mark === null ? null : Number(m.ca_mark),
    exam_mark: m.exam_mark === null ? null : Number(m.exam_mark),
  };
}

/** Every subject, mark and piece of feedback (editors only). */
export async function fetchAllRecords(): Promise<AllRecords> {
  if (!supabaseConfigured) return structuredClone({ courses: demo.records.courses, marks: demo.records.marks, feedback: demo.records.feedback });
  const sb = await getSupabase();
  const [courses, marks, feedback] = await Promise.all([
    readAll<StudentCourse>((a, b) => sb.from('student_courses').select('*').order('id').range(a, b)),
    readAll<Mark>((a, b) => sb.from('course_marks').select('*').order('student_course_id').range(a, b)),
    readAll<Feedback>((a, b) => sb.from('course_feedback').select('*').order('student_course_id').range(a, b)),
  ]);
  return { courses, marks: marks.map(numericMark), feedback };
}

// ---------------------------------------------------------------------------
// Subjects and marks (editors)
// ---------------------------------------------------------------------------

/** A subject record to add or update. Fields left out keep their current value (or the default for a new record). */
export type CourseRowInput = Pick<StudentCourse, 'student_id' | 'course_id' | 'academic_year' | 'grade_level'> &
  Partial<Pick<StudentCourse, 'term' | 'status' | 'attempt' | 'teacher_id' | 'promotion_id'>>;

const COURSE_DEFAULTS = { term: 'FY', status: 'upcoming', attempt: 1, teacher_id: null, promotion_id: null, has_mark: false } as const;

/** Rows sent together must have the same fields, or the database would blank the missing ones. */
function groupByFields<T extends object>(rows: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const key = Object.keys(r).sort().join(',');
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()];
}

/**
 * Adds or updates subject records. A record is identified by student, course and academic year,
 * so uploading the same sheet twice updates rather than duplicates. Returns the saved rows.
 */
export async function saveStudentCourses(rows: CourseRowInput[]): Promise<StudentCourse[]> {
  if (rows.length === 0) return [];
  if (!supabaseConfigured) {
    return rows.map((r) => {
      const existing = demo.records.courses.find(
        (c) => c.student_id === r.student_id && c.course_id === r.course_id && c.academic_year === r.academic_year,
      );
      if (existing) {
        Object.assign(existing, r);
        return structuredClone(existing);
      }
      const row: StudentCourse = { ...COURSE_DEFAULTS, ...r, id: uid() };
      demo.records.courses.push(row);
      return structuredClone(row);
    });
  }
  const sb = await getSupabase();
  const saved: StudentCourse[] = [];
  for (const group of groupByFields(rows)) {
    for (const part of chunks(group)) {
      const { data, error } = await sb.from('student_courses').upsert(part, { onConflict: 'student_id,course_id,academic_year' }).select();
      if (error) fail(error);
      saved.push(...((data ?? []) as StudentCourse[]));
    }
  }
  return saved;
}

/** Adds records only where none exists yet (used when planning a year). Returns how many were added. */
export async function addMissingStudentCourses(rows: CourseRowInput[]): Promise<number> {
  if (rows.length === 0) return 0;
  if (!supabaseConfigured) {
    let added = 0;
    for (const r of rows) {
      const exists = demo.records.courses.some((c) => c.student_id === r.student_id && c.course_id === r.course_id && c.academic_year === r.academic_year);
      if (!exists) {
        demo.records.courses.push({ ...COURSE_DEFAULTS, ...r, id: uid() });
        added++;
      }
    }
    return added;
  }
  const sb = await getSupabase();
  let added = 0;
  for (const group of groupByFields(rows)) {
    for (const part of chunks(group)) {
      const { data, error } = await sb
        .from('student_courses')
        .upsert(part, { onConflict: 'student_id,course_id,academic_year', ignoreDuplicates: true })
        .select('id');
      if (error) fail(error);
      added += data?.length ?? 0;
    }
  }
  return added;
}

/**
 * Saves what was read from a subjects or grades sheet. For a record that already exists, the grade
 * and semester are kept unless the sheet gave them. A mark means the course is completed.
 */
export async function saveSheetRows(kind: 'subjects' | 'grades', rows: ParsedRecord[], existing: StudentCourse[]): Promise<{ added: number; updated: number }> {
  const key = (s: string, c: string, y: string) => `${s}|${c}|${y}`;
  const have = new Map(existing.map((c) => [key(c.student_id, c.course_id, c.academic_year), c]));
  const input = rows.map((r) => {
    const old = have.get(key(r.student.id, r.course.id, r.academic_year));
    const row: CourseRowInput = {
      student_id: r.student.id,
      course_id: r.course.id,
      academic_year: r.academic_year,
      grade_level: old && !r.given.grade ? old.grade_level : r.grade_level,
      term: old && !r.given.term ? old.term : r.term,
      status: r.status,
    };
    if (r.teacher_id !== undefined) row.teacher_id = r.teacher_id;
    return row;
  });
  const saved = await saveStudentCourses(input);
  if (kind === 'grades') {
    const ids = new Map(saved.map((c) => [key(c.student_id, c.course_id, c.academic_year), c.id]));
    await saveMarks(
      rows.flatMap((r) => {
        const id = ids.get(key(r.student.id, r.course.id, r.academic_year));
        return id && r.mark ? [{ student_course_id: id, ...r.mark }] : [];
      }),
    );
  }
  const added = rows.filter((r) => !have.has(key(r.student.id, r.course.id, r.academic_year))).length;
  return { added, updated: rows.length - added };
}

export async function deleteStudentCourse(id: string) {
  if (!supabaseConfigured) {
    demo.records.courses = demo.records.courses.filter((c) => c.id !== id);
    demo.records.marks = demo.records.marks.filter((m) => m.student_course_id !== id);
    demo.records.feedback = demo.records.feedback.filter((f) => f.student_course_id !== id);
    return;
  }
  const sb = await getSupabase();
  const { error } = await sb.from('student_courses').delete().eq('id', id);
  if (error) fail(error);
}

export async function saveMarks(marks: Mark[]) {
  if (marks.length === 0) return;
  if (!supabaseConfigured) {
    for (const m of marks) {
      const i = demo.records.marks.findIndex((x) => x.student_course_id === m.student_course_id);
      if (i >= 0) demo.records.marks[i] = { ...m };
      else demo.records.marks.push({ ...m });
      const course = demo.records.courses.find((c) => c.id === m.student_course_id);
      if (course) course.has_mark = true;
    }
    return;
  }
  const sb = await getSupabase();
  for (const part of chunks(marks)) {
    const { error } = await sb.from('course_marks').upsert(part);
    if (error) fail(error);
  }
}

export async function deleteMark(studentCourseId: string) {
  if (!supabaseConfigured) {
    demo.records.marks = demo.records.marks.filter((m) => m.student_course_id !== studentCourseId);
    const course = demo.records.courses.find((c) => c.id === studentCourseId);
    if (course) course.has_mark = false;
    return;
  }
  const sb = await getSupabase();
  const { error } = await sb.from('course_marks').delete().eq('student_course_id', studentCourseId);
  if (error) fail(error);
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

/** A student sends feedback on one completed course. It can't be changed afterwards. */
export async function submitFeedback(studentId: string, studentCourseId: string, answers: FeedbackAnswers) {
  if (!supabaseConfigured) {
    const course = demo.records.courses.find((c) => c.id === studentCourseId && c.student_id === studentId);
    if (!course || course.status !== 'completed') throw new Error('Feedback can only be sent on a completed course.');
    if (demo.records.feedback.some((f) => f.student_course_id === studentCourseId)) throw new Error('You have already sent feedback on this course.');
    demo.records.feedback.push({
      student_course_id: studentCourseId,
      student_id: studentId,
      course_id: course.course_id,
      academic_year: course.academic_year,
      teacher_id: course.teacher_id,
      answers,
      submitted_at: new Date().toISOString(),
    });
    return;
  }
  const sb = await getSupabase();
  const { error } = await sb.from('course_feedback').insert({ student_course_id: studentCourseId, student_id: studentId, answers });
  if (error) {
    if (error.code === '23505') throw new Error('You have already sent feedback on this course.');
    fail(error);
  }
}

/** Removes a student's feedback so they can send it again (editors). The mark is hidden again until they do. */
export async function deleteFeedback(studentCourseId: string) {
  if (!supabaseConfigured) {
    demo.records.feedback = demo.records.feedback.filter((f) => f.student_course_id !== studentCourseId);
    return;
  }
  const sb = await getSupabase();
  const { error } = await sb.from('course_feedback').delete().eq('student_course_id', studentCourseId);
  if (error) fail(error);
}

// ---------------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------------

export async function listTeachers(): Promise<Teacher[]> {
  if (!supabaseConfigured) return structuredClone(demo.records.teachers).sort((a, b) => a.sort - b.sort || a.full_name.localeCompare(b.full_name));
  const sb = await getSupabase();
  const { data, error } = await sb.from('teachers').select('*').order('sort').order('full_name');
  if (error) fail(error);
  return data as Teacher[];
}

export async function saveTeacher(t: Omit<Teacher, 'id'> & { id?: string }): Promise<Teacher> {
  if (!supabaseConfigured) {
    const row: Teacher = { ...t, id: t.id ?? uid() };
    const i = demo.records.teachers.findIndex((x) => x.id === row.id);
    if (i >= 0) demo.records.teachers[i] = row;
    else demo.records.teachers.push(row);
    return structuredClone(row);
  }
  const sb = await getSupabase();
  const { data, error } = await sb.from('teachers').upsert(t).select().single();
  if (error) fail(error);
  return data as Teacher;
}

export async function deleteTeacher(id: string) {
  if (!supabaseConfigured) {
    demo.records.teachers = demo.records.teachers.filter((t) => t.id !== id);
    for (const c of demo.records.courses) if (c.teacher_id === id) c.teacher_id = null;
    for (const s of demo.students) if (s.advisor_id === id) s.advisor_id = null;
    return;
  }
  const sb = await getSupabase();
  const { error } = await sb.from('teachers').delete().eq('id', id);
  if (error) fail(error);
}

// ---------------------------------------------------------------------------
// Staff notes
// ---------------------------------------------------------------------------

export async function fetchStudentNotes(studentId: string): Promise<StudentNotes> {
  const empty = { student_id: studentId, blocked_reason: '', notes: '' };
  if (!supabaseConfigured) return { ...empty, ...demo.records.notes.find((n) => n.student_id === studentId) };
  const sb = await getSupabase();
  const { data, error } = await sb.from('student_notes').select('*').eq('student_id', studentId).maybeSingle();
  if (error) fail(error);
  return (data as StudentNotes | null) ?? empty;
}

export async function saveStudentNotes(notes: StudentNotes) {
  if (!supabaseConfigured) {
    demo.records.notes = [...demo.records.notes.filter((n) => n.student_id !== notes.student_id), { ...notes }];
    return;
  }
  const sb = await getSupabase();
  const { error } = await sb.from('student_notes').upsert(notes);
  if (error) fail(error);
}

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

export async function listPromotions(studentId?: string): Promise<Promotion[]> {
  if (!supabaseConfigured) {
    const rows = demo.records.promotions.filter((p) => !studentId || p.student_id === studentId);
    return structuredClone(rows).sort((a, b) => b.decided_at.localeCompare(a.decided_at));
  }
  const sb = await getSupabase();
  const rows = await readAll<Promotion>((a, b) => {
    let q = sb.from('promotions').select('*').order('decided_at', { ascending: false });
    if (studentId) q = q.eq('student_id', studentId);
    return q.range(a, b);
  });
  return rows;
}

export async function insertPromotion(p: Omit<Promotion, 'id' | 'decided_at' | 'undone_at'>): Promise<Promotion> {
  if (!supabaseConfigured) {
    const row: Promotion = { ...p, id: uid(), decided_at: new Date().toISOString(), undone_at: null };
    demo.records.promotions.push(row);
    return structuredClone(row);
  }
  const sb = await getSupabase();
  const { data, error } = await sb.from('promotions').insert(p).select().single();
  if (error) fail(error);
  return data as Promotion;
}

export async function markPromotionUndone(id: string) {
  if (!supabaseConfigured) {
    const p = demo.records.promotions.find((x) => x.id === id);
    if (p) p.undone_at = new Date().toISOString();
    return;
  }
  const sb = await getSupabase();
  const { error } = await sb.from('promotions').update({ undone_at: new Date().toISOString() }).eq('id', id);
  if (error) fail(error);
}

/** Removes the subjects a promotion added. */
export async function deleteCoursesFromPromotion(promotionId: string) {
  if (!supabaseConfigured) {
    const ids = new Set(demo.records.courses.filter((c) => c.promotion_id === promotionId).map((c) => c.id));
    demo.records.courses = demo.records.courses.filter((c) => !ids.has(c.id));
    demo.records.marks = demo.records.marks.filter((m) => !ids.has(m.student_course_id));
    demo.records.feedback = demo.records.feedback.filter((f) => !ids.has(f.student_course_id));
    return;
  }
  const sb = await getSupabase();
  const { error } = await sb.from('student_courses').delete().eq('promotion_id', promotionId);
  if (error) fail(error);
}
