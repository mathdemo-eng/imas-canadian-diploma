import { describe, expect, it } from 'vitest';
import { seedBundle } from '../src/content/seed';
import { academicYearOf, currentAcademicYear, nextAcademicYear, normaliseAcademicYear } from '../src/lib/academic-year';
import { demo } from '../src/lib/demo-backend';
import { missingAnswers } from '../src/lib/feedback-form';
import {
  graduationProgress,
  groupByYear,
  groupSubjectRows,
  outcomeOf,
  pendingFeedback,
  planSubjects,
  planYearRows,
  promotionChanges,
  showGraduateLabel,
  suggestPromotion,
  type RecordsView,
} from '../src/lib/progress';
import { saveSheetRows, type StudentCourse } from '../src/lib/records';
import { groupSheetCsv, parseRecordsSheet, templateCsv } from '../src/lib/sheets';

const content = seedBundle;
const rules = { ...seedBundle.settings };
const student = (sid: string) => structuredClone(demo.students.find((s) => s.student_id === sid)!);
/** What staff see: every mark. */
const staffView = (): RecordsView => structuredClone({ courses: demo.records.courses, marks: demo.records.marks, feedback: demo.records.feedback });
/** What a student sees: marks only where feedback was given. */
const studentView = (id: string): RecordsView => {
  const v = staffView();
  const done = new Set(v.feedback.map((f) => f.student_course_id));
  return { courses: v.courses.filter((c) => c.student_id === id), marks: v.marks.filter((m) => done.has(m.student_course_id)), feedback: v.feedback.filter((f) => f.student_id === id) };
};

describe('academic years', () => {
  it('reads the common ways of writing a year', () => {
    for (const v of ['2026-2027', '2026/2027', '2026-27', '2026/27', ' 2026 – 2027 ']) expect(normaliseAcademicYear(v)).toBe('2026-2027');
    expect(normaliseAcademicYear('2026-2028')).toBeNull();
    expect(normaliseAcademicYear('next year')).toBeNull();
  });
  it('starts a new year in September', () => {
    expect(academicYearOf(new Date(2026, 9, 20))).toBe('2026-2027');
    expect(academicYearOf(new Date(2027, 6, 31))).toBe('2026-2027');
    expect(academicYearOf(new Date(2027, 8, 1))).toBe('2027-2028');
    expect(currentAcademicYear('', new Date(2026, 9, 20))).toBe('2026-2027');
    expect(currentAcademicYear('2025/26')).toBe('2025-2026');
    expect(nextAcademicYear('2026-2027')).toBe('2027-2028');
  });
});

describe('subjects that count towards the diploma', () => {
  it('counts New Brunswick courses, not extensions, preparation or school courses; paired courses count once', () => {
    const counts = Object.fromEntries(content.tracks.map((t) => [t.id, planSubjects(t, content).length]));
    expect(counts).toEqual({ 'can-g10': 21, 'can-g11': 19, 'cad-sci-g10': 21, 'cad-com-g10': 23, 'cad-sci-g11': 19, 'cad-com-g11': 21 });
    // Every track but one matches the totals IMAS publishes; Dual Commerce Grade 10 lists 23 in its plan against a stated 22.
    const mismatched = content.tracks.filter((t) => planSubjects(t, content).length !== t.stated_total).map((t) => t.id);
    expect(mismatched).toEqual(['cad-com-g10']);
  });
});

describe('a course result', () => {
  const sc = (status: StudentCourse['status'], has_mark = false) => ({ status, has_mark }) as StudentCourse;
  it('depends on the status, the mark and whether the mark is visible', () => {
    expect(outcomeOf(sc('upcoming'), undefined, 60)).toBe('upcoming');
    expect(outcomeOf(sc('in_progress'), undefined, 60)).toBe('in_progress');
    expect(outcomeOf(sc('completed', true), { student_course_id: 'x', mark: 60, ca_mark: null, exam_mark: null }, 60)).toBe('passed');
    expect(outcomeOf(sc('completed', true), { student_course_id: 'x', mark: 59.9, ca_mark: null, exam_mark: null }, 60)).toBe('not_passed');
    expect(outcomeOf(sc('completed', true), undefined, 60)).toBe('awaiting_feedback');
    expect(outcomeOf(sc('completed', false), undefined, 60)).toBe('awaiting_mark');
  });
});

describe('time to graduate', () => {
  it('shows the demo student what is covered, what is left this year, and when they graduate', () => {
    const s = student('260001');
    const p = graduationProgress(s, content, studentView(s.id), rules)!;
    expect(p.total).toBe(21);
    // 8 Grade 10 subjects, plus Pre-Calculus 110 and ELA Foundational 11 whose results wait for feedback.
    expect(p.covered).toBe(10);
    expect(p.pendingResults).toBe(2);
    // The Grade 12 year, plus Writing 110 being retaken.
    expect(p.thisYear).toHaveLength(11);
    expect(p.thisYear.map((x) => x.subject.title)).toContain('Writing');
    expect(p.nextYear).toEqual([]);
    expect(p.remaining).toHaveLength(11);
    expect(p.expectedGraduation).toBe(2027);
    expect(p.ielts).toEqual({ band: 6.5, required: 6, met: true });
    expect(p.complete).toBe(false);
  });
  it('lists next year’s subjects for a Grade 10 student', () => {
    const s = student('260002');
    const p = graduationProgress(s, content, staffView(), rules)!;
    expect(p.covered).toBe(0);
    expect(p.nextYear).toHaveLength(3);
    expect(p.expectedGraduation).toBe(2029);
  });
  it('knows which completed courses still need feedback', () => {
    const s = student('260001');
    const v = studentView(s.id);
    expect(pendingFeedback(v, rules).map((c) => c.course_id).sort()).toEqual(['ela-f11', 'precalc-110']);
    expect(pendingFeedback(v, { feedback_required: false })).toEqual([]);
  });
  it('groups records by year, newest last, with retakes in the year they are taken', () => {
    const s = student('260001');
    const groups = groupByYear(studentView(s.id).courses);
    expect(groups.map((g) => [g.academic_year, g.grade])).toEqual([['2024-2025', 10], ['2025-2026', 11], ['2026-2027', 12]]);
    expect(groups[2].terms.flatMap((t) => t.courses).some((c) => c.course_id === 'writing-110' && c.attempt === 2)).toBe(true);
  });
});

describe('the Canadian Diploma Graduate label', () => {
  it('appears only after graduation and after all Grade 12 feedback', () => {
    const s = { ...student('260004'), enrolment_status: 'graduated' as const, graduated_year: '2026-2027' };
    const v = staffView();
    const own = { courses: v.courses.filter((c) => c.student_id === s.id), marks: v.marks, feedback: v.feedback };
    expect(showGraduateLabel({ ...s, enrolment_status: 'active' }, own, rules)).toBe(false);
    expect(showGraduateLabel(s, own, rules)).toBe(true);
    const withoutOne = { ...own, feedback: own.feedback.filter((f) => f.course_id !== 'ela-12') };
    expect(showGraduateLabel(s, withoutOne, rules)).toBe(false);
  });
});

describe('promotion suggestions', () => {
  const v = staffView();
  it('suggests repeating when the threshold of courses not passed is reached', () => {
    const r = suggestPromotion(student('260003'), content, v, rules, '2026-2027');
    expect(r.decision).toBe('repeat');
    expect(r.failed).toHaveLength(3);
  });
  it('suggests promoting with a retake for one course not passed', () => {
    const r = suggestPromotion(student('260005'), content, v, rules, '2026-2027');
    expect(r.decision).toBe('promote');
    expect(r.reasons[0]).toMatch(/1 course not passed/);
  });
  it('suggests graduating when every subject is passed', () => {
    expect(suggestPromotion(student('260004'), content, v, rules, '2026-2027').decision).toBe('graduate');
  });
  it('asks staff to review when nothing is finished yet', () => {
    const r = suggestPromotion(student('260002'), content, v, rules, '2026-2027');
    expect(r.decision).toBe('review');
  });
  it('promotes into the next grade, carrying retakes and adding the cohort plan', () => {
    const s = student('260005');
    const ch = promotionChanges(s, content, v, rules, '2026-2027', { decision: 'promoted', retake: 'not_passed', planNext: true });
    expect(ch.patch).toEqual({ current_grade: 12, academic_year: '2027-2028' });
    const retake = ch.newCourses.find((r) => r.course_id === 'precalc-110')!;
    expect(retake).toMatchObject({ academic_year: '2027-2028', grade_level: 11, attempt: 2, status: 'upcoming' });
    expect(ch.newCourses.filter((r) => r.grade_level === 12)).toHaveLength(10);
  });
  it('repeats a grade with only the courses not passed, or with every course', () => {
    const s = student('260003');
    const some = promotionChanges(s, content, v, rules, '2026-2027', { decision: 'repeated', retake: 'not_passed', planNext: true });
    expect(some.patch).toEqual({ academic_year: '2027-2028' });
    expect(some.newCourses.map((r) => r.course_id).sort()).toEqual(['chemistry-111', 'nrf-10', 'physics-111']);
    const all = promotionChanges(s, content, v, rules, '2026-2027', { decision: 'repeated', retake: 'all', planNext: true });
    expect(all.newCourses).toHaveLength(9);
    expect(all.log).toMatchObject({ decision: 'repeated', from_grade: 10, to_grade: 10 });
  });
  it('graduates a Grade 12 student', () => {
    const ch = promotionChanges(student('260004'), content, v, rules, '2026-2027', { decision: 'graduated', retake: 'not_passed', planNext: true });
    expect(ch.patch).toEqual({ enrolment_status: 'graduated', graduated_year: '2026-2027' });
    expect(ch.newCourses).toEqual([]);
  });
  it('plans a whole year from the cohort plan', () => {
    const rows = planYearRows(student('260002'), content, 11, '2027-2028');
    // CAN Grade 11: 8 courses in Semester 1 and the 7 Grade 12 preparation courses in Semester 2.
    expect(rows).toHaveLength(15);
    expect(rows.filter((r) => r.term === 'S2')).toHaveLength(7);
    expect(rows.every((r) => r.grade_level === 11 && r.academic_year === '2027-2028')).toBe(true);
  });
});

describe('the same subjects for a group', () => {
  const opts = { year: '2027-2028', grade: 'plan' as const, term: 'plan' as const, status: 'upcoming' as const };
  it('gives every subject to every student, not row by row', () => {
    const group = [student('260002'), student('260005')];
    const { rows, skipped } = groupSubjectRows(group, ['biology-111', 'islamiyat', 'writing-110'], content, opts, staffView().courses);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(6);
    for (const s of group) expect(rows.filter((r) => r.student_id === s.id).map((r) => r.course_id).sort()).toEqual(['biology-111', 'islamiyat', 'writing-110']);
    expect(rows.every((r) => r.academic_year === '2027-2028' && r.status === 'upcoming')).toBe(true);
  });
  it('counts a course taken before as another attempt', () => {
    const hana = student('260005');
    const { rows } = groupSubjectRows([hana], ['precalc-110'], content, opts, staffView().courses);
    expect(rows[0].attempt).toBe(2);
    expect(rows[0].term).toBe('S1');
  });
  it('leaves out a student whose grade can’t be worked out, unless a grade is chosen', () => {
    const noGrade = { ...student('260002'), current_grade: null, track_id: null };
    expect(groupSubjectRows([noGrade], ['biology-111'], content, opts).skipped).toHaveLength(1);
    const chosen = groupSubjectRows([noGrade], ['biology-111'], content, { ...opts, grade: 11, term: 'S2', teacherId: 'demo-teacher-3' });
    expect(chosen.rows).toEqual([expect.objectContaining({ grade_level: 11, term: 'S2', teacher_id: 'demo-teacher-3', attempt: 1 })]);
  });
});

describe('subjects and grades sheets', () => {
  const ctx = {
    students: demo.students,
    content,
    teachers: demo.records.teachers,
    settings: rules,
    defaultYear: '2026-2027',
  };
  it('reads a subjects sheet written in different ways', () => {
    const text = [
      'Student ID,Academic year,Grade,Semester,Course,Status,Teacher',
      '260002,2026/27,Grade 10,Full year,Biology 111,in progress,Mei Chen',
      '260002,,10,,English Language Arts Foundational 10,,sarah.lim@imas.edu.my',
      '260002,2026-2027,10,FY,Islamiyat,Upcoming,Mr Nobody',
    ].join('\n');
    const { rows, problems } = parseRecordsSheet('subjects', text, ctx);
    expect(rows.map((r) => [r.course.id, r.academic_year, r.grade_level, r.term, r.status])).toEqual([
      ['biology-111', '2026-2027', 10, 'FY', 'in_progress'],
      ['ela-f10', '2026-2027', 10, 'FY', 'completed'],
      ['islamiyat', '2026-2027', 10, 'FY', 'upcoming'],
    ]);
    expect(rows[0].teacher_id).toBe('demo-teacher-3');
    expect(rows[1].teacher_id).toBe('demo-teacher-1');
    expect(rows[2].teacher_id).toBeUndefined();
    expect(problems).toEqual(['Row 4 (260002): the teacher “Mr Nobody” isn’t in the Teachers list, so no teacher was set.']);
  });
  it('explains rows it can’t use', () => {
    const text = [
      'Student ID,Course,Status',
      '999999,Biology 111/2,Completed',
      '260002,English Language Arts Foundational,Completed',
      '260002,Basket Weaving,Completed',
      '260002,Physics 111/2,Maybe',
      '260002,Physics 111/2,Completed',
      '260002,Physics 111/2,Completed',
    ].join('\n');
    const { rows, problems } = parseRecordsSheet('subjects', text, ctx);
    expect(rows).toHaveLength(1);
    expect(problems).toHaveLength(5);
    expect(problems[0]).toMatch(/no student with the ID 999999/);
    expect(problems[1]).toMatch(/matches 2 courses; add the course number/);
    expect(problems[2]).toMatch(/isn’t in the course list/);
    expect(problems[3]).toMatch(/status “Maybe”/);
    expect(problems[4]).toMatch(/appears twice/);
  });
  it('reads marks, working out the final mark from 60% continuous assessment and 40% exam', () => {
    const text = ['Student ID\tCourse\tFinal mark\tContinuous assessment\tFinal exam', '260002\tBiology 111/2\t78%\t\t', '260002\tChemistry 111/2\t\t72\t65', '260002\tPhysics 111/2\t120\t\t'].join('\n');
    const { rows, problems } = parseRecordsSheet('grades', text, ctx);
    expect(rows.map((r) => r.mark?.mark)).toEqual([78, 69.2]);
    expect(rows[1].mark).toEqual({ mark: 69.2, ca_mark: 72, exam_mark: 65 });
    expect(problems[0]).toMatch(/marks must be numbers from 0 to 100/);
  });
  it('can read its own templates', () => {
    for (const kind of ['subjects', 'grades'] as const) {
      const { rows, problems } = parseRecordsSheet(kind, templateCsv(kind, content, '2026-2027').replace(/^﻿/, ''), ctx);
      expect(problems).toEqual([]);
      expect(rows).toHaveLength(2);
    }
  });
  it('fills a group sheet from the records, or from the cohort plan when nothing is recorded', () => {
    const v = staffView();
    const nur = student('260002');
    const recorded = groupSheetCsv('grades', [nur], v, content, demo.records.teachers, '2026-2027');
    expect(recorded.rows).toBe(v.courses.filter((c) => c.student_id === nur.id && c.academic_year === '2026-2027').length);
    // Next year nothing is recorded yet, so the sheet lists the Grade 11 plan.
    const planned = groupSheetCsv('subjects', [nur], v, content, demo.records.teachers, '2027-2028');
    expect(planned.rows).toBe(planYearRows(nur, content, 11, '2027-2028').length);
    expect(planned.csv).toContain('Nur Iman Hassan,2027-2028,11,Semester 1');
    // Past Grade 12 there is nothing to fill in.
    expect(groupSheetCsv('subjects', [nur], v, content, demo.records.teachers, '2030-2031').rows).toBe(0);
  });
  it('reads its own group sheet back, skipping rows without marks', () => {
    const nur = student('260002');
    const { csv } = groupSheetCsv('grades', [nur], staffView(), content, demo.records.teachers, '2026-2027');
    const lines = csv.replace(/^﻿/, '').trim().split('\r\n');
    lines[1] = lines[1].replace(/,,,$/, ',81,,');
    const { rows, problems, blank } = parseRecordsSheet('grades', lines.join('\n'), ctx);
    expect(problems).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].mark?.mark).toBe(81);
    expect(blank).toBe(lines.length - 2);
  });
  it('saves marks from a sheet without changing the semester of an existing record', async () => {
    const nur = student('260002');
    const text = ['Student ID,Course,Final mark', '260002,Biology 111/2,74'].join('\n');
    const { rows } = parseRecordsSheet('grades', text, ctx);
    const before = demo.records.courses.find((c) => c.student_id === nur.id && c.course_id === 'biology-111' && c.academic_year === '2026-2027')!;
    const term = before.term;
    const result = await saveSheetRows('grades', rows, structuredClone(demo.records.courses));
    expect(result).toEqual({ added: 0, updated: 1 });
    const after = demo.records.courses.find((c) => c.id === before.id)!;
    expect(after.status).toBe('completed');
    expect(after.term).toBe(term);
    expect(demo.records.marks.find((m) => m.student_course_id === before.id)?.mark).toBe(74);
  });
});

describe('the feedback form', () => {
  it('needs every rating and choice, but not the written answers', () => {
    expect(missingAnswers({})).toHaveLength(14);
    const all = Object.fromEntries(['t_mastery', 't_clarity', 't_design', 't_engagement', 't_feedback', 't_assessment', 't_support', 't_respect', 'c_relevance', 'c_resources', 'c_prepared', 'c_confidence', 'overall'].map((k) => [k, 4]));
    expect(missingAnswers({ ...all, c_workload: 'About right' })).toEqual([]);
  });
});
