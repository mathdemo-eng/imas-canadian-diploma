// The site is a book. Chapters are read in this order, and Previous / Next
// (and the ← → keys) turn through them.

export interface ChapterInfo {
  path: string;
  title: string;
  /** Roman numeral for chapters; a letter for appendices; empty for the cover. */
  numeral: string;
  blurb: string;
  /** Shorter title for tight spaces, such as the contents page of the book on the cover. */
  short?: string;
}

export const CHAPTERS: ChapterInfo[] = [
  { path: '/', title: 'Welcome', numeral: '', blurb: 'The Canadian Diploma at IMAS' },
  { path: '/diploma', title: 'The Diploma', numeral: 'I', blurb: 'What it is and who recognises it' },
  { path: '/pathways', title: 'Pathways', numeral: 'II', blurb: 'CAN or the Dual Program, from Grade 10 or 11' },
  { path: '/academic-plan', title: 'Academic Plan', numeral: 'III', blurb: 'Your subjects, semester by semester' },
  { path: '/assessment', title: 'Assessment', numeral: 'IV', blurb: 'How your courses are marked' },
  { path: '/graduation', title: 'Graduation', numeral: 'V', blurb: 'What you need to earn the diploma' },
  { path: '/academic-year', title: 'Academic Year', numeral: 'VI', blurb: 'Two semesters, September to July' },
  { path: '/universities', title: 'Universities & Scholarships', short: 'Universities', numeral: 'VII', blurb: 'Where the diploma can take you' },
  { path: '/student-hub', title: 'Student Hub', numeral: 'VIII', blurb: 'For current students' },
  { path: '/faq', title: 'Questions', numeral: 'A', blurb: 'Answers to common questions' },
  { path: '/contact', title: 'Contact & Admissions', numeral: 'B', blurb: 'Talk to our team' },
];

export function chapterIndex(pathname: string) {
  return CHAPTERS.findIndex((c) => c.path === pathname);
}

export function chapterLabel(c: ChapterInfo) {
  if (!c.numeral) return '';
  return /^[A-Z]$/.test(c.numeral) ? `Appendix ${c.numeral}` : `Chapter ${c.numeral}`;
}
