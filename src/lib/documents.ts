import { useQuery } from '@tanstack/react-query';
import { useContent } from '../content/hooks';
import type { DocumentLink, Track } from '../content/types';
import type { StudentRecord } from './students';
import { getSupabase, supabaseConfigured } from './supabase';

// Documents are either for everyone (the public Student Hub page) or only for chosen
// batches of students: the ticked cohorts and/or current grades, shown after they sign in.
// The database enforces the same rule (0004_document_batches.sql); these helpers decide
// what to show, and keep staff previews ("View as student") accurate.

export const GRADES = [10, 11, 12] as const;

/** True for a document meant only for chosen batches of signed-in students. */
export const isBatchDocument = (d: Pick<DocumentLink, 'audience'>) => d.audience === 'students';

/** Whether a batch document is meant for this student. An empty list means "all of them". */
export function isForStudent(d: DocumentLink, s: Pick<StudentRecord, 'track_id' | 'current_grade'>) {
  if (!isBatchDocument(d)) return true;
  const tracks = d.for_tracks ?? [];
  const grades = d.for_grades ?? [];
  return (
    (tracks.length === 0 || (s.track_id !== null && tracks.includes(s.track_id))) &&
    (grades.length === 0 || (s.current_grade !== null && grades.includes(s.current_grade)))
  );
}

/** The published batch documents for one student, in display order. */
export function batchDocumentsFor(s: Pick<StudentRecord, 'track_id' | 'current_grade'>, docs: DocumentLink[]) {
  return docs
    .filter((d) => d.published && isBatchDocument(d) && isForStudent(d, s))
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.title.localeCompare(b.title));
}

/** Who sees a document, in words: "Everyone", "Every signed-in student", "Grade 11 · CAN · Grade 10 entry". */
export function audienceLabel(d: DocumentLink, tracks: Pick<Track, 'id' | 'name'>[]) {
  if (!isBatchDocument(d)) return 'Everyone';
  const grades = [...(d.for_grades ?? [])].sort();
  const cohorts = (d.for_tracks ?? []).map((id) => tracks.find((t) => t.id === id)?.name ?? id);
  const parts = [
    grades.length ? `Grade ${grades.join(', ')}` : '',
    cohorts.length ? cohorts.join(', ') : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Every signed-in student';
}

/** A sentence for the admin form: exactly who will see the document. */
export function audienceSentence(d: DocumentLink, tracks: Pick<Track, 'id' | 'name'>[]) {
  if (!isBatchDocument(d)) return 'Everyone can see it on the Student Hub page, without signing in.';
  const grades = [...(d.for_grades ?? [])].sort();
  const cohorts = (d.for_tracks ?? []).map((id) => tracks.find((t) => t.id === id)?.name ?? id);
  const who = grades.length ? `Students now in Grade ${grades.join(' or ')}` : 'Students in any grade';
  const where = cohorts.length ? ` in ${cohorts.join(' or ')}` : ' in any cohort';
  return `${who}${where} see it after signing in, on the Student Hub page and in their Student Portal. Nobody else can open it from the website.`;
}

/** Batch documents the signed-in reader may see (the database leaves out the rest). */
export async function fetchBatchDocuments(): Promise<DocumentLink[]> {
  const sb = await getSupabase();
  const { data, error } = await sb.from('documents').select('*').eq('audience', 'students').eq('published', true).order('sort');
  if (error) {
    // Before the one-time database update there are no batch documents to show.
    if (/audience/.test(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as DocumentLink[];
}

/**
 * The batch documents for a student. Connected to the database they are fetched with the
 * reader's sign-in; in demo mode they come from the content in this browser.
 */
export function useBatchDocuments(student: Pick<StudentRecord, 'id' | 'track_id' | 'current_grade'> | null | undefined) {
  const content = useContent();
  const query = useQuery({
    queryKey: ['batch-documents', student?.id ?? null],
    queryFn: fetchBatchDocuments,
    enabled: Boolean(student) && supabaseConfigured,
  });
  if (!student) return { documents: [] as DocumentLink[], loading: false };
  const source = supabaseConfigured ? (query.data ?? []) : (content?.documents ?? []);
  return { documents: batchDocumentsFor(student, source), loading: supabaseConfigured && query.isLoading };
}
