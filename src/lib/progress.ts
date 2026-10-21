// The rules behind a student's progress: what counts as a subject, what is covered,
// what is left this year, next year and in total, when they should graduate, which
// marks are waiting for feedback, and what the promotion page suggests.
// Everything here is a pure function of the records, so it is easy to test.

import type { ContentBundle, Course, Settings, Term, Track } from '../content/types';
import { endYear, nextAcademicYear } from './academic-year';
import type { CourseRowInput, CourseStatus, Feedback, Mark, PromotionDecision, StudentCourse } from './records';
import type { StudentPatch, StudentRecord } from './students';

export type Viewer = 'student' | 'staff';
type Content = Pick<ContentBundle, 'tracks' | 'placements' | 'courses'>;
type Rules = Pick<Settings, 'pass_mark' | 'feedback_required' | 'ielts_min_band' | 'repeat_threshold'>;

export interface RecordsView {
  courses: StudentCourse[];
  marks: Mark[];
  feedback: Feedback[];
}

const TERM_ORDER: Record<Term, number> = { FY: 0, S1: 1, S2: 2 };

// ---------------------------------------------------------------------------
// One course record
// ---------------------------------------------------------------------------

export type Outcome = 'passed' | 'not_passed' | 'awaiting_feedback' | 'awaiting_mark' | 'in_progress' | 'upcoming' | 'withdrawn';

/** What a single record means, from what the viewer is allowed to see. */
export function outcomeOf(sc: StudentCourse, mark: Mark | undefined, passMark: number): Outcome {
  if (sc.status === 'upcoming') return 'upcoming';
  if (sc.status === 'in_progress') return 'in_progress';
  if (sc.status === 'withdrawn') return 'withdrawn';
  if (mark) return mark.mark >= passMark ? 'passed' : 'not_passed';
  return sc.has_mark ? 'awaiting_feedback' : 'awaiting_mark';
}

/** Completed courses the student still has to give feedback on. */
export function pendingFeedback(view: RecordsView, rules: Pick<Settings, 'feedback_required'>): StudentCourse[] {
  if (!rules.feedback_required) return [];
  const done = new Set(view.feedback.map((f) => f.student_course_id));
  return view.courses.filter((c) => c.status === 'completed' && !done.has(c.id));
}

// ---------------------------------------------------------------------------
// Subjects in a cohort plan
// ---------------------------------------------------------------------------

/** A subject that counts towards the diploma. Courses taught together on one card count as one subject. */
export interface PlanSubject {
  key: string;
  grade: 10 | 11 | 12;
  term: Term;
  courses: Course[];
  title: string;
}

/**
 * The subjects a cohort must complete: New Brunswick courses in the cohort's plan, not counting
 * extensions of Grade 10 courses, Grade 12 preparation courses or school courses.
 */
export function planSubjects(track: Track, content: Content): PlanSubject[] {
  const byId = new Map(content.courses.map((c) => [c.id, c]));
  const groups = new Map<string, PlanSubject>();
  const rows = content.placements
    .filter((p) => p.track_id === track.id && !p.extension && byId.get(p.course_id)?.kind === 'nb')
    .sort((a, b) => a.grade - b.grade || TERM_ORDER[a.term] - TERM_ORDER[b.term] || a.slot - b.slot);
  for (const p of rows) {
    const key = `${p.grade}-${p.term}-${p.slot}`;
    const course = byId.get(p.course_id)!;
    const g = groups.get(key);
    if (g) {
      g.courses.push(course);
      g.title = g.courses.map((c) => c.name).join(' & ');
    } else groups.set(key, { key, grade: p.grade, term: p.term, courses: [course], title: course.name });
  }
  return [...groups.values()];
}

export type Standing = 'covered' | 'covered_pending' | 'in_progress' | 'to_retake' | 'upcoming' | 'not_started';

export interface SubjectStatus {
  subject: PlanSubject;
  standing: Standing;
}

function courseStanding(records: StudentCourse[], marks: Map<string, Mark>, passMark: number): Standing {
  const outcomes = records.map((r) => outcomeOf(r, marks.get(r.id), passMark));
  if (outcomes.includes('passed')) return 'covered';
  if (outcomes.includes('awaiting_feedback') || outcomes.includes('awaiting_mark')) return 'covered_pending';
  if (outcomes.includes('in_progress')) return 'in_progress';
  if (outcomes.includes('upcoming')) return 'upcoming';
  if (outcomes.includes('not_passed')) return 'to_retake';
  return 'not_started';
}

function subjectStanding(courses: Standing[]): Standing {
  if (courses.every((s) => s === 'covered')) return 'covered';
  if (courses.every((s) => s === 'covered' || s === 'covered_pending')) return 'covered_pending';
  for (const s of ['in_progress', 'to_retake', 'upcoming'] as const) if (courses.includes(s)) return s;
  return 'not_started';
}

const isCovered = (s: Standing) => s === 'covered' || s === 'covered_pending';

// ---------------------------------------------------------------------------
// Time to graduate
// ---------------------------------------------------------------------------

export interface Progress {
  track: Track;
  subjects: SubjectStatus[];
  total: number;
  covered: number;
  /** Covered, but the result is waiting for feedback or a mark. */
  pendingResults: number;
  /** Not yet covered and belonging to this grade, plus anything to retake. */
  thisYear: SubjectStatus[];
  /** Subjects of the next grade in the plan. */
  nextYear: SubjectStatus[];
  remaining: SubjectStatus[];
  toRetake: SubjectStatus[];
  /** The July the student is expected to graduate, or null if their grade or year isn't set. */
  expectedGraduation: number | null;
  ielts: { band: number | null; required: number; met: boolean | null };
  /** Every required subject passed (results known), and the IELTS band met if recorded. */
  complete: boolean;
}

export function graduationProgress(student: StudentRecord, content: Content, view: RecordsView, rules: Rules): Progress | null {
  const track = content.tracks.find((t) => t.id === student.track_id);
  if (!track) return null;
  const marks = new Map(view.marks.map((m) => [m.student_course_id, m]));
  const own = view.courses.filter((c) => c.student_id === student.id);
  const subjects = planSubjects(track, content).map((subject) => ({
    subject,
    standing: subjectStanding(
      subject.courses.map((c) =>
        courseStanding(
          own.filter((r) => r.course_id === c.id),
          marks,
          rules.pass_mark,
        ),
      ),
    ),
  }));
  const remaining = subjects.filter((s) => !isCovered(s.standing));
  const grade = student.current_grade;
  const toRetake = remaining.filter((s) => s.standing === 'to_retake');
  const thisYear = remaining.filter((s) => (grade ? s.subject.grade <= grade : false));
  const nextYear = grade && grade < 12 ? remaining.filter((s) => s.subject.grade === grade + 1) : [];

  let expectedGraduation: number | null = null;
  if (student.enrolment_status === 'graduated' && student.graduated_year) expectedGraduation = endYear(student.graduated_year);
  else if (grade && student.academic_year) expectedGraduation = endYear(student.academic_year) + (12 - grade);

  const band = student.ielts_band;
  const ielts = { band, required: rules.ielts_min_band, met: band === null ? null : band >= rules.ielts_min_band };
  return {
    track,
    subjects,
    total: subjects.length,
    covered: subjects.filter((s) => isCovered(s.standing)).length,
    pendingResults: subjects.filter((s) => s.standing === 'covered_pending').length,
    thisYear,
    nextYear,
    remaining,
    toRetake,
    expectedGraduation,
    ielts,
    complete: subjects.every((s) => s.standing === 'covered') && ielts.met !== false,
  };
}

/**
 * The "Canadian Diploma Graduate" label: the student has graduated and has sent feedback
 * on every completed Grade 12 course.
 */
export function showGraduateLabel(student: StudentRecord, view: RecordsView, rules: Pick<Settings, 'feedback_required'>): boolean {
  if (student.enrolment_status !== 'graduated') return false;
  return !pendingFeedback(view, rules).some((c) => c.grade_level === 12);
}

// ---------------------------------------------------------------------------
// Grouping records for display
// ---------------------------------------------------------------------------

export interface YearGroup {
  academic_year: string;
  grade: 10 | 11 | 12;
  terms: { term: Term; courses: StudentCourse[] }[];
}

/** A student's records by academic year, then grade, then semester, in the order they happen. */
export function groupByYear(courses: StudentCourse[]): YearGroup[] {
  const groups: YearGroup[] = [];
  const sorted = [...courses].sort(
    (a, b) => a.academic_year.localeCompare(b.academic_year) || b.grade_level - a.grade_level || TERM_ORDER[a.term] - TERM_ORDER[b.term],
  );
  for (const c of sorted) {
    // A retake of an earlier grade's course sits with the year it is taken in.
    let g = groups.find((x) => x.academic_year === c.academic_year);
    if (!g) groups.push((g = { academic_year: c.academic_year, grade: c.grade_level, terms: [] }));
    g.grade = Math.max(g.grade, c.grade_level) as 10 | 11 | 12;
    let t = g.terms.find((x) => x.term === c.term);
    if (!t) g.terms.push((t = { term: c.term, courses: [] }));
    t.courses.push(c);
  }
  for (const g of groups) g.terms.sort((a, b) => TERM_ORDER[a.term] - TERM_ORDER[b.term]);
  return groups;
}

/** Whether a course in a cohort's plan continues from Grade 10 at this grade. */
export function isExtension(content: Content, trackId: string | null, courseId: string, grade: number) {
  return content.placements.some((p) => p.track_id === trackId && p.course_id === courseId && p.grade === grade && p.extension);
}

// ---------------------------------------------------------------------------
// Planning a year
// ---------------------------------------------------------------------------

/** The records to add when a student starts a grade: every course in their cohort's plan for that grade. */
export function planYearRows(
  student: StudentRecord,
  content: Content,
  grade: 10 | 11 | 12,
  year: string,
  status: 'upcoming' | 'in_progress' = 'upcoming',
): CourseRowInput[] {
  return content.placements
    .filter((p) => p.track_id === student.track_id && p.grade === grade)
    .sort((a, b) => TERM_ORDER[a.term] - TERM_ORDER[b.term] || a.slot - b.slot)
    .map((p) => ({ student_id: student.id, course_id: p.course_id, academic_year: year, grade_level: grade, term: p.term, status, attempt: 1 }));
}

export interface GroupSubjectOptions {
  year: string;
  /** 'plan': the grade the course has in the student's cohort plan, or else the student's own grade. */
  grade: 'plan' | 10 | 11 | 12;
  /** 'plan': the semester the course has in the student's cohort plan, or else Full year. */
  term: 'plan' | Term;
  status: CourseStatus;
  teacherId?: string | null;
}

/**
 * Every chosen course for every chosen student (not row by row): 30 students and 8 courses make 240 records.
 * A course taken before counts as another attempt. Students whose grade can't be worked out are returned in `skipped`.
 */
export function groupSubjectRows(
  students: StudentRecord[],
  courseIds: string[],
  content: Content,
  o: GroupSubjectOptions,
  existing: StudentCourse[] = [],
): { rows: CourseRowInput[]; skipped: StudentRecord[] } {
  const rows: CourseRowInput[] = [];
  const skipped: StudentRecord[] = [];
  for (const s of students) {
    const own: CourseRowInput[] = [];
    for (const courseId of courseIds) {
      const inPlan = content.placements.filter((p) => p.track_id === s.track_id && p.course_id === courseId);
      const planned = inPlan.find((p) => p.grade === s.current_grade) ?? inPlan[0];
      const grade = o.grade === 'plan' ? (planned?.grade ?? s.current_grade) : o.grade;
      if (!grade) break;
      const term = o.term === 'plan' ? (inPlan.find((p) => p.grade === grade)?.term ?? 'FY') : o.term;
      const before = existing.filter((c) => c.student_id === s.id && c.course_id === courseId && c.academic_year !== o.year);
      const row: CourseRowInput = {
        student_id: s.id,
        course_id: courseId,
        academic_year: o.year,
        grade_level: grade,
        term,
        status: o.status,
        attempt: Math.max(0, ...before.map((c) => c.attempt)) + 1,
      };
      if (o.teacherId) row.teacher_id = o.teacherId;
      own.push(row);
    }
    if (own.length === courseIds.length) rows.push(...own);
    else skipped.push(s);
  }
  return { rows, skipped };
}

// ---------------------------------------------------------------------------
// Promotion
// ---------------------------------------------------------------------------

export type Suggested = 'promote' | 'repeat' | 'graduate' | 'review';

export interface Suggestion {
  decision: Suggested;
  reasons: string[];
  /** Things to check before deciding (missing marks, unfinished courses). */
  warnings: string[];
  failed: StudentCourse[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What the promotion page suggests for a student at the end of an academic year. Staff always decide. */
export function suggestPromotion(student: StudentRecord, content: Content, view: RecordsView, rules: Rules, year: string): Suggestion {
  const none = (reason: string): Suggestion => ({ decision: 'review', reasons: [reason], warnings: [], failed: [] });
  if (student.enrolment_status !== 'active') return none(student.enrolment_status === 'graduated' ? 'Already graduated.' : 'No longer enrolled.');
  if (!student.current_grade) return none('Their grade isn’t set yet.');
  if (!student.track_id) return none('Their cohort isn’t set yet.');

  const marks = new Map(view.marks.map((m) => [m.student_course_id, m]));
  const rows = view.courses.filter((c) => c.student_id === student.id && c.academic_year === year && c.status !== 'withdrawn');
  if (rows.length === 0) return none(`No subjects recorded for ${year}.`);

  if (!rows.some((c) => c.status === 'completed')) return none(`Nothing is marked completed for ${year} yet.`);

  const failed = rows.filter((c) => c.status === 'completed' && marks.has(c.id) && marks.get(c.id)!.mark < rules.pass_mark);
  const missing = rows.filter((c) => c.status === 'completed' && !marks.has(c.id));
  const unfinished = rows.filter((c) => c.status === 'upcoming' || c.status === 'in_progress');
  const warnings: string[] = [];
  if (missing.length) warnings.push(`${plural(missing.length, 'completed course')} without a mark.`);
  if (unfinished.length) warnings.push(`${plural(unfinished.length, 'course')} not marked completed.`);

  if (student.current_grade === 12) {
    const progress = graduationProgress(student, content, view, rules);
    const left = progress ? progress.subjects.filter((s) => s.standing !== 'covered').length : 0;
    if (progress && left === 0) {
      if (progress.ielts.met === false) {
        return { decision: 'review', reasons: [`All subjects passed, but IELTS band ${progress.ielts.band} is below ${rules.ielts_min_band}.`], warnings, failed };
      }
      const reasons = ['Every required subject is passed.'];
      if (progress.ielts.met === null) warnings.push('IELTS band not recorded.');
      return { decision: 'graduate', reasons, warnings, failed };
    }
    return { decision: 'repeat', reasons: [`${plural(left, 'subject')} still needed to graduate.`], warnings, failed };
  }

  if (failed.length >= rules.repeat_threshold) {
    return {
      decision: 'repeat',
      reasons: [`${plural(failed.length, 'course')} not passed (the setting suggests repeating from ${rules.repeat_threshold}).`],
      warnings,
      failed,
    };
  }
  return {
    decision: 'promote',
    reasons: [failed.length ? `${plural(failed.length, 'course')} not passed: added as ${failed.length === 1 ? 'a retake' : 'retakes'} next year.` : 'All marked courses passed.'],
    warnings,
    failed,
  };
}

export interface PromotionChoice {
  decision: PromotionDecision;
  /** For a repeated grade: retake only what wasn't passed, or every course of the grade. */
  retake: 'not_passed' | 'all';
  /** When promoting: add the next grade's courses from the cohort plan. */
  planNext: boolean;
}

export interface PromotionChanges {
  patch: StudentPatch;
  log: { decision: PromotionDecision; from_grade: number | null; to_grade: number | null; from_year: string | null; to_year: string | null; from_status: string };
  /** New records for next year (the promotion's id is added when it is saved). */
  newCourses: CourseRowInput[];
}

/** Exactly what a promotion decision changes for one student. */
export function promotionChanges(student: StudentRecord, content: Content, view: RecordsView, rules: Rules, year: string, choice: PromotionChoice): PromotionChanges {
  const grade = student.current_grade ?? 10;
  const to = nextAcademicYear(year);
  const marks = new Map(view.marks.map((m) => [m.student_course_id, m]));
  const own = view.courses.filter((c) => c.student_id === student.id);
  const thisYear = own.filter((c) => c.academic_year === year && c.status !== 'withdrawn');
  const passedEver = (courseId: string) => own.some((c) => c.course_id === courseId && marks.has(c.id) && marks.get(c.id)!.mark >= rules.pass_mark);
  const nextAttempt = (courseId: string) => Math.max(0, ...own.filter((c) => c.course_id === courseId).map((c) => c.attempt)) + 1;
  const retakeRow = (c: StudentCourse): CourseRowInput => ({
    student_id: student.id,
    course_id: c.course_id,
    academic_year: to,
    grade_level: c.grade_level,
    term: c.term,
    status: 'upcoming',
    attempt: nextAttempt(c.course_id),
    teacher_id: null,
  });
  const notPassed = thisYear.filter((c) => !passedEver(c.course_id) && (c.status !== 'completed' || (marks.has(c.id) && marks.get(c.id)!.mark < rules.pass_mark)));
  const failedOnly = thisYear.filter((c) => c.status === 'completed' && marks.has(c.id) && marks.get(c.id)!.mark < rules.pass_mark && !passedEver(c.course_id));
  const base = { from_grade: student.current_grade, from_year: student.academic_year, from_status: student.enrolment_status };

  switch (choice.decision) {
    case 'promoted': {
      const next = Math.min(12, grade + 1) as 10 | 11 | 12;
      const planned = choice.planNext ? planYearRows(student, content, next, to).filter((r) => !passedEver(r.course_id)) : [];
      const retakes = failedOnly.map(retakeRow).filter((r) => !planned.some((p) => p.course_id === r.course_id));
      return {
        patch: { current_grade: next, academic_year: to },
        log: { ...base, decision: 'promoted', to_grade: next, to_year: to },
        newCourses: [...retakes, ...planned],
      };
    }
    case 'repeated': {
      const retakes = choice.retake === 'all' ? thisYear.filter((c) => c.grade_level === grade) : notPassed;
      return {
        patch: { academic_year: to },
        log: { ...base, decision: 'repeated', to_grade: grade, to_year: to },
        newCourses: retakes.map(retakeRow),
      };
    }
    case 'graduated':
      return {
        patch: { enrolment_status: 'graduated', graduated_year: year },
        log: { ...base, decision: 'graduated', to_grade: null, to_year: null },
        newCourses: [],
      };
    case 'withdrawn':
      return {
        patch: { enrolment_status: 'withdrawn' },
        log: { ...base, decision: 'withdrawn', to_grade: null, to_year: null },
        newCourses: [],
      };
  }
}
