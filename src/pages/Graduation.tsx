import { BadgeCheck, BookMarked, Compass, Languages, Layers3, Percent } from 'lucide-react';
import { Chapter } from '../components/Chapter';
import { CreditBars } from '../components/charts';
import { ButtonLink, Section } from '../components/ui';
import { useSite } from '../content/useSite';

export function Graduation() {
  const { settings: s } = useSite();

  const requirements = [
    {
      icon: Layers3,
      title: `${s.total_credit_hours} credit-hours`,
      text: 'Complete courses worth at least 100 credit-hours across the required clusters. Each course is 4 credit-hours and 90 hours of teaching.',
    },
    { icon: Percent, title: `${s.pass_mark}% in every course`, text: 'Achieve a minimum grade of 60% in each course.' },
    {
      icon: BookMarked,
      title: `${s.grade12_credit_hours} credit-hours at Grade 12`,
      text: 'At least 24 New Brunswick credit-hours must come from Grade 12 level courses.',
    },
    {
      icon: Languages,
      title: `IELTS band ${s.ielts_min_band}`,
      text: `Reach IELTS band ${s.ielts_min_band} or higher. IMAS prepares you for IELTS and arranges for you to sit the exam.`,
    },
    {
      icon: Compass,
      title: 'Career Life Plan',
      text: 'Build and keep up to date a personalised Career Life Plan for the whole programme.',
    },
    {
      icon: BadgeCheck,
      title: 'National requirements',
      text: 'Complete the Ministry of Education Malaysia requirements. Malaysian students take Bahasa Malaysia, Sejarah, and Pendidikan Islam or Moral.',
    },
  ];

  return (
    <Chapter lede="Six requirements stand between you and the New Brunswick High School Diploma. Meet all of them and the diploma is issued once New Brunswick verifies your record.">
      <Section eyebrow="The checklist" title="What you need to graduate">
        <ol className="grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {requirements.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="grid content-start gap-2 bg-sheet p-6">
              <span className="flex items-center justify-between">
                <Icon size={24} aria-hidden className="text-forest" />
                <span className="font-mono text-sm text-ink-3">{String(i + 1).padStart(2, '0')}</span>
              </span>
              <p className="font-display text-2xl font-semibold leading-tight">{title}</p>
              <p className="text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="IELTS at IMAS" title={`How you reach IELTS band ${s.ielts_min_band}`}>
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ['Prepare', 'IMAS runs IELTS preparation as part of the programme, building your listening, reading, writing and speaking.'],
            ['Sit the exam', 'IMAS arranges for you to sit the IELTS exam, so you don’t have to organise it yourself.'],
            [`Reach band ${s.ielts_min_band}`, `A result of band ${s.ielts_min_band} or higher meets the English requirement for your diploma.`],
          ].map(([t, d], i) => (
            <li key={t} className="grid content-start gap-2 rounded-xl border border-rule p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-blue font-display text-lg font-semibold text-on-blue">{i + 1}</span>
              <p className="t-h3">{t}</p>
              <p className="text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        eyebrow="Credit-hours by cluster"
        title="How the 100 credit-hours are made up"
        intro={
          <p>
            New Brunswick groups courses into clusters, and each cluster has a minimum. The rest of the 100 credit-hours can come from any cluster,
            including transfer credits from your Grade 10 to 12 studies.
          </p>
        }
      >
        <CreditBars
          total={s.total_credit_hours}
          rows={[
            { label: 'Language Arts & Languages', hours: 24 },
            { label: 'Humanities', hours: 8 },
            { label: 'Sciences', hours: 8 },
            { label: 'Mathematics', hours: 12 },
            { label: 'Personalised Well-being', hours: 20 },
            { label: 'Creative Arts', hours: 4, indent: true, note: 'Part of Personalised Well-being' },
            { label: 'Wellness & Physical Education', hours: 4, indent: true, note: 'Part of Personalised Well-being' },
            { label: 'Career Connected Learning', hours: 4, indent: true, note: 'Part of Personalised Well-being' },
            { label: 'Your choice of the three above', hours: 8, indent: true, note: 'Part of Personalised Well-being' },
            { label: 'Other options', hours: 28, note: 'From any cluster' },
          ]}
        />
      </Section>

      <Section eyebrow="Plan ahead" title="Check your own plan">
        <p className="measure text-ink-2">
          Your academic plan already covers these requirements. Look through it semester by semester, and make the most of your IELTS preparation
          classes.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/academic-plan">See my academic plan</ButtonLink>
          <ButtonLink to="/student-hub" variant="secondary">
            Track my checklist
          </ButtonLink>
        </div>
      </Section>
    </Chapter>
  );
}
