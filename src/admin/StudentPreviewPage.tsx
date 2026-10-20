import { ArrowLeft, Eye } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { BLOCKED_MESSAGE } from '../lib/auth';
import { StudentPortal } from '../portal/StudentPortal';
import { errorText, useStudents } from './kit';

/** A student's portal exactly as they see it, for staff. Nothing can be sent from here. */
export function StudentPreviewPage() {
  const { studentId = '' } = useParams();
  const students = useStudents();
  const student = students.data?.find((s) => s.student_id === studentId);
  const back = `/admin/students/${encodeURIComponent(studentId)}`;

  if (students.isLoading) return <p role="status" className="text-ink-3">Loading…</p>;
  if (students.isError) return <p className="text-maroon">The student couldn’t be loaded: {errorText(students.error)}</p>;
  if (!student) return <p className="text-ink-2">There is no student with the ID {studentId}.</p>;

  return (
    <div className="grid grid-cols-1 gap-5">
      <h1 className="sr-only">{student.full_name}’s Student Portal</h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-2 border-blue bg-blue-tint px-5 py-4">
        <Eye className="shrink-0 text-blue" aria-hidden />
        <p className="min-w-0 flex-[1_1_18rem] text-ink">
          <strong>Viewing as {student.full_name}.</strong> This is exactly what they see in the Student Portal, including which marks are still locked. Nothing can
          be sent from this preview.
        </p>
        <Link to={back} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-blue px-5 font-semibold text-on-blue hover:bg-blue-deep">
          <ArrowLeft size={16} aria-hidden /> Back to the student
        </Link>
      </div>
      {student.blocked && (
        <p className="rounded-xl border-l-4 border-maroon bg-maroon-tint px-4 py-3 text-ink-2">
          Their access is blocked, so at the moment they only see: “{BLOCKED_MESSAGE}” Below is what they will see once you unblock them.
        </p>
      )}
      {student.must_change_password && !student.blocked && (
        <p className="rounded-xl bg-sheet-2 px-4 py-3 text-ink-2">
          They haven’t created their own password yet, so they see this only after their first sign-in.
        </p>
      )}
      <div className="sheet grid gap-8 px-5 py-8 sm:px-10 sm:py-10">
        <header className="grid gap-2 border-b border-rule pb-6">
          <p className="t-label text-blue">Student Portal</p>
          <p className="t-h1">
            Welcome, {student.full_name.trim().split(/\s+/)[0]}
          </p>
        </header>
        <StudentPortal student={student} viewer="student" readOnly />
      </div>
    </div>
  );
}
