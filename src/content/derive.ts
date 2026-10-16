import type { Course, Placement, Term, Track } from './types';

export interface JourneyCard {
  key: string;
  items: { course: Course; extension: boolean; note: string }[];
}
export interface JourneyTerm {
  term: Term;
  /** CAN Grade 11 Semester 2: every course is a Grade 12 preparation course. */
  isPrep: boolean;
  cards: JourneyCard[];
}
export interface JourneyGrade {
  grade: 10 | 11 | 12;
  terms: JourneyTerm[];
}

const TERM_ORDER: Record<Term, number> = { FY: 0, S1: 1, S2: 2 };

/** Groups a track's placements into grades → terms → cards, in the order a student meets them. */
export function buildJourney(track: Track, placements: Placement[], courses: Course[]): JourneyGrade[] {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const rows = placements
    .filter((p) => p.track_id === track.id && byId.has(p.course_id))
    .sort((a, b) => a.grade - b.grade || TERM_ORDER[a.term] - TERM_ORDER[b.term] || a.slot - b.slot);

  const grades: JourneyGrade[] = [];
  for (const p of rows) {
    let g = grades.find((x) => x.grade === p.grade);
    if (!g) grades.push((g = { grade: p.grade, terms: [] }));
    let t = g.terms.find((x) => x.term === p.term);
    if (!t) g.terms.push((t = { term: p.term, isPrep: true, cards: [] }));
    const course = byId.get(p.course_id)!;
    if (course.kind !== 'prep') t.isPrep = false;
    let card = t.cards.find((c) => c.key === `${p.grade}-${p.term}-${p.slot}`);
    if (!card) t.cards.push((card = { key: `${p.grade}-${p.term}-${p.slot}`, items: [] }));
    card.items.push({ course, extension: p.extension, note: p.note });
  }
  return grades;
}

/** Finds the track for a stream, focus and entry grade. */
export function findTrack(tracks: Track[], stream: Track['stream'], focus: Track['focus'], entry: 10 | 11) {
  return tracks.find((t) => t.stream === stream && (stream === 'CAN' || t.focus === focus) && t.entry_grade === entry);
}

/** Integrity problems in the content (used by tests and the admin dashboard). */
export function contentProblems(tracks: Track[], placements: Placement[], courses: Course[]): string[] {
  const problems: string[] = [];
  const courseIds = new Set(courses.map((c) => c.id));
  const trackIds = new Set(tracks.map((t) => t.id));
  for (const p of placements) {
    if (!trackIds.has(p.track_id)) problems.push(`A subject placement points to a missing track (${p.track_id}).`);
    if (!courseIds.has(p.course_id)) problems.push(`A subject placement points to a missing course (${p.course_id}).`);
  }
  for (const t of tracks) {
    if (!placements.some((p) => p.track_id === t.id)) problems.push(`${t.name} has no subjects yet.`);
  }
  return problems;
}
