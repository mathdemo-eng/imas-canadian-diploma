import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Chapter } from '../components/Chapter';
import { Badge, Callout, Section } from '../components/ui';
import { FloatingPoster } from '../components/media';
import poster from '../assets/photos/pathways-poster.webp';
import { useSite } from '../content/useSite';

type Cell = { title: string; detail: string } | null;
interface Route {
  track: string;
  stream: 'CAN' | 'CAD';
  entry: string;
  years: number;
  cells: [Cell, Cell, Cell];
  result: string;
}

const ROUTES: Route[] = [
  {
    track: 'can-g10',
    stream: 'CAN',
    entry: 'Join in Grade 10',
    years: 3,
    cells: [
      { title: 'Canadian courses', detail: 'Full year, Semesters 1 & 2' },
      { title: 'Canadian courses', detail: 'Semester 2: Canadian Preparatory Program' },
      { title: 'Grade 12 Canadian courses', detail: 'Two semesters' },
    ],
    result: 'New Brunswick High School Diploma',
  },
  {
    track: 'can-g11',
    stream: 'CAN',
    entry: 'Join in Grade 11',
    years: 2,
    cells: [
      null,
      { title: 'Grade 10 & 11 Canadian courses', detail: 'Semester 2: Canadian Preparatory Program' },
      { title: 'Grade 12 Canadian courses', detail: 'Two semesters' },
    ],
    result: 'New Brunswick High School Diploma',
  },
  {
    track: 'cad-sci-g10',
    stream: 'CAD',
    entry: 'Join in Grade 10',
    years: 3,
    cells: [
      { title: 'IGCSE Year 1 + Canadian courses', detail: 'Science or Commerce stream' },
      { title: 'IGCSE Year 2 + Canadian courses', detail: 'Cambridge IGCSE examinations' },
      { title: 'Grade 12 Canadian courses', detail: 'Two semesters' },
    ],
    result: 'Cambridge IGCSE + New Brunswick High School Diploma',
  },
  {
    track: 'cad-sci-g11',
    stream: 'CAD',
    entry: 'Join in Grade 11',
    years: 2,
    cells: [
      null,
      { title: 'IGCSE + Grade 10 & 11 Canadian courses', detail: 'Cambridge IGCSE examinations' },
      { title: 'Grade 12 Canadian courses', detail: 'Two semesters' },
    ],
    result: 'Cambridge IGCSE + New Brunswick High School Diploma',
  },
];

export function Pathways() {
  const { settings: s } = useSite();
  return (
    <Chapter lede="There are two streams and two ways in. Every route takes at least two years and ends with the New Brunswick High School Diploma.">
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,0.85fr)_1fr]">
        <FloatingPoster src={poster} alt="IMAS poster: Get your passport to the world, Canadian Diploma Pathways" glow={0.3} />
        <div className="grid content-start gap-5">
          <p className="t-label text-blue">Your passport to the world</p>
          <h2 className="t-h2">Two streams, two ways in, one Canadian diploma.</h2>
          <dl className="grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule">
            {[
              ['Choose a stream', 'CAN (Canadian curriculum only) or the Dual Program (IGCSE + Canadian Diploma)'],
              ['Join in', 'Grade 10 for three years, or Grade 11 for two years'],
              ['Graduate with', 'The New Brunswick High School Diploma, plus the IGCSE for Dual Program students'],
            ].map(([t, d]) => (
              <div key={t} className="grid gap-1 bg-sheet px-5 py-4">
                <dt className="t-label text-ink-3">{t}</dt>
                <dd className="text-ink">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <Section eyebrow="Two streams" title="CAN or the Dual Program">
        <div className="grid gap-5 md:grid-cols-2">
          <article className="grid content-start gap-4 rounded-2xl border-2 border-blue p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">CAN</Badge>
              <span className="t-label text-ink-3">Canadian Diploma</span>
            </div>
            <h3 className="font-display text-2xl font-semibold">The Canadian curriculum only</h3>
            <ul className="grid gap-2 text-ink-2">
              <li>Study New Brunswick courses from the day you join, with no IGCSE examinations.</li>
              <li>Graduate with the New Brunswick High School Diploma.</li>
              <li>In Semester 2 of Grade 11, the Canadian Preparatory Program gets you ready for your Grade 12 subjects.</li>
              <li>CAN students cannot drop subjects in Grades 10 and 11.</li>
            </ul>
          </article>
          <article className="grid content-start gap-4 rounded-2xl border-2 border-forest p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="forest">CAD</Badge>
              <span className="t-label text-ink-3">Dual Program · IGCSE + Canadian Diploma</span>
            </div>
            <h3 className="font-display text-2xl font-semibold">Two certificates from one journey</h3>
            <ul className="grid gap-2 text-ink-2">
              <li>Take the Cambridge IGCSE with Canadian courses alongside, then complete the Canadian Grade 12 year.</li>
              <li>Graduate with the Cambridge IGCSE certificate and the New Brunswick High School Diploma.</li>
              <li>Choose the Science stream or the Commerce stream.</li>
              <li>Join in Grade 10 (IGCSE in Grades 10 and 11) or in Grade 11 (IGCSE in Grade 11).</li>
            </ul>
          </article>
        </div>
      </Section>

      <Section
        eyebrow="Two ways in"
        title="Join in Grade 10 or Grade 11"
        intro={<p>The minimum is two years. Students who join in Grade 11 take their Grade 10 foundation courses alongside Grade 11.</p>}
      >
        <div className="overflow-x-auto rounded-2xl border border-rule">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <caption className="sr-only">Each route, year by year</caption>
            <thead>
              <tr className="bg-sheet-2">
                <th scope="col" className="t-label w-[19%] px-4 py-3 text-ink-3">
                  Route
                </th>
                {['Grade 10', 'Grade 11', 'Grade 12'].map((g) => (
                  <th key={g} scope="col" className="t-label w-[20%] px-4 py-3 text-ink-3">
                    {g}
                  </th>
                ))}
                <th scope="col" className="t-label w-[20%] px-4 py-3 text-ink-3">
                  You graduate with
                </th>
              </tr>
            </thead>
            <tbody>
              {ROUTES.map((r) => (
                <tr key={r.track} className="border-t border-rule align-top">
                  <th scope="row" className="px-4 py-4">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={r.stream === 'CAN' ? 'blue' : 'forest'}>{r.stream}</Badge>
                      <span className="font-semibold">{r.entry}</span>
                    </span>
                    <span className="mt-1 block text-sm font-normal text-ink-3">{r.years}-year programme</span>
                    <Link to={`/academic-plan?track=${r.track}`} className="prose-link mt-2 inline-flex items-center gap-1 text-sm font-normal">
                      See subjects <ArrowRight size={14} aria-hidden />
                    </Link>
                  </th>
                  {r.cells.map((c, i) => (
                    <td key={i} className="px-2 py-3">
                      {c ? (
                        <div className={`h-full rounded-lg px-3 py-2.5 ${r.stream === 'CAN' ? 'bg-blue-tint' : 'bg-forest-tint'}`}>
                          <p className="font-semibold leading-snug">{c.title}</p>
                          <p className="text-sm text-ink-2">{c.detail}</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-rule-strong px-3 py-2.5 text-sm text-ink-3">Before joining</div>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-4 font-semibold text-maroon">{r.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-ink-3">The Dual Program rows show the Science stream. The Commerce stream follows the same years with commerce subjects.</p>
      </Section>

      <Section eyebrow="Joining" title="Entry requirements">
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule md:grid-cols-3">
          <div className="grid content-start gap-2 bg-sheet p-6">
            <dt className="t-h3">Grade 10 entry</dt>
            <dd className="text-ink-2">Completed Grade 9 with at least seven subjects approved by the Ministry of Education.</dd>
          </div>
          <div className="grid content-start gap-2 bg-sheet p-6">
            <dt className="t-h3">Grade 11 entry</dt>
            <dd className="text-ink-2">Completed Grade 10, with the minimum subjects approved by the Ministry of Education.</dd>
          </div>
          <div className="grid content-start gap-2 bg-sheet p-6">
            <dt className="t-h3">English</dt>
            <dd className="text-ink-2">
              Evidence of English proficiency, such as an IELTS or TOEFL result or English-medium schooling. Otherwise you may sit the IMAS English Placement
              Test.
            </dd>
          </div>
        </dl>
        <Callout tone="maroon" title={`To graduate, you need IELTS band ${s.ielts_min_band}`}>
          Whichever route you take, IELTS band {s.ielts_min_band} or higher is a graduation requirement. IMAS prepares you for IELTS during the programme
          and arranges for you to sit the exam.
        </Callout>
      </Section>
    </Chapter>
  );
}
