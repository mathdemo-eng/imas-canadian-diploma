// Shared pieces for the admin pages about students: styles, form fields and data hooks.

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Clock, GraduationCap, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { currentAcademicYear } from '../lib/academic-year';
import { fetchAllRecords, fetchStudentFile, listPromotions, listTeachers } from '../lib/records';
import { listStudents, type StudentRecord } from '../lib/students';
import { isPreviewBuild } from '../lib/supabase';
import { Chip } from '../portal/ui';
import { useAdmin } from './AdminLayout';

export const input = 'min-h-11 w-full rounded-lg border border-rule-strong bg-sheet px-3 font-normal';
export const btn = {
  primary: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-blue px-5 font-semibold text-on-blue hover:bg-blue-deep disabled:opacity-60',
  secondary:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-rule-strong bg-sheet px-5 font-semibold hover:border-blue hover:text-blue disabled:opacity-60',
  quiet: 'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-2 hover:text-blue disabled:opacity-60',
  danger: 'inline-flex min-h-10 items-center gap-1.5 rounded-full bg-maroon px-4 text-sm font-semibold text-on-blue hover:opacity-90 disabled:opacity-60',
};

export function Field({ id, label, help, children }: { id: string; label: string; help?: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {help && <p className="text-sm text-ink-3">{help}</p>}
    </div>
  );
}

export function Panel({ title, intro, children, id, actions }: { title: string; intro?: ReactNode; children: ReactNode; id?: string; actions?: ReactNode }) {
  return (
    <section aria-labelledby={id ? `${id}-title` : undefined} className="grid min-w-0 grid-cols-1 gap-4 rounded-2xl border border-rule bg-sheet p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h2 id={id ? `${id}-title` : undefined} className="t-h3">
            {title}
          </h2>
          {intro && <div className="measure text-ink-2">{intro}</div>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Message({ tone, children }: { tone: 'ok' | 'error' | 'info'; children: ReactNode }) {
  const cls = tone === 'ok' ? 'bg-green-tint text-green-ink' : tone === 'error' ? 'bg-maroon-tint text-maroon' : 'bg-blue-tint text-blue-deep';
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-sm ${cls}`}>
      {children}
    </p>
  );
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const useStudents = () => useQuery({ queryKey: ['students'], queryFn: listStudents });
export const useTeachers = () => useQuery({ queryKey: ['teachers'], queryFn: listTeachers });
export const useAllRecords = () => useQuery({ queryKey: ['records-all'], queryFn: fetchAllRecords });
export const usePromotions = (studentId?: string) => useQuery({ queryKey: ['promotions', studentId ?? 'all'], queryFn: () => listPromotions(studentId) });
/** One student's records with every mark, as staff see them. */
export const useStaffFile = (studentId: string) =>
  useQuery({ queryKey: ['student-file', studentId, 'staff'], queryFn: () => fetchStudentFile(studentId, 'staff') });

/** Who is making a change, for the promotion history. */
export function useDecidedBy() {
  const { auth } = useAdmin();
  return auth.status === 'admin' ? auth.email : 'demo';
}

/** Downloads don't work inside the private preview page, only on the live website. */
export const downloadsOff = isPreviewBuild;

/** The academic year the school is in, from the setting or today's date. */
export function useCurrentYear() {
  const { content } = useAdmin();
  return currentAcademicYear(content.settings.current_academic_year);
}

/** Refreshes everything that depends on student records. */
export async function refreshRecords(qc: QueryClient) {
  await Promise.all(
    [['students'], ['records-all'], ['student-file'], ['promotions'], ['teachers']].map((queryKey) => qc.invalidateQueries({ queryKey })),
  );
}

/** Academic years around the current one, for pickers. */
export function yearOptions(current: string, before = 3, after = 2): string[] {
  const start = Number(current.slice(0, 4));
  const out: string[] = [];
  for (let y = start - before; y <= start + after; y++) out.push(`${y}-${y + 1}`);
  return out;
}

/** A student's account and enrolment state as chips, each with an icon and a label. */
export function StudentChips({ student }: { student: StudentRecord }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {student.blocked && (
        <Chip icon={Ban} tone="maroon">
          Blocked
        </Chip>
      )}
      {student.enrolment_status === 'graduated' && (
        <Chip icon={GraduationCap} tone="forest">
          Graduated
        </Chip>
      )}
      {student.enrolment_status === 'withdrawn' && (
        <Chip icon={LogOut} tone="neutral">
          Left the programme
        </Chip>
      )}
      {student.must_change_password ? (
        <Chip icon={Clock} tone="neutral">
          Waiting for first sign-in
        </Chip>
      ) : (
        !student.blocked &&
        student.enrolment_status === 'active' && (
          <Chip icon={CheckCircle2} tone="green">
            Password set
          </Chip>
        )
      )}
    </span>
  );
}

export const gradeYear = (s: Pick<StudentRecord, 'current_grade' | 'academic_year' | 'enrolment_status'>, short: (y: string) => string) =>
  s.enrolment_status === 'graduated' ? 'Graduated' : [s.current_grade ? `Grade ${s.current_grade}` : '', s.academic_year ? short(s.academic_year) : ''].filter(Boolean).join(' · ') || 'Grade not set';
