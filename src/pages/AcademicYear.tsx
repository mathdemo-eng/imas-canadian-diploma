import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Chapter } from '../components/Chapter';
import { YearBand } from '../components/charts';
import { Callout, Section } from '../components/ui';

export function AcademicYear() {
  return (
    <Chapter lede="Each academic year has two semesters. Semester 1 runs from September to February and Semester 2 from March to July.">
      <Section eyebrow="The year at a glance" title="Two semesters, September to July">
        <YearBand />
      </Section>

      <Section eyebrow="Inside a semester" title="How each semester is organised">
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ['Teaching and continuous assessment', 'Classes, assignments, end-of-chapter tests and your project build your continuous assessment mark.'],
            ['Revision', 'A revision period before the final examinations, to consolidate what you have learned.'],
            ['Final examinations', 'Each semester closes with final examinations, which make up 40% of each course.'],
          ].map(([t, d], i) => (
            <li key={t} className="grid content-start gap-2 rounded-xl border border-rule p-5">
              <span className="font-mono text-sm text-ink-3">Step {i + 1}</span>
              <p className="t-h3">{t}</p>
              <p className="text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
        <p className="measure text-ink-2">
          Courses run either for one semester or across both. Your <Link className="prose-link" to="/academic-plan">academic plan</Link> shows which.
        </p>
      </Section>

      <Section eyebrow="Grade 11, Semester 2" title="The Canadian Preparatory Program">
        <p className="measure text-ink-2">
          For CAN students, Semester 2 of Grade 11 is the Canadian Preparatory Program. Prep courses in English, mathematics, psychology, civics, world
          issues, kinesiology and visual arts get you ready for your Grade 12 Canadian subjects.
        </p>
      </Section>

      <Callout tone="forest" title="The detailed calendar">
        <span className="flex items-start gap-3">
          <CalendarClock size={20} aria-hidden className="mt-0.5 shrink-0 text-forest" />
          <span>
            A detailed calendar, with teaching weeks, holidays, revision and examination dates, is published at the start of every academic year. It will
            appear in the Student Portal.
          </span>
        </span>
      </Callout>
    </Chapter>
  );
}
