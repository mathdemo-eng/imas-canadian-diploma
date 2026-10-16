import type { Placement, Term, Track } from '../types';

// Source: "For Claude - website" (IMAS subject plan, Google Drive). Course totals are
// the totals IMAS publishes for each cohort, exactly as stated in that document.

export const tracks: Track[] = [
  {
    id: 'can-g10',
    name: 'CAN · Grade 10 entry',
    stream: 'CAN',
    focus: null,
    entry_grade: 10,
    duration_years: 3,
    stated_total: 21,
    summary: 'The full three-year Canadian programme, Grade 10 to Grade 12, following the New Brunswick curriculum only.',
    sort: 10,
  },
  {
    id: 'can-g11',
    name: 'CAN · Grade 11 entry',
    stream: 'CAN',
    focus: null,
    entry_grade: 11,
    duration_years: 2,
    stated_total: 19,
    summary: 'A two-year route that joins in Grade 11. The Grade 10 foundation courses are taken alongside the Grade 11 courses.',
    sort: 20,
  },
  {
    id: 'cad-sci-g10',
    name: 'Dual Program · Science · Grade 10 entry',
    stream: 'CAD',
    focus: 'science',
    entry_grade: 10,
    duration_years: 3,
    stated_total: 21,
    summary: 'Cambridge IGCSE (Science stream) in Grades 10 and 11 with Canadian courses alongside, then the Canadian Grade 12 year. Two certificates.',
    sort: 30,
  },
  {
    id: 'cad-com-g10',
    name: 'Dual Program · Commerce · Grade 10 entry',
    stream: 'CAD',
    focus: 'commerce',
    entry_grade: 10,
    duration_years: 3,
    stated_total: 22,
    summary: 'Cambridge IGCSE (Commerce stream) in Grades 10 and 11 with Canadian courses alongside, then the Canadian Grade 12 year. Two certificates.',
    sort: 40,
  },
  {
    id: 'cad-sci-g11',
    name: 'Dual Program · Science · Grade 11 entry',
    stream: 'CAD',
    focus: 'science',
    entry_grade: 11,
    duration_years: 2,
    stated_total: 19,
    summary: 'Cambridge IGCSE (Science stream) in Grade 11 with Canadian courses alongside, then the Canadian Grade 12 year. Two certificates.',
    sort: 50,
  },
  {
    id: 'cad-com-g11',
    name: 'Dual Program · Commerce · Grade 11 entry',
    stream: 'CAD',
    focus: 'commerce',
    entry_grade: 11,
    duration_years: 2,
    stated_total: 21,
    summary: 'Cambridge IGCSE (Commerce stream) in Grade 11 with Canadian courses alongside, then the Canadian Grade 12 year. Two certificates.',
    sort: 60,
  },
];

// A slot is a course id, a course id ending in "+" (extension to Grade 10),
// or an array of ids taught together on one card.
type Slot = string | string[];

const placements: Placement[] = [];

function place(track_id: string, grade: 10 | 11 | 12, term: Term, slots: Slot[]) {
  slots.forEach((slot, i) => {
    const ids = Array.isArray(slot) ? slot : [slot];
    for (const raw of ids) {
      const extension = raw.endsWith('+');
      const course_id = extension ? raw.slice(0, -1) : raw;
      placements.push({
        id: `${track_id}-${grade}-${term}-${course_id}`,
        track_id,
        grade,
        term,
        slot: (i + 1) * 10,
        course_id,
        extension,
        note: '',
      });
    }
  });
}

// Shared Grade 12 year
const g12s1: Slot[] = ['career-pathway-design', 'ela-12', 'graphic-art-110', 'psychology-110', 'precalc-a-120'];
const g12s2: Slot[] = ['kinesiology-120', 'world-issues-120', 'entrepreneurship-120', 'cybersecurity-120', 'civics'];
const g12s2Commerce: Slot[] = [...g12s2, 'human-physiology'];

// Canadian Preparatory Program (CAN Grade 11, Semester 2)
const cpp: Slot[] = ['prep-kinesiology', 'prep-psychology', 'prep-civics', 'prep-world-issues', 'prep-visual-arts', 'prep-mathematics', 'prep-english'];

// Grade 10, Science (CAN and Dual Science)
const g10Science: Slot[] = ['arabic-110', 'biology-111', 'chemistry-111', 'physics-111', 'nrf-10', 'ela-f10', 'reading-tutor-120', 'islamiyat', 'computer-science-110'];
// Grade 11 for Grade 10 entrants, Science
const g11Science: Slot[] = ['precalc-110', 'biology-111+', 'chemistry-111+', 'physics-111+', 'arabic-110+', 'ela-f11', 'writing-110', 'computer-science-110+'];
// Grade 11 for Grade 11 entrants, Science
const g11ScienceEntry: Slot[] = [['precalc-110', 'nrf-10'], 'biology-111', 'chemistry-111', 'physics-111', 'arabic-110', ['ela-f11', 'ela-f10'], 'writing-110', 'computer-science-110', 'reading-tutor-120'];

// CAN · Grade 10 entry
place('can-g10', 10, 'FY', g10Science);
place('can-g10', 11, 'S1', g11Science);
place('can-g10', 11, 'S2', cpp);
place('can-g10', 12, 'S1', g12s1);
place('can-g10', 12, 'S2', g12s2);

// CAN · Grade 11 entry
place('can-g11', 11, 'S1', g11ScienceEntry);
place('can-g11', 11, 'S2', cpp);
place('can-g11', 12, 'S1', g12s1);
place('can-g11', 12, 'S2', g12s2);

// Dual Program · Science · Grade 10 entry
place('cad-sci-g10', 10, 'FY', g10Science);
place('cad-sci-g10', 11, 'S1', g11Science);
place('cad-sci-g10', 12, 'S1', g12s1);
place('cad-sci-g10', 12, 'S2', g12s2);

// Dual Program · Commerce · Grade 10 entry
place('cad-com-g10', 10, 'FY', ['arabic-110', 'economics-120', 'business-management-120', 'financial-accounting-120', 'nrf-10', 'ela-f10', 'reading-tutor-120', 'islamiyat', 'computer-science-110', 'sss-10']);
place('cad-com-g10', 11, 'FY', ['precalc-110', 'economics-120+', 'business-management-120+', 'financial-accounting-120+', 'arabic-110+', 'ela-f11', 'writing-110', 'computer-science-110+']);
place('cad-com-g10', 12, 'S1', g12s1);
place('cad-com-g10', 12, 'S2', g12s2Commerce);

// Dual Program · Science · Grade 11 entry
place('cad-sci-g11', 11, 'FY', g11ScienceEntry);
place('cad-sci-g11', 12, 'S1', g12s1);
place('cad-sci-g11', 12, 'S2', g12s2);

// Dual Program · Commerce · Grade 11 entry
place('cad-com-g11', 11, 'FY', [['precalc-110', 'nrf-10'], 'economics-120', 'business-management-120', 'financial-accounting-120', 'arabic-110', 'ela-f10', 'ela-f11', 'writing-110', 'reading-tutor-120', 'sss-10']);
place('cad-com-g11', 12, 'S1', g12s1);
place('cad-com-g11', 12, 'S2', g12s2Commerce);

export { placements };
