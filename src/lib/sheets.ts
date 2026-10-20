// Spreadsheet templates for subjects and grades, and the reader for uploaded sheets.
// One sheet can hold one student or a whole group: one row per student, course and year.

import { courseTitle } from '../content/labels';
import type { ContentBundle, Course, Settings, Term } from '../content/types';
import { normaliseAcademicYear } from './academic-year';
import type { CourseStatus, Mark, StudentCourse, Teacher } from './records';
import { parseGrade, splitLine, type StudentRecord } from './students';

export type SheetKind = 'subjects' | 'grades';

export const SHEET_HEADERS: Record<SheetKind, string[]> = {
  subjects: ['Student ID', 'Full name', 'Academic year', 'Grade', 'Semester', 'Course', 'Status', 'Teacher'],
  grades: ['Student ID', 'Full name', 'Academic year', 'Grade', 'Semester', 'Course', 'Final mark', 'Continuous assessment', 'Final exam'],
};

const HEADER_ALIASES: Record<string, string[]> = {
  student: ['student id', 'student_id', 'studentid', 'id'],
  year: ['academic year', 'academic_year', 'year', 'school year', 'session'],
  grade: ['grade', 'grade level', 'level'],
  term: ['semester', 'term', 'sem'],
  course: ['course', 'subject', 'course name', 'subject name'],
  status: ['status', 'state'],
  teacher: ['teacher', 'teacher name', 'teacher email'],
  mark: ['final mark', 'mark', 'final grade', 'grade %', 'final %', 'overall', 'total'],
  ca: ['continuous assessment', 'ca', 'coursework', 'continuous assessment %'],
  exam: ['final exam', 'exam', 'final examination', 'final exam %'],
};

export const STATUS_LABEL: Record<CourseStatus, string> = {
  upcoming: 'Upcoming',
  in_progress: 'In progress',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
};

const TERM_SHEET_LABEL: Record<Term, string> = { FY: 'Full year', S1: 'Semester 1', S2: 'Semester 2' };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const TITLES = /^(mr|mrs|ms|miss|dr|prof|sir|madam|cikgu|ustaz|ustazah)\.?\s+/i;

export function parseStatus(v: string): CourseStatus | null {
  const s = norm(v);
  if (!s || ['completed', 'complete', 'done', 'covered', 'finished', 'passed', 'yes'].includes(s)) return 'completed';
  if (['inprogress', 'current', 'ongoing', 'studying', 'started'].includes(s)) return 'in_progress';
  if (['upcoming', 'planned', 'next', 'future', 'notstarted'].includes(s)) return 'upcoming';
  if (['withdrawn', 'dropped', 'cancelled', 'canceled', 'exempt'].includes(s)) return 'withdrawn';
  return null;
}

export function parseTerm(v: string): Term | null | undefined {
  const s = norm(v);
  if (!s) return undefined;
  if (['1', 's1', 'sem1', 'semester1', 'term1', 'first'].includes(s)) return 'S1';
  if (['2', 's2', 'sem2', 'semester2', 'term2', 'second'].includes(s)) return 'S2';
  if (['fy', 'fullyear', 'full', 'both', '12', 's1s2', 'semesters12', 'semester12', 'year', 'allyear', 'wholeyear'].includes(s)) return 'FY';
  return null;
}

/** "75", "75%" and "75.5" are marks; anything outside 0–100 is not. */
export function parseMark(v: string): number | null | undefined {
  const s = v.trim().replace(/%$/, '').trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

/** Finds a course from what someone typed: its code, its name and number, or its name alone when that is unique. */
export function courseMatcher(courses: Course[]) {
  const exact = new Map<string, Course>();
  const byName = new Map<string, Course[]>();
  for (const c of courses) {
    const variants = [c.id, `${c.name} ${c.code}`, `${c.code} ${c.name}`, courseTitle(c.name, c.code)];
    if (c.code.includes('/')) variants.push(`${c.name} ${c.code.split('/')[0]}`);
    for (const v of variants) if (norm(v)) exact.set(norm(v), c);
    byName.set(norm(c.name), [...(byName.get(norm(c.name)) ?? []), c]);
  }
  return (typed: string): { course?: Course; problem?: string } => {
    const k = norm(typed);
    if (!k) return { problem: 'the course is missing' };
    const hit = exact.get(k);
    if (hit) return { course: hit };
    const named = byName.get(k);
    if (named?.length === 1) return { course: named[0] };
    if (named && named.length > 1) {
      return { problem: `“${typed}” matches ${named.length} courses; add the course number (${named.map((c) => c.code || c.id).join(' or ')})` };
    }
    return { problem: `the course “${typed}” isn’t in the course list` };
  };
}

export function teacherMatcher(teachers: Teacher[]) {
  const map = new Map<string, Teacher>();
  for (const t of teachers) {
    if (t.email) map.set(t.email.trim().toLowerCase(), t);
    map.set(norm(t.full_name), t);
    map.set(norm(t.full_name.replace(TITLES, '')), t);
  }
  return (typed: string) => map.get(typed.trim().toLowerCase()) ?? map.get(norm(typed)) ?? map.get(norm(typed.replace(TITLES, '')));
}

export interface ParsedRecord {
  student: StudentRecord;
  course: Course;
  academic_year: string;
  grade_level: 10 | 11 | 12;
  term: Term;
  status: CourseStatus;
  /** undefined: leave the current teacher; null: clear it. */
  teacher_id?: string | null;
  mark?: Omit<Mark, 'student_course_id'>;
  /** Whether the grade and semester came from the sheet (otherwise they were worked out from the cohort plan). */
  given: { grade: boolean; term: boolean };
}

export interface SheetContext {
  students: StudentRecord[];
  content: Pick<ContentBundle, 'courses' | 'placements'>;
  teachers: Teacher[];
  settings: Pick<Settings, 'ca_weight' | 'exam_weight'>;
  /** Used when a row has no academic year. */
  defaultYear: string;
}

/**
 * Reads a pasted or uploaded subjects or grades sheet. Rows with problems are left out and explained.
 * In a grades sheet, rows with no marks at all are skipped quietly (`blank`), so a ready-filled sheet
 * can be uploaded with only some marks entered.
 */
export function parseRecordsSheet(kind: SheetKind, text: string, ctx: SheetContext): { rows: ParsedRecord[]; problems: string[]; blank: number } {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  const problems: string[] = [];
  let blank = 0;
  if (lines.length === 0) return { rows: [], problems, blank };
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const head = splitLine(lines[0], sep).map((h) => h.toLowerCase().replace(/\s*\(.*\)\s*$/, '').trim());
  const col = (k: string) => head.findIndex((h) => HEADER_ALIASES[k].includes(h));
  const c = { student: col('student'), year: col('year'), grade: col('grade'), term: col('term'), course: col('course'), status: col('status'), teacher: col('teacher'), mark: col('mark'), ca: col('ca'), exam: col('exam') };

  if (c.student < 0 || c.course < 0) {
    problems.push('The first row must be headings, including “Student ID” and “Course”. Download the template to see the layout.');
    return { rows: [], problems, blank };
  }
  if (kind === 'grades' && c.mark < 0 && (c.ca < 0 || c.exam < 0)) {
    problems.push('A grades sheet needs a “Final mark” column (or both “Continuous assessment” and “Final exam”).');
    return { rows: [], problems, blank };
  }

  const students = new Map(ctx.students.map((s) => [s.student_id.toLowerCase(), s]));
  const findCourse = courseMatcher(ctx.content.courses);
  const findTeacher = teacherMatcher(ctx.teachers);
  const seen = new Set<string>();
  const rows: ParsedRecord[] = [];

  lines.slice(1).forEach((line, i) => {
    const cells = splitLine(line, sep);
    const cell = (k: keyof typeof c) => (c[k] >= 0 ? (cells[c[k]] ?? '').trim() : '');
    if (cells.every((x) => !x.trim())) return;
    if (kind === 'grades' && !cell('mark') && !cell('ca') && !cell('exam')) {
      blank++;
      return;
    }
    const n = i + 2;
    const sid = cell('student');
    const skip = (why: string) => problems.push(`Row ${n}${sid ? ` (${sid})` : ''}: ${why}. Row left out.`);
    const note = (why: string) => problems.push(`Row ${n}${sid ? ` (${sid})` : ''}: ${why}.`);

    const student = students.get(sid.toLowerCase());
    if (!student) return skip(sid ? `there is no student with the ID ${sid}` : 'the Student ID is missing');
    const found = findCourse(cell('course'));
    if (!found.course) return skip(found.problem!);
    const course = found.course;

    let year = ctx.defaultYear;
    if (cell('year')) {
      const y = normaliseAcademicYear(cell('year'));
      if (!y) return skip(`the academic year “${cell('year')}” should look like 2026-2027`);
      year = y;
    }

    const plan = ctx.content.placements.filter((p) => p.track_id === student.track_id && p.course_id === course.id);
    let grade: 10 | 11 | 12 | null = null;
    if (cell('grade')) {
      grade = parseGrade(cell('grade'));
      if (!grade) return skip(`the grade “${cell('grade')}” should be 10, 11 or 12`);
    } else grade = plan[0]?.grade ?? student.current_grade;
    if (!grade) return skip('the grade is missing');

    let term = parseTerm(cell('term'));
    if (term === null) return skip(`the semester “${cell('term')}” should be 1, 2 or Full year`);
    if (term === undefined) term = plan.find((p) => p.grade === grade)?.term ?? 'FY';

    const key = `${student.id}|${course.id}|${year}`;
    if (seen.has(key)) return skip(`${courseTitle(course.name, course.code)} for ${year} appears twice`);

    const row: ParsedRecord = {
      student,
      course,
      academic_year: year,
      grade_level: grade,
      term,
      status: 'completed',
      given: { grade: Boolean(cell('grade')), term: Boolean(cell('term')) },
    };

    if (kind === 'subjects') {
      const status = parseStatus(cell('status'));
      if (!status) return skip(`the status “${cell('status')}” should be Completed, In progress, Upcoming or Withdrawn`);
      row.status = status;
      if (c.teacher >= 0 && cell('teacher')) {
        const t = findTeacher(cell('teacher'));
        if (t) row.teacher_id = t.id;
        else note(`the teacher “${cell('teacher')}” isn’t in the Teachers list, so no teacher was set`);
      }
    } else {
      const mark = parseMark(cell('mark'));
      const ca = parseMark(cell('ca'));
      const exam = parseMark(cell('exam'));
      if (mark === null || ca === null || exam === null) return skip('marks must be numbers from 0 to 100');
      let final = mark;
      if (final === undefined && ca !== undefined && exam !== undefined) {
        final = Math.round(((ca * ctx.settings.ca_weight + exam * ctx.settings.exam_weight) / 100) * 10) / 10;
      }
      if (final === undefined) return skip('the final mark is missing');
      row.mark = { mark: final, ca_mark: ca ?? null, exam_mark: exam ?? null };
    }
    seen.add(key);
    rows.push(row);
  });
  return { rows, problems, blank };
}

// ---------------------------------------------------------------------------
// Writing sheets
// ---------------------------------------------------------------------------

function csvCell(v: string | number | null | undefined) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  // The byte-order mark makes Excel open the file as UTF-8.
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** A template with the headings and two example rows. */
export function templateCsv(kind: SheetKind, content: Pick<ContentBundle, 'courses'>, year: string) {
  const find = (id: string) => content.courses.find((c) => c.id === id);
  const a = find('biology-111') ?? content.courses[0];
  const b = find('ela-f10') ?? content.courses[1] ?? a;
  const t = (c: Course | undefined) => (c ? courseTitle(c.name, c.code) : '');
  const rows =
    kind === 'subjects'
      ? [
          ['260001', 'Aisha Rahman', year, 10, 'Full year', t(a), 'Completed', ''],
          ['260002', 'Daniel Lim', year, 10, 'Full year', t(b), 'In progress', ''],
        ]
      : [
          ['260001', 'Aisha Rahman', year, 10, 'Full year', t(a), 78, '', ''],
          ['260002', 'Daniel Lim', year, 10, 'Full year', t(b), '', 72, 65],
        ];
  return toCsv([SHEET_HEADERS[kind], ...rows]);
}

/** The current records of some students, ready to edit and upload again. */
export function exportRecordsCsv(
  kind: SheetKind,
  students: StudentRecord[],
  view: { courses: StudentCourse[]; marks: Mark[] },
  content: Pick<ContentBundle, 'courses'>,
  teachers: Teacher[],
  year?: string,
) {
  const byStudent = new Map(students.map((s) => [s.id, s]));
  const course = new Map(content.courses.map((c) => [c.id, c]));
  const teacher = new Map(teachers.map((t) => [t.id, t]));
  const marks = new Map(view.marks.map((m) => [m.student_course_id, m]));
  const rows = view.courses
    .filter((r) => byStudent.has(r.student_id) && (!year || r.academic_year === year))
    .sort((a, b) => byStudent.get(a.student_id)!.student_id.localeCompare(byStudent.get(b.student_id)!.student_id) || a.academic_year.localeCompare(b.academic_year))
    .map((r) => {
      const s = byStudent.get(r.student_id)!;
      return sheetRow(kind, s, r, course.get(r.course_id), r.teacher_id ? teacher.get(r.teacher_id) : undefined, marks.get(r.id));
    });
  return toCsv([SHEET_HEADERS[kind], ...rows]);
}

function sheetRow(
  kind: SheetKind,
  s: StudentRecord,
  r: Pick<StudentCourse, 'academic_year' | 'grade_level' | 'term' | 'course_id'> & { status: CourseStatus },
  c: Course | undefined,
  t: Teacher | undefined,
  m: Mark | undefined,
) {
  const common = [s.student_id, s.full_name, r.academic_year, r.grade_level, TERM_SHEET_LABEL[r.term], c ? courseTitle(c.name, c.code) : r.course_id];
  if (kind === 'subjects') return [...common, STATUS_LABEL[r.status], t ? t.email || t.full_name : ''];
  return [...common, m?.mark ?? '', m?.ca_mark ?? '', m?.exam_mark ?? ''];
}

/**
 * A sheet for a group of students and one academic year, filled in already: each student's subjects
 * for that year from their records, or from their cohort's plan when nothing is recorded yet.
 * Staff only fill in the status or the marks, then upload it again.
 */
export function groupSheetCsv(
  kind: SheetKind,
  students: StudentRecord[],
  view: { courses: StudentCourse[]; marks: Mark[] },
  content: Pick<ContentBundle, 'courses' | 'placements'>,
  teachers: Teacher[],
  year: string,
) {
  const course = new Map(content.courses.map((c) => [c.id, c]));
  const teacher = new Map(teachers.map((t) => [t.id, t]));
  const marks = new Map(view.marks.map((m) => [m.student_course_id, m]));
  const order: Record<Term, number> = { FY: 0, S1: 1, S2: 2 };
  const rows: (string | number)[][] = [];
  for (const s of [...students].sort((a, b) => a.student_id.localeCompare(b.student_id))) {
    const recorded = view.courses
      .filter((r) => r.student_id === s.id && r.academic_year === year)
      .sort((a, b) => order[a.term] - order[b.term] || a.course_id.localeCompare(b.course_id));
    if (recorded.length) {
      for (const r of recorded) rows.push(sheetRow(kind, s, r, course.get(r.course_id), r.teacher_id ? teacher.get(r.teacher_id) : undefined, marks.get(r.id)));
      continue;
    }
    const grade = gradeInYear(s, year);
    if (!grade || !s.track_id) continue;
    const status: CourseStatus = kind === 'grades' ? 'completed' : year === s.academic_year ? 'in_progress' : 'upcoming';
    content.placements
      .filter((p) => p.track_id === s.track_id && p.grade === grade)
      .sort((a, b) => order[a.term] - order[b.term] || a.slot - b.slot)
      .forEach((p) => rows.push(sheetRow(kind, s, { academic_year: year, grade_level: grade, term: p.term, course_id: p.course_id, status }, course.get(p.course_id), undefined, undefined)));
  }
  return { csv: toCsv([SHEET_HEADERS[kind], ...rows]), rows: rows.length };
}

/** The grade a student is (or was, or will be) in during an academic year, assuming no repeats. */
function gradeInYear(s: StudentRecord, year: string): 10 | 11 | 12 | null {
  if (!s.current_grade || !s.academic_year) return null;
  const g = s.current_grade + (Number(year.slice(0, 4)) - Number(s.academic_year.slice(0, 4)));
  return g >= 10 && g <= 12 ? (g as 10 | 11 | 12) : null;
}

/** Saves text as a file on the viewer's computer. */
export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
