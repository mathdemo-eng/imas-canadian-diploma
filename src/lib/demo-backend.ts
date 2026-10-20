// A stand-in for the database and sign-in service, used when the site isn't connected
// to Supabase (local development and the private preview). Everything lives in memory
// and disappears when the page is reloaded.

import { seedBundle } from '../content/seed';
import type { Feedback, Mark, Promotion, StudentCourse, StudentNotes, Teacher } from './records';
import type { StudentRecord } from './students';

export interface DemoAccount {
  id: string;
  email: string;
  password: string;
}

/** The example student shown in the preview. */
export const DEMO_STUDENT = { studentId: '260001', password: 'A1234567', name: 'Demo Student' };

const T1 = 'demo-teacher-1';
const T2 = 'demo-teacher-2';
const T3 = 'demo-teacher-3';

const teachers: Teacher[] = [
  {
    id: T1,
    full_name: 'Ms Sarah Lim',
    email: 'sarah.lim@imas.edu.my',
    title: 'Grade 12 English Language Arts teacher',
    subjects: 'English Language Arts 12, Writing 110',
    qualifications: ['MA in English Literature, University of Malaya', 'Postgraduate Diploma in Education', 'New Brunswick curriculum training (AEI)'],
    experience: 'Leads English across the Canadian programme and coaches students for IELTS and university personal statements.',
    joined_imas: 2016,
    photo: '',
    active: true,
    sort: 10,
  },
  {
    id: T2,
    full_name: 'Mr Daniel Okafor',
    email: 'daniel.okafor@imas.edu.my',
    title: 'Grade 12 Pre-Calculus teacher',
    subjects: 'Pre-Calculus 110, Pre-Calculus A 120',
    qualifications: ['BSc (Hons) Mathematics', 'Master of Education, Mathematics Education'],
    experience: 'Teaches mathematics from Grade 10 to Grade 12 and runs the lunchtime maths clinic.',
    joined_imas: 2019,
    photo: '',
    active: true,
    sort: 20,
  },
  {
    id: T3,
    full_name: 'Dr Mei Chen',
    email: 'mei.chen@imas.edu.my',
    title: 'Science teacher',
    subjects: 'Biology 111/2, Chemistry 111/2',
    qualifications: ['PhD in Molecular Biology', 'Certificate in Teaching'],
    experience: 'Brings laboratory research experience to the science courses.',
    joined_imas: 2021,
    photo: '',
    active: true,
    sort: 30,
  },
];

const TEACHER_FOR: Record<string, string> = {
  'ela-12': T1,
  'writing-110': T1,
  'ela-f10': T1,
  'ela-f11': T1,
  'precalc-110': T2,
  'precalc-a-120': T2,
  'nrf-10': T2,
  'biology-111': T3,
  'chemistry-111': T3,
};

interface DemoStudentSpec {
  id: string;
  student_id: string;
  full_name: string;
  track_id: string;
  current_grade: 10 | 11 | 12;
  ielts_band: number | null;
  advisor_id: string | null;
  /** Grade → academic year and how far it has got. */
  years: { grade: 10 | 11 | 12; year: string; state: 'done' | 'current' | 'upcoming' }[];
  /** Course ids with a mark below the pass mark, by grade. */
  fails?: Partial<Record<10 | 11 | 12, string[]>>;
  /** Completed courses still waiting for feedback. */
  noFeedback?: string[];
}

const specs: DemoStudentSpec[] = [
  {
    id: 'demo-student-1',
    student_id: DEMO_STUDENT.studentId,
    full_name: DEMO_STUDENT.name,
    track_id: 'can-g10',
    current_grade: 12,
    ielts_band: 6.5,
    advisor_id: T1,
    years: [
      { grade: 10, year: '2024-2025', state: 'done' },
      { grade: 11, year: '2025-2026', state: 'done' },
      { grade: 12, year: '2026-2027', state: 'current' },
    ],
    fails: { 11: ['writing-110'] },
    noFeedback: ['precalc-110', 'ela-f11'],
  },
  {
    id: 'demo-student-2',
    student_id: '260002',
    full_name: 'Nur Iman Hassan',
    track_id: 'can-g10',
    current_grade: 10,
    ielts_band: null,
    advisor_id: null,
    years: [{ grade: 10, year: '2026-2027', state: 'current' }],
  },
  {
    id: 'demo-student-3',
    student_id: '260003',
    full_name: 'Adam Tan',
    track_id: 'cad-sci-g10',
    current_grade: 10,
    ielts_band: null,
    advisor_id: null,
    years: [{ grade: 10, year: '2026-2027', state: 'done' }],
    fails: { 10: ['chemistry-111', 'physics-111', 'nrf-10'] },
  },
  {
    id: 'demo-student-4',
    student_id: '260004',
    full_name: 'Sara Lee',
    track_id: 'can-g11',
    current_grade: 12,
    ielts_band: 6.5,
    advisor_id: T2,
    years: [
      { grade: 11, year: '2025-2026', state: 'done' },
      { grade: 12, year: '2026-2027', state: 'done' },
    ],
  },
  {
    id: 'demo-student-5',
    student_id: '260005',
    full_name: 'Hana Yusof',
    track_id: 'can-g10',
    current_grade: 11,
    ielts_band: 5.5,
    advisor_id: null,
    years: [
      { grade: 10, year: '2025-2026', state: 'done' },
      { grade: 11, year: '2026-2027', state: 'done' },
    ],
    fails: { 11: ['precalc-110'] },
  },
];

/** A steady, varied mark for a course (the same every time the page loads). */
function sampleMark(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return 62 + (h % 34);
}

const BEST = ['Clear worked examples and practice tests.', 'Group projects and class discussions.', 'Detailed feedback on my drafts.', ''];
const IMPROVE = ['More time for revision before the final exam.', 'More practice questions in class.', '', 'Shorter homework tasks spread across the week.'];

/** Varied but repeatable answers, so the demo feedback results look like a real class. */
function sampleAnswers(seed: string) {
  const h = sampleMark(seed);
  const r = (k: number) => Math.min(5, Math.max(2, 3 + ((h + k * 7) % 3)));
  return {
    t_mastery: r(1), t_clarity: r(2), t_design: r(3), t_engagement: r(4), t_feedback: r(5), t_assessment: r(6), t_support: r(7), t_respect: Math.max(4, r(8)),
    c_relevance: r(9), c_resources: r(10), c_prepared: r(11), c_workload: ['About right', 'About right', 'Too heavy'][h % 3], c_confidence: r(12), overall: r(13),
    o_best: BEST[h % 4], o_improve: IMPROVE[(h >> 2) % 4],
  };
}

function build() {
  const students: StudentRecord[] = [];
  const courses: StudentCourse[] = [];
  const marks: Mark[] = [];
  const feedback: Feedback[] = [];
  const { placements } = seedBundle;
  for (const s of specs) {
    const current = s.years.find((y) => y.grade === s.current_grade)!;
    students.push({
      id: s.id,
      student_id: s.student_id,
      full_name: s.full_name,
      track_id: s.track_id,
      must_change_password: s.id === 'demo-student-1',
      created_at: '2026-10-16T00:00:00Z',
      current_grade: s.current_grade,
      academic_year: current.year,
      enrolment_status: 'active',
      graduated_year: null,
      advisor_id: s.advisor_id,
      ielts_band: s.ielts_band,
      blocked: false,
    });
    for (const y of s.years) {
      const rows = placements.filter((p) => p.track_id === s.track_id && p.grade === y.grade);
      for (const p of rows) {
        const id = `${s.id}-${y.year}-${p.course_id}`;
        const status = y.state === 'done' ? 'completed' : y.state === 'upcoming' ? 'upcoming' : p.term === 'S2' ? 'upcoming' : 'in_progress';
        courses.push({
          id,
          student_id: s.id,
          course_id: p.course_id,
          academic_year: y.year,
          grade_level: y.grade,
          term: p.term,
          status,
          attempt: 1,
          teacher_id: TEACHER_FOR[p.course_id] ?? null,
          has_mark: status === 'completed',
          promotion_id: null,
        });
        if (status !== 'completed') continue;
        const failed = s.fails?.[y.grade]?.includes(p.course_id);
        const mark = failed ? 48 + (sampleMark(id) % 10) : sampleMark(id);
        marks.push({ student_course_id: id, mark, ca_mark: Math.min(100, mark + 4), exam_mark: Math.max(0, mark - 6) });
        if (!s.noFeedback?.includes(p.course_id) && s.id !== 'demo-student-3') {
          feedback.push({
            student_course_id: id,
            student_id: s.id,
            course_id: p.course_id,
            academic_year: y.year,
            teacher_id: TEACHER_FOR[p.course_id] ?? null,
            answers: sampleAnswers(id),
            submitted_at: `${y.year.slice(5)}-07-01T00:00:00Z`,
          });
        }
      }
    }
  }
  // The demo student is retaking Writing 110 this year.
  const retake: StudentCourse = {
    id: 'demo-student-1-2026-2027-writing-110',
    student_id: 'demo-student-1',
    course_id: 'writing-110',
    academic_year: '2026-2027',
    grade_level: 11,
    term: 'S1',
    status: 'in_progress',
    attempt: 2,
    teacher_id: T1,
    has_mark: false,
    promotion_id: null,
  };
  courses.push(retake);
  return { students, courses, marks, feedback };
}

const built = build();

export const demo = {
  accounts: new Map<string, DemoAccount>(
    built.students.map((s) => [
      `${s.student_id}@imas.edu.my`,
      { id: s.id, email: `${s.student_id}@imas.edu.my`, password: s.id === 'demo-student-1' ? DEMO_STUDENT.password : `Demo-${s.student_id}` },
    ]),
  ),
  students: built.students,
  records: {
    teachers,
    courses: built.courses,
    marks: built.marks,
    feedback: built.feedback,
    promotions: [] as Promotion[],
    notes: [] as StudentNotes[],
  },
  signedIn: null as DemoAccount | null,
  listeners: new Set<() => void>(),
  notify() {
    this.listeners.forEach((l) => l());
  },
};

