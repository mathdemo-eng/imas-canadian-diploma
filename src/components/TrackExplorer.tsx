import { ChevronDown } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildJourney, findTrack, type JourneyCard } from '../content/derive';
import { CLUSTER_LABEL, TERM_LABEL, TERM_MONTHS, courseLevel } from '../content/labels';
import type { Course, Track } from '../content/types';
import { useSite } from '../content/useSite';
import { Badge } from './ui';

type Choice = 'CAN' | 'CAD-science' | 'CAD-commerce';

const STREAMS: { value: Choice; label: string; hint: string }[] = [
  { value: 'CAN', label: 'CAN', hint: 'Canadian Diploma' },
  { value: 'CAD-science', label: 'Dual · Science', hint: 'IGCSE + Canadian' },
  { value: 'CAD-commerce', label: 'Dual · Commerce', hint: 'IGCSE + Canadian' },
];

function choiceOf(t: Track): Choice {
  return t.stream === 'CAN' ? 'CAN' : t.focus === 'commerce' ? 'CAD-commerce' : 'CAD-science';
}

export function TrackExplorer() {
  const { tracks, placements, courses } = useSite();
  const [params, setParams] = useSearchParams();
  const initial = tracks.find((t) => t.id === params.get('track')) ?? tracks[0];
  const [choice, setChoice] = useState<Choice>(initial ? choiceOf(initial) : 'CAN');
  const [entry, setEntry] = useState<10 | 11>(initial?.entry_grade ?? 10);

  const track = useMemo(() => {
    const [stream, focus] = choice.split('-') as ['CAN' | 'CAD', 'science' | 'commerce' | undefined];
    return findTrack(tracks, stream, focus ?? null, entry);
  }, [tracks, choice, entry]);

  const journey = useMemo(() => (track ? buildJourney(track, placements, courses) : []), [track, placements, courses]);

  function update(nextChoice: Choice, nextEntry: 10 | 11) {
    setChoice(nextChoice);
    setEntry(nextEntry);
    const [stream, focus] = nextChoice.split('-') as ['CAN' | 'CAD', 'science' | 'commerce' | undefined];
    const t = findTrack(tracks, stream, focus ?? null, nextEntry);
    if (t) setParams({ track: t.id }, { replace: true, preventScrollReset: true });
  }

  return (
    <div className="grid gap-10">
      {/* Controls */}
      <div className="grid gap-6 rounded-2xl border border-rule bg-sheet-2 p-5 sm:p-6 md:grid-cols-[1.6fr_1fr]">
        <fieldset className="grid gap-2">
          <legend className="t-label mb-2 text-ink-3">My stream</legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-rule bg-sheet p-1">
            {STREAMS.map((st) => (
              <label
                key={st.value}
                className={`grid cursor-pointer place-items-center rounded-lg px-2 py-2 text-center transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue ${choice === st.value ? 'bg-blue text-on-blue' : 'text-ink-2 hover:bg-sheet-2'}`}
              >
                <input
                  type="radio"
                  name="stream"
                  value={st.value}
                  checked={choice === st.value}
                  onChange={() => update(st.value, entry)}
                  className="sr-only"
                />
                <span className="text-[0.95rem] font-semibold leading-tight">{st.label}</span>
                <span className={`text-xs ${choice === st.value ? 'opacity-85' : 'text-ink-3'}`}>{st.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="t-label mb-2 text-ink-3">I joined in</legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-rule bg-sheet p-1">
            {([10, 11] as const).map((g) => (
              <label
                key={g}
                className={`grid cursor-pointer place-items-center rounded-lg px-2 py-2 text-center transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue ${entry === g ? 'bg-blue text-on-blue' : 'text-ink-2 hover:bg-sheet-2'}`}
              >
                <input type="radio" name="entry" value={g} checked={entry === g} onChange={() => update(choice, g)} className="sr-only" />
                <span className="text-[0.95rem] font-semibold leading-tight">Grade {g}</span>
                <span className={`text-xs ${entry === g ? 'opacity-85' : 'text-ink-3'}`}>{g === 10 ? '3 years' : '2 years'}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {!track ? (
        <p className="text-ink-2">This combination isn’t offered yet. Please choose another stream or entry grade.</p>
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-6 border-b border-rule pb-8 md:grid-cols-[1fr_auto] md:items-end" aria-live="polite">
            <div className="grid gap-2">
              <p className="t-label text-blue">{track.stream === 'CAN' ? 'CAN · Canadian Diploma' : 'Dual Program (CAD)'}</p>
              <h2 className="t-h2">{track.name}</h2>
              <p className="measure text-ink-2">{track.summary}</p>
            </div>
            <dl className="flex gap-8">
              <div>
                <dt className="text-sm text-ink-3">Programme</dt>
                <dd className="font-display text-3xl font-semibold t-num">{track.duration_years} years</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-3">Diploma courses</dt>
                <dd className="font-display text-3xl font-semibold t-num">{track.stated_total}</dd>
              </div>
            </dl>
          </div>

          <Legend />

          {/* Journey */}
          <ol className="grid gap-12">
            {journey.map((g, gi) => (
              <li key={g.grade} className="grid gap-5">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h3 className="font-display text-[1.9rem] font-semibold">Grade {g.grade}</h3>
                  <span className="t-label text-ink-3">
                    Year {gi + 1} of {track.duration_years}
                  </span>
                  {track.stream === 'CAD' && g.grade === 11 && (
                    <span className="text-sm text-ink-2">Dual Program students also sit their Cambridge IGCSE examinations this year.</span>
                  )}
                </div>
                <div className={`grid gap-5 ${g.terms.length > 1 ? 'lg:grid-cols-2' : ''}`}>
                  {g.terms.map((t) => (
                    <section key={t.term} className={`grid content-start gap-3 rounded-2xl p-4 sm:p-5 ${t.isPrep ? 'bg-green-tint' : 'bg-sheet-2'}`}>
                      <header className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="font-semibold">
                          {t.isPrep ? 'Canadian Preparatory Program' : TERM_LABEL[t.term]}
                          {t.isPrep && <span className="font-normal text-ink-2"> · {TERM_LABEL[t.term]}</span>}
                        </h4>
                        <span className="t-label text-ink-3">{TERM_MONTHS[t.term]}</span>
                      </header>
                      {t.isPrep && <p className="text-sm text-ink-2">Preparation courses for your Grade 12 Canadian subjects.</p>}
                      <ul className={`grid gap-2 ${g.terms.length === 1 ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`}>
                        {t.cards.map((card) => (
                          <CourseCard key={card.key} card={card} />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function CourseCard({ card }: { card: JourneyCard }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const first = card.items[0].course;
  const extension = card.items.some((i) => i.extension);
  return (
    <li className="rounded-xl border border-rule bg-sheet">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-[1fr_auto] items-start gap-3 rounded-xl p-3.5 text-left hover:bg-sheet-2"
      >
        <span className="grid gap-1.5">
          <span className="grid gap-0.5">
            {card.items.map(({ course }) => (
              <CourseName key={course.id} course={course} />
            ))}
          </span>
          <span className="text-sm text-ink-3">{CLUSTER_LABEL[first.cluster]}</span>
          {(extension || card.items.length > 1) && (
            <span className="flex flex-wrap gap-1.5">
              {extension && <Badge tone="blue">Continues from Grade 10</Badge>}
              {card.items.length > 1 && <Badge>Taught together</Badge>}
            </span>
          )}
        </span>
        <ChevronDown size={18} aria-hidden className={`mt-0.5 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="grid gap-2 border-t border-rule px-3.5 py-3 text-sm text-ink-2">
          {card.items.map(({ course }) => (
            <div key={course.id} className="grid gap-1">
              {card.items.length > 1 && <p className="font-semibold text-ink">{course.name}</p>}
              <p>{course.description}</p>
              <p className="text-ink-3">
                {course.kind === 'nb' ? `${course.credit_hours} credit-hours` : course.kind === 'prep' ? 'Preparation course, no credit-hours' : 'School course, no credit-hours'}
                {courseLevel(course.code) && ` · ${courseLevel(course.code)}`}
              </p>
            </div>
          ))}
          {extension && <p className="text-ink-3">This course continues from Grade 10, so it is not a new subject.</p>}
        </div>
      )}
    </li>
  );
}

function CourseName({ course }: { course: Course }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 font-semibold leading-snug text-ink">
      {course.name}
      {course.code && <span className="font-mono text-[0.8rem] font-medium text-ink-3">{course.code}</span>}
    </span>
  );
}

function Legend() {
  return (
    <div className="grid gap-2 rounded-xl border border-rule px-5 py-4">
      <p className="t-label text-ink-3">Reading the plan</p>
      <p className="measure text-sm text-ink-2">
        Course numbers follow New Brunswick’s system: the first digits give the grade level, so <span className="font-mono">110</span> is a Grade 11
        course and <span className="font-mono">120</span> is a Grade 12 course. Each New Brunswick course is 4 credit-hours. Select any course to read
        about it.
      </p>
    </div>
  );
}
