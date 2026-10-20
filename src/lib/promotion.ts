// Saving promotion decisions, and undoing them.

import type { PromotionChanges } from './progress';
import { addMissingStudentCourses, deleteCoursesFromPromotion, insertPromotion, markPromotionUndone, type Promotion } from './records';
import { updateStudent, type StudentPatch, type StudentRecord } from './students';

/** Records the decision, adds next year's subjects, then moves the student on. */
export async function applyPromotion(student: StudentRecord, changes: PromotionChanges, decidedBy: string, note = '') {
  const promo = await insertPromotion({ student_id: student.id, ...changes.log, note, decided_by: decidedBy });
  await addMissingStudentCourses(changes.newCourses.map((r) => ({ ...r, promotion_id: promo.id })));
  await updateStudent(student.id, changes.patch);
  return promo;
}

/** Puts the student back where they were and removes the subjects the promotion added. */
export async function undoPromotion(p: Promotion, student: StudentRecord) {
  await deleteCoursesFromPromotion(p.id);
  const patch: StudentPatch = {
    current_grade: (p.from_grade as 10 | 11 | 12 | null) ?? null,
    academic_year: p.from_year,
    enrolment_status: (p.from_status as StudentRecord['enrolment_status']) ?? 'active',
  };
  if (p.decision === 'graduated') patch.graduated_year = null;
  await updateStudent(student.id, patch);
  await markPromotionUndone(p.id);
}

export const DECISION_LABEL: Record<Promotion['decision'], string> = {
  promoted: 'Promoted',
  repeated: 'Repeating the grade',
  graduated: 'Graduated',
  withdrawn: 'Left the programme',
};
