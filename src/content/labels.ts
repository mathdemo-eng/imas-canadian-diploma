import type { Cluster, Stream, Term } from './types';

export const CLUSTER_LABEL: Record<Cluster, string> = {
  'language-arts': 'Language Arts & Languages',
  humanities: 'Humanities',
  sciences: 'Sciences',
  mathematics: 'Mathematics',
  'creative-arts': 'Creative Arts',
  wellness: 'Wellness & Physical Education',
  career: 'Career Connected Learning',
  school: 'IMAS school course',
  prep: 'Grade 12 preparation',
};

export const TERM_LABEL: Record<Term, string> = {
  FY: 'Semesters 1 & 2',
  S1: 'Semester 1',
  S2: 'Semester 2',
};

export const TERM_MONTHS: Record<Term, string> = {
  FY: 'September – July',
  S1: 'September – February',
  S2: 'March – July',
};

export const STREAM_LABEL: Record<Stream, string> = {
  CAN: 'CAN · Canadian Diploma',
  CAD: 'Dual Program (CAD) · IGCSE + Canadian Diploma',
};

/** New Brunswick course numbers start with the grade: 10 → Grade 10, 11x → Grade 11, 12x → Grade 12. */
export function courseLevel(code: string): string | null {
  if (!code) return null;
  if (code.startsWith('10') || code === '10') return 'Grade 10 level';
  if (code.startsWith('11')) return 'Grade 11 level';
  if (code.startsWith('12')) return 'Grade 12 level';
  return null;
}

export function courseTitle(name: string, code: string) {
  return code ? `${name} ${code}` : name;
}
