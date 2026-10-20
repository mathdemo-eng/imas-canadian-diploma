// Academic years run September to July and are written "2026-2027".

const YEAR = /^(\d{4})\s*[-/–]\s*(\d{2}|\d{4})$/;

/** "2026-2027", "2026/2027", "2026-27" and "2026/27" all become "2026-2027". Anything else is null. */
export function normaliseAcademicYear(input: string): string | null {
  const m = YEAR.exec(input.trim());
  if (!m) return null;
  const start = Number(m[1]);
  const end = m[2].length === 2 ? Math.floor(start / 100) * 100 + Number(m[2]) : Number(m[2]);
  return end === start + 1 ? `${start}-${end}` : null;
}

/** The academic year a date falls in. A new year starts on 1 September. */
export function academicYearOf(date: Date): string {
  const y = date.getFullYear();
  return date.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

/** The school's current academic year: the setting, or worked out from today's date. */
export function currentAcademicYear(setting: string | undefined, today = new Date()): string {
  return (setting && normaliseAcademicYear(setting)) || academicYearOf(today);
}

export function shiftAcademicYear(year: string, by: number): string {
  const start = Number(year.slice(0, 4)) + by;
  return `${start}-${start + 1}`;
}

export const nextAcademicYear = (year: string) => shiftAcademicYear(year, 1);

/** The calendar year an academic year ends in (July). */
export function endYear(year: string): number {
  return Number(year.slice(5, 9));
}

/** "2026-2027" → "2026–27", for tight spaces. */
export function shortAcademicYear(year: string): string {
  return `${year.slice(0, 4)}–${year.slice(7, 9)}`;
}
