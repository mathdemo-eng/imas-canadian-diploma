import { BookOpenCheck, Globe2, Home as HomeIcon, Layers, LineChart, Users } from 'lucide-react';
import crest from '../assets/imas-mark.webp';
import nb from '../assets/nb-wordmark.webp';
import { Chapter } from '../components/Chapter';
import { Callout, Section } from '../components/ui';
import { useSite } from '../content/useSite';

export function Diploma() {
  const { settings: s } = useSite();

  const reasons = [
    {
      icon: LineChart,
      title: 'Continuous assessment',
      text: `${s.ca_weight}% of every course comes from coursework across the semester, so a single exam never decides your result.`,
    },
    {
      icon: BookOpenCheck,
      title: 'Straight to university',
      text: 'Graduates apply directly to Year 1 of a bachelor’s degree, with no foundation year in between.',
    },
    {
      icon: Globe2,
      title: 'Recognised worldwide',
      text: 'The diploma is accepted by universities in Canada, Malaysia, the UK, the US, Australia and beyond.',
    },
    {
      icon: HomeIcon,
      title: 'A Canadian education at home',
      text: 'The same diploma as students in Canada, without moving overseas: lower living costs and your family close by.',
    },
    {
      icon: Layers,
      title: 'Breadth as well as depth',
      text: 'Sciences and mathematics sit alongside humanities, creative arts, wellness and career-connected learning.',
    },
    {
      icon: Users,
      title: 'Support all the way',
      text: 'Academic mentors, personalised counselling, Parents’ Days and regular progress reports keep everyone informed.',
    },
  ];

  return (
    <Chapter lede="The New Brunswick High School Diploma is an official Canadian qualification. At IMAS you study the New Brunswick curriculum and graduate with the same diploma as students in Canada.">
      <Section eyebrow="What you graduate with" title="An official diploma from the Province of New Brunswick">
        <ul className="grid gap-4 md:grid-cols-3">
          {[
            ['The diploma', 'The New Brunswick High School Diploma, signed by the province’s Minister of Education. It is the same diploma awarded in New Brunswick.'],
            ['Your transcript', 'An official academic transcript that records every subject you studied from Grade 10 to Grade 12.'],
            ['Dual Program students', 'Students in the Dual Program (CAD) also receive the Cambridge IGCSE certificate: two qualifications from one journey.'],
          ].map(([t, d]) => (
            <li key={t} className="grid content-start gap-2 border-t-2 border-forest pt-4">
              <p className="t-h3">{t}</p>
              <p className="text-ink-2">{d}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        eyebrow="Who stands behind it"
        title="Accredited by New Brunswick through AEI"
        intro={
          <p>
            Atlantic Education International (AEI) is a government-owned agency of the Province of New Brunswick. Since 1995 it has been the only agency
            authorised to accredit schools around the world to teach the New Brunswick curriculum and award its diploma. More than 50 schools worldwide
            are accredited.
          </p>
        }
      >
        <div className="grid items-center gap-6 rounded-2xl border border-rule bg-sheet-2 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <div className="flex items-center gap-4">
            <span className="plate grid h-20 w-20 place-items-center rounded-full p-1.5">
              <img src={crest} alt="IMAS International School crest" className="h-full w-full object-contain" />
            </span>
            <span className="plate px-3 py-2">
              <img src={nb} alt="New Brunswick, Canada" className="h-12 w-auto" />
            </span>
          </div>
          <div className="grid gap-2">
            <p className="font-display text-2xl font-semibold leading-snug">IMAS is the first school in Malaysia accredited by New Brunswick.</p>
            <p className="text-ink-2">
              AEI inspects the programme at IMAS every year, and our teachers work with AEI’s education specialists to keep teaching and assessment at New
              Brunswick standards.
            </p>
          </div>
        </div>
      </Section>

      <Section eyebrow="Recognised in Malaysia" title="Approved by the Ministry of Education and listed by MQA">
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule md:grid-cols-2">
          <div className="grid content-start gap-2 bg-sheet p-6">
            <dt className="t-label text-ink-3">Ministry of Education Malaysia</dt>
            <dd className="text-ink-2">
              The Selangor State Education Department approved the Canadian High School Program at IMAS International School as a post-secondary course on
              10 December 2025 (institution registration <span className="font-mono text-ink">BUB4008</span>).
            </dd>
          </div>
          <div className="grid content-start gap-2 bg-sheet p-6">
            <dt className="t-label text-ink-3">Malaysian Qualifications Agency</dt>
            <dd className="text-ink-2">
              MQA’s list of entry qualifications for international students (December 2025) includes the High School Graduation Diploma (New Brunswick)
              for entry to bachelor’s degree programmes.
            </dd>
          </div>
        </dl>
        <Callout tone="forest" title="Malaysian students">
          Malaysian citizens also take the Ministry’s compulsory subjects: Bahasa Malaysia, Sejarah, and Pendidikan Islam or Pendidikan Moral.
        </Callout>
      </Section>

      <Section eyebrow="Why students choose it" title="What makes the Canadian Diploma different">
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map(({ icon: Icon, title, text }) => (
            <li key={title} className="grid content-start gap-2">
              <Icon size={24} aria-hidden className="text-blue" />
              <p className="t-h3">{title}</p>
              <p className="text-ink-2">{text}</p>
            </li>
          ))}
        </ul>
        <p className="measure text-sm text-ink-3">
          Canada’s schools rank among the strongest in the world for reading, mathematics and science in the OECD’s PISA assessments.
        </p>
      </Section>

      <Section eyebrow="About IMAS" title="A school with a rich history">
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <p className="measure text-ink-2">
            The International Modern Arabic School (IMAS) was founded in 2008 by the Alnoor Foundation. It blends the rigour of British international
            education with the cultural and spiritual depth of Arabic and Islamic studies. IMAS is a Google Reference School, with a Chromebook for every
            student, and is accredited by Cambridge Assessment International Education.
          </p>
          <dl className="grid grid-cols-2 gap-4">
            {[
              ['2008', 'Founded'],
              ['20,000+', 'Students served'],
              ['45+', 'Nationalities'],
              ['1:1', 'Chromebooks'],
            ].map(([v, l]) => (
              <div key={l} className="grid gap-0.5 border-l-2 border-blue pl-4">
                <dt className="text-sm text-ink-3">{l}</dt>
                <dd className="font-display text-3xl font-semibold text-ink t-num">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>
    </Chapter>
  );
}
