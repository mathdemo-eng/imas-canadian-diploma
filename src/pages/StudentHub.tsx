import { ArrowRight, BarChart3, CalendarRange, Compass, FileText, GraduationCap, LockKeyhole, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chapter } from '../components/Chapter';
import { Badge, ButtonLink, Section } from '../components/ui';
import { useSite } from '../content/useSite';

function checklist(attendance: number, band: number) {
  return [
    { id: 'plan', label: 'I have looked through my academic plan for this year' },
    { id: 'career', label: 'My Career Life Plan is up to date' },
    { id: 'attendance', label: `My attendance is at least ${attendance}%` },
    { id: 'ielts-plan', label: 'I am attending the IMAS IELTS preparation classes' },
    { id: 'ielts-done', label: `I have achieved IELTS band ${band} or higher` },
    { id: 'universities', label: 'I have spoken to my counsellor about universities' },
  ];
}
const STORE = 'imas-can-checklist';

function readChecks(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function StudentHub() {
  const { settings: s, tracks, announcements, documents } = useSite();
  const [checks, setChecks] = useState<Record<string, boolean>>(readChecks);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(checks));
    } catch {
      /* storage unavailable: the checklist still works for this visit */
    }
  }, [checks]);

  const CHECKS = checklist(s.attendance_min, s.ielts_min_band);
  const done = CHECKS.filter((c) => checks[c.id]).length;

  return (
    <Chapter lede="Everything current CAN and Dual Program students come back to: your plan, your requirements and the latest news.">
      <Section eyebrow="My plan" title="Jump to your cohort">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t) => (
            <li key={t.id}>
              <Link
                to={`/academic-plan?track=${t.id}`}
                className="group flex h-full items-center justify-between gap-3 rounded-xl border border-rule p-4 hover:border-blue"
              >
                <span className="grid gap-1">
                  <Badge tone={t.stream === 'CAN' ? 'blue' : 'forest'}>{t.stream === 'CAN' ? 'CAN' : 'Dual · CAD'}</Badge>
                  <span className="font-semibold group-hover:text-blue">{t.name.replace(/^(CAN|Dual Program) · /, '')}</span>
                  <span className="text-sm text-ink-3">
                    {t.duration_years} years · {t.stated_total} courses
                  </span>
                </span>
                <ArrowRight size={18} aria-hidden className="shrink-0 text-ink-3 group-hover:text-blue" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        eyebrow="My checklist"
        title="Am I on track?"
        intro={<p>Tick what you have done. Your ticks are saved on this device only.</p>}
      >
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <fieldset className="grid gap-2">
            <legend className="sr-only">Graduation checklist</legend>
            {CHECKS.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${checks[c.id] ? 'border-green bg-green-tint' : 'border-rule hover:border-blue'}`}
              >
                <input
                  id={`check-${c.id}`}
                  type="checkbox"
                  checked={Boolean(checks[c.id])}
                  onChange={(e) => setChecks((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                  className="mt-1 h-5 w-5 shrink-0 accent-[var(--green-ink)]"
                />
                <span>{c.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="grid content-start gap-4 rounded-2xl bg-sheet-2 p-6">
            <p className="t-label text-ink-3">Progress</p>
            <p className="font-display text-5xl font-semibold t-num">
              {done}
              <span className="text-2xl text-ink-3"> / {CHECKS.length}</span>
            </p>
            <div className="h-2.5 overflow-hidden rounded-full bg-rule" aria-hidden>
              <div className="h-full rounded-full bg-green transition-[width]" style={{ width: `${(done / CHECKS.length) * 100}%` }} />
            </div>
            <ul className="grid gap-2 text-sm text-ink-2">
              <li>
                Pass mark: <strong className="text-ink">{s.pass_mark}%</strong> in every course
              </li>
              <li>
                Assessment: <strong className="text-ink">{s.ca_weight}%</strong> coursework, <strong className="text-ink">{s.exam_weight}%</strong> final
                exam, no midterms
              </li>
              <li>
                English: <strong className="text-ink">IELTS band {s.ielts_min_band}</strong> to graduate. IMAS prepares you and arranges the exam
              </li>
            </ul>
            <Link to="/graduation" className="prose-link w-fit">
              Read the graduation requirements
            </Link>
          </div>
        </div>
      </Section>

      <Section eyebrow="Announcements" title="Latest news">
        {announcements.length === 0 ? (
          <p className="rounded-xl border border-dashed border-rule-strong p-6 text-ink-3">No announcements right now. New ones will appear here.</p>
        ) : (
          <ul className="grid gap-3">
            {announcements.map((a) => (
              <li key={a.id} className="grid gap-1 rounded-xl border-l-4 border-blue bg-blue-tint px-5 py-4">
                <p className="font-mono text-xs text-ink-3">
                  {new Date(a.published_at + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="t-h3">{a.title}</p>
                <p className="text-ink-2">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section eyebrow="Documents" title="Useful documents">
        {documents.length === 0 ? (
          <p className="flex items-start gap-3 rounded-xl border border-dashed border-rule-strong p-6 text-ink-3">
            <FileText size={20} aria-hidden className="mt-0.5 shrink-0" />
            Handbooks, forms and guides from the programme coordinator will be listed here.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {documents.map((d) => (
              <li key={d.id}>
                <a href={d.url} target="_blank" rel="noreferrer" className="group grid gap-1 rounded-xl border border-rule p-4 hover:border-blue">
                  <span className="t-label text-ink-3">{d.category}</span>
                  <span className="font-semibold group-hover:text-blue">{d.title}</span>
                  {d.description && <span className="text-sm text-ink-2">{d.description}</span>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="portal" eyebrow="Student Portal" title="Your Student Portal">
        <div className="grid gap-6 rounded-2xl border-2 border-blue p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="grid content-start gap-3">
            <span className="flex items-center gap-2 text-blue">
              <LockKeyhole size={20} aria-hidden />
              <span className="t-label">Sign in with your Student ID</span>
            </span>
            <p className="font-display text-2xl font-semibold leading-snug">A personal profile that follows your progress through the programme.</p>
            <p className="text-ink-2">
              The first time, your password is your ID number. You’ll create your own password straight away.
            </p>
            <ButtonLink to="/portal" className="w-fit">
              Sign in to the portal <ArrowRight size={18} aria-hidden />
            </ButtonLink>
          </div>
          <div className="grid content-start gap-3">
            <p className="t-label text-ink-3">Coming soon to your portal</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: GraduationCap, t: 'Subjects covered', d: 'Courses completed, in progress and still to come' },
                { icon: BarChart3, t: 'Grades', d: 'Your results, course by course and semester by semester' },
                { icon: CalendarRange, t: 'Time to graduate', d: 'Credit-hours earned and your projected graduation date' },
                { icon: Sparkles, t: 'Academic advisor', d: 'Personal guidance on how to improve, based on your results' },
              ].map(({ icon: Icon, t, d }) => (
                <li key={t} className="grid content-start gap-1 rounded-xl bg-sheet-2 p-4">
                  <Icon size={20} aria-hidden className="text-blue" />
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-ink-2">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="flex items-center gap-2 text-sm text-ink-3">
          <Compass size={16} aria-hidden /> Until these arrive, use this hub and your academic plan to review your progress.
        </p>
      </Section>
    </Chapter>
  );
}
