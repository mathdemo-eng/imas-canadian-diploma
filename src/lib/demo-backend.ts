// A stand-in for the database and sign-in service, used when the site isn't connected
// to Supabase (local development and the private preview). Everything lives in memory
// and disappears when the page is reloaded.

import type { StudentRecord } from './students';

export interface DemoAccount {
  id: string;
  email: string;
  password: string;
}

/** The example student shown in the preview. */
export const DEMO_STUDENT = { studentId: '260001', password: 'A1234567', name: 'Demo Student' };

export const demo = {
  accounts: new Map<string, DemoAccount>([
    ['260001@imas.edu.my', { id: 'demo-student-1', email: '260001@imas.edu.my', password: DEMO_STUDENT.password }],
  ]),
  students: [
    {
      id: 'demo-student-1',
      student_id: DEMO_STUDENT.studentId,
      full_name: DEMO_STUDENT.name,
      track_id: 'can-g10',
      must_change_password: true,
      created_at: '2026-10-16T00:00:00Z',
    },
  ] as StudentRecord[],
  signedIn: null as DemoAccount | null,
  listeners: new Set<() => void>(),
  notify() {
    this.listeners.forEach((l) => l());
  },
};
