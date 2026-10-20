import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, ClipboardCheck, GraduationCap, LayoutDashboard, MessageSquareHeart, UserRound } from 'lucide-react';
import { useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ContentBundle, Course } from '../content/types';
import { useSite } from '../content/useSite';
import { graduationProgress, pendingFeedback, showGraduateLabel, type Progress, type Viewer } from '../lib/progress';
import { fetchStudentFile, isSetupMissing, type Mark, type StudentCourse, type StudentFile, type Teacher } from '../lib/records';
import type { StudentRecord } from '../lib/students';
import { AdvisorView } from './AdvisorView';
import { FeedbackView } from './FeedbackView';
import { GradesView } from './GradesView';
import { GraduationView } from './GraduationView';
import { Overview } from './Overview';
import { SubjectsView } from './SubjectsView';

/** Everything the portal's sections need, worked out once. */
export interface PortalData {
  student: StudentRecord;
  viewer: Viewer;
  /** Staff previewing a student's portal: nothing can be sent. */
  readOnly: boolean;
  site: ContentBundle;
  file: StudentFile;
  marks: Map<string, Mark>;
  feedbackDone: Set<string>;
  pending: StudentCourse[];
  progress: Progress | null;
  graduate: boolean;
  course: (id: string) => Course | undefined;
  teacher: (id: string | null) => Teacher | undefined;
  go: (tab: TabId, extra?: Record<string, string>) => void;
}

export type TabId = 'overview' | 'subjects' | 'grades' | 'graduation' | 'advisor' | 'feedback';

const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'subjects', label: 'My subjects', icon: BookOpen },
  { id: 'grades', label: 'My grades', icon: ClipboardCheck },
  { id: 'graduation', label: 'Time to graduate', icon: GraduationCap },
  { id: 'advisor', label: 'Advisor', icon: UserRound },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareHeart },
];

/** A student's records, shown to the student, or to staff previewing their portal. */
export function StudentPortal({ student, viewer, readOnly = false, footer }: { student: StudentRecord; viewer: Viewer; readOnly?: boolean; footer?: ReactNode }) {
  const site = useSite();
  const reduced = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as TabId;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const query = useQuery({
    queryKey: ['student-file', student.id, viewer, site.settings.feedback_required],
    queryFn: () => fetchStudentFile(student.id, viewer, site.settings.feedback_required),
  });

  const data = useMemo<PortalData | null>(() => {
    if (!query.data) return null;
    const file = query.data;
    const rules = site.settings;
    const courses = new Map(site.courses.map((c) => [c.id, c]));
    const teachers = new Map(file.teachers.map((t) => [t.id, t]));
    const view = { courses: file.courses, marks: file.marks, feedback: file.feedback };
    return {
      student,
      viewer,
      readOnly,
      site,
      file,
      marks: new Map(file.marks.map((m) => [m.student_course_id, m])),
      feedbackDone: new Set(file.feedback.map((f) => f.student_course_id)),
      pending: pendingFeedback(view, rules),
      progress: graduationProgress(student, site, view, rules),
      graduate: showGraduateLabel(student, view, rules),
      course: (id) => courses.get(id),
      teacher: (id) => (id ? teachers.get(id) : undefined),
      go: (next, extra = {}) => {
        setParams((p) => {
          const n = new URLSearchParams(p);
          n.set('tab', next);
          n.delete('course');
          for (const [k, v] of Object.entries(extra)) n.set(k, v);
          return n;
        });
        document.getElementById('portal-tabs')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      },
    };
  }, [query.data, site, student, viewer, readOnly, setParams, reduced]);

  function onTabKey(e: KeyboardEvent, i: number) {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + TABS.length) % TABS.length;
    tabRefs.current[next]?.focus();
    data?.go(TABS[next].id);
  }

  return (
    <div className="grid gap-6">
      <div id="portal-tabs" role="tablist" aria-label="Student Portal sections" className="-mx-1 flex scroll-mt-24 gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map((t, i) => {
          const active = t.id === tab;
          const count = t.id === 'feedback' ? data?.pending.length ?? 0 : 0;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => data?.go(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[0.95rem] font-semibold transition-colors ${
                active ? 'bg-blue text-on-blue shadow-sm' : 'text-ink-2 hover:bg-sheet-2 hover:text-blue'
              }`}
            >
              <t.icon size={17} aria-hidden />
              {t.label}
              {count > 0 && (
                <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs t-num ${active ? 'bg-on-blue text-blue' : 'bg-maroon text-on-blue'}`}>
                  <span className="sr-only">, </span>
                  {count}
                  <span className="sr-only"> to do</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-w-0">
        {query.isLoading && (
          <p role="status" className="text-ink-3">
            Loading your records…
          </p>
        )}
        {query.isError && (
          <p className="rounded-xl border-l-4 border-maroon bg-maroon-tint px-4 py-3 text-ink-2">
            {isSetupMissing(query.error)
              ? viewer === 'staff'
                ? (query.error as Error).message
                : 'Your subjects and grades will appear here soon.'
              : `Your records couldn’t be loaded: ${(query.error as Error).message}`}
          </p>
        )}
        {data && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.25 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              {tab === 'overview' && <Overview d={data} footer={footer} />}
              {tab === 'subjects' && <SubjectsView d={data} />}
              {tab === 'grades' && <GradesView d={data} />}
              {tab === 'graduation' && <GraduationView d={data} />}
              {tab === 'advisor' && <AdvisorView d={data} />}
              {tab === 'feedback' && <FeedbackView d={data} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
