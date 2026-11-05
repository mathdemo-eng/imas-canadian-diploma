import { describe, expect, it } from 'vitest';
import type { DocumentLink } from '../src/content/types';
import { audienceLabel, audienceSentence, batchDocumentsFor, isBatchDocument, isForStudent } from '../src/lib/documents';

const doc = (over: Partial<DocumentLink>): DocumentLink => ({
  id: over.id ?? 'd',
  title: over.title ?? 'A document',
  description: '',
  url: 'https://example.com',
  category: 'Guide',
  sort: 0,
  published: true,
  ...over,
});
const tracks = [
  { id: 'can-g10', name: 'CAN · Grade 10 entry' },
  { id: 'can-g11', name: 'CAN · Grade 11 entry' },
  { id: 'cad-sci-g10', name: 'Dual Program · Science · Grade 10 entry' },
];
const canGrade11 = { track_id: 'can-g10', current_grade: 11 as const };
const dualGrade10 = { track_id: 'cad-sci-g10', current_grade: 10 as const };

describe('documents for chosen batches', () => {
  it('treats documents saved before batches existed as for everyone', () => {
    expect(isBatchDocument(doc({}))).toBe(false);
    expect(isBatchDocument(doc({ audience: 'everyone' }))).toBe(false);
    expect(isBatchDocument(doc({ audience: 'students' }))).toBe(true);
  });

  it('matches a student by cohort and current grade; an empty list means all of them', () => {
    const canG11 = doc({ audience: 'students', for_tracks: ['can-g10', 'can-g11'], for_grades: [11] });
    expect(isForStudent(canG11, canGrade11)).toBe(true);
    expect(isForStudent(canG11, dualGrade10)).toBe(false);
    expect(isForStudent(canG11, { track_id: 'can-g10', current_grade: 12 })).toBe(false);

    const everyGrade10 = doc({ audience: 'students', for_tracks: [], for_grades: [10] });
    expect(isForStudent(everyGrade10, dualGrade10)).toBe(true);
    expect(isForStudent(everyGrade10, canGrade11)).toBe(false);

    const allStudents = doc({ audience: 'students' });
    expect(isForStudent(allStudents, canGrade11)).toBe(true);
    expect(isForStudent(allStudents, { track_id: null, current_grade: null })).toBe(true);

    // A student without a cohort or grade isn't in a batch that names one.
    expect(isForStudent(canG11, { track_id: null, current_grade: 11 })).toBe(false);
  });

  it('lists a student’s published batch documents only, in order', () => {
    const list = [
      doc({ id: 'everyone', audience: 'everyone' }),
      doc({ id: 'b', title: 'B', audience: 'students', for_grades: [11], sort: 20 }),
      doc({ id: 'a', title: 'A', audience: 'students', for_tracks: ['can-g10'], sort: 10 }),
      doc({ id: 'hidden', audience: 'students', published: false }),
      doc({ id: 'other', audience: 'students', for_tracks: ['cad-sci-g10'] }),
    ];
    expect(batchDocumentsFor(canGrade11, list).map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('describes who sees a document in words', () => {
    expect(audienceLabel(doc({}), tracks)).toBe('Everyone');
    expect(audienceLabel(doc({ audience: 'students' }), tracks)).toBe('Every signed-in student');
    expect(audienceLabel(doc({ audience: 'students', for_tracks: ['can-g10'], for_grades: [12, 11] }), tracks)).toBe('Grade 11, 12 · CAN · Grade 10 entry');
    expect(audienceSentence(doc({}), tracks)).toMatch(/^Everyone can see it/);
    expect(audienceSentence(doc({ audience: 'students', for_tracks: ['can-g10', 'can-g11'], for_grades: [11] }), tracks)).toBe(
      'Students now in Grade 11 in CAN · Grade 10 entry or CAN · Grade 11 entry see it after signing in, on the Student Hub page and in their Student Portal. Nobody else can open it from the website.',
    );
    expect(audienceSentence(doc({ audience: 'students' }), tracks)).toMatch(/^Students in any grade in any cohort/);
  });
});
