import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, GraduationCap, Landmark, ShieldCheck, Stamp } from 'lucide-react';
import { Link } from 'react-router-dom';
import nb from '../assets/nb-wordmark.webp';
import graduation from '../assets/photos/graduation.webp';
import studentsHero from '../assets/photos/students-hero.webp';
import { CHAPTERS } from '../chapters';
import { BookCover } from '../components/BookCover';
import { RevealImage } from '../components/media';
import { ButtonLink, Eyebrow } from '../components/ui';
import { useSite } from '../content/useSite';

const EASE = [0.22, 0.8, 0.3, 1] as const;

export function Home() {
  const { settings: s, partners } = useSite();
  const reduced = useReducedMotion();

  // Hero text rises in line by line, starting from a visible state.
  const rise = (i: number) =>
    reduced
      ? {}
      : { initial: { opacity: 0.25, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.15 + i * 0.12, ease: EASE } };

  const glance = [
    { value: '2 years', label: 'Minimum programme', note: 'Join in Grade 10 or Grade 11' },
    { value: String(s.total_credit_hours), label: 'Credit-hours to graduate', note: 'Each course is 4 credit-hours' },
    { value: `Band ${s.ielts_min_band}`, label: 'IELTS to graduate', note: 'IMAS prepares you and arranges the exam' },
    { value: `${s.ca_weight} / ${s.exam_weight}`, label: 'Coursework / final exam', note: 'No midterm examinations' },
  ];

  const recognition = [
    { icon: Landmark, title: 'Ministry of Education Malaysia', text: 'Approved as a post-secondary Canadian High School Program (December 2025).' },
    {
      icon: ShieldCheck,
      title: 'Malaysian Qualifications Agency',
      text: 'The New Brunswick High School Graduation Diploma is listed as an entry qualification for bachelor’s degrees.',
    },
    { icon: Stamp, title: 'New Brunswick, Canada', text: 'IMAS is an accredited offshore school, inspected every year by Atlantic Education International (AEI).' },
    { icon: GraduationCap, title: 'First in Malaysia', text: 'IMAS is the first school in Malaysia accredited to teach the New Brunswick programme.' },
  ];

  return (
    <div>
      {/* Hero: our students behind the headline */}
      <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
        <div aria-hidden className="absolute inset-x-0 top-0 -z-20 h-[300px] overflow-hidden sm:inset-0 sm:h-auto">
          <motion.img
            src={studentsHero}
            alt=""
            className="kenburns h-full w-full object-cover object-[62%_28%]"
            initial={reduced ? false : { scale: 1.14, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2.2, ease: EASE }}
          />
        </div>
        {/* Wash: from the page colour behind the text to clear over the students */}
        <div aria-hidden className="hero-wash absolute inset-0 -z-10" />
        <div className="gutter">
          <div className="mx-auto grid max-w-[1180px] gap-6 pb-14 pt-[300px] sm:min-h-[600px] sm:content-center sm:pb-20 sm:pt-20">
            <motion.div {...rise(0)}>
              <Eyebrow>New Brunswick High School Diploma · Malaysia</Eyebrow>
            </motion.div>
            <motion.h1 id="hero-title" className="t-display max-w-[15ch]" {...rise(1)}>
              {s.hero_title}
            </motion.h1>
            <motion.p className="t-lede max-w-[34rem]" {...rise(2)}>
              {s.hero_lede}
            </motion.p>
            <motion.div className="flex flex-wrap gap-3" {...rise(3)}>
              <ButtonLink to="/diploma">
                Start reading <ArrowRight size={18} aria-hidden />
              </ButtonLink>
              <ButtonLink to="/student-hub" variant="secondary">
                I’m a current student
              </ButtonLink>
            </motion.div>
          </div>
        </div>
      </section>

      {/* At a glance */}
      <section className="gutter" aria-labelledby="glance-title">
        <div className="mx-auto max-w-[1180px] rounded-2xl border border-rule bg-sheet">
          <h2 id="glance-title" className="t-label px-6 pt-6 text-ink-3">
            The programme at a glance
          </h2>
          <dl className="grid sm:grid-cols-2 lg:grid-cols-4">
            {glance.map((g, i) => (
              <div
                key={g.label}
                className={`grid gap-1 border-rule px-6 py-6 ${i > 0 ? 'border-t sm:border-t-0' : ''} ${i % 2 === 1 ? 'sm:border-l' : ''} ${i >= 2 ? 'sm:border-t lg:border-t-0' : ''} ${i > 0 ? 'lg:border-l' : ''}`}
              >
                <dt className="order-2 font-semibold text-ink">{g.label}</dt>
                <dd className="order-1 font-display text-[2.4rem] font-semibold leading-none text-blue t-num">{g.value}</dd>
                <dd className="order-3 text-sm text-ink-3">{g.note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The guide itself, as a book */}
      <section className="gutter py-16" aria-labelledby="guide-title">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4">
            <Eyebrow>Inside this guide</Eyebrow>
            <h2 id="guide-title" className="t-h2">
              Eight chapters, from what the diploma is to where it can take you.
            </h2>
            <p className="measure text-ink-2">
              Read it like a book: open a chapter from the contents, or turn the pages with the Previous and Next buttons and the ← → keys.
            </p>
          </div>
          <div className="hidden sm:block">
            <BookCover />
          </div>
          <MobileContents />
        </div>
      </section>

      {/* Two ways in */}
      <section className="gutter pb-16">
        <div className="mx-auto grid max-w-[1180px] gap-5 md:grid-cols-2">
          <div className="grid content-between gap-6 rounded-2xl bg-blue p-8 text-on-blue">
            <div className="grid gap-3">
              <p className="t-label opacity-80">New to the programme</p>
              <h2 className="t-h2">Find out what the diploma is and which pathway suits you.</h2>
              <p className="opacity-90">Read the guide from the start, or jump to the pathways and compare CAN with the Dual Program.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/diploma" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sheet px-5 font-semibold text-blue-deep hover:bg-blue-tint">
                Chapter I: The Diploma
              </Link>
              <Link to="/pathways" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-on-blue/50 px-5 font-semibold hover:bg-on-blue/10">
                Compare pathways
              </Link>
            </div>
          </div>
          <div className="grid content-between gap-6 rounded-2xl border border-rule bg-sheet p-8">
            <div className="grid gap-3">
              <p className="t-label text-green-ink">Current students</p>
              <h2 className="t-h2">Review your subjects, your requirements and what comes next.</h2>
              <p className="text-ink-2">See your plan semester by semester, check what you need to graduate, and read the latest announcements.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/student-hub">Open Student Hub</ButtonLink>
              <ButtonLink to="/academic-plan" variant="secondary">
                My academic plan
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="gutter pb-16" aria-labelledby="journey-title">
        <div className="mx-auto grid max-w-[1180px] gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-2">
              <Eyebrow>The journey</Eyebrow>
              <h2 id="journey-title" className="t-h2">
                Three years from Grade 10, or two from Grade 11.
              </h2>
            </div>
            <ButtonLink to="/pathways" variant="quiet">
              See both pathways <ArrowRight size={16} aria-hidden />
            </ButtonLink>
          </div>
          <ol className="grid gap-3 sm:grid-cols-5">
            {[
              { k: 'Grade 10', t: 'Entry point', d: 'Three-year programme' },
              { k: 'Grade 11', t: 'Entry point', d: 'Two-year programme' },
              { k: 'Grade 12', t: 'Final year', d: 'Grade 12 Canadian courses' },
              { k: 'Diploma', t: 'Graduation', d: 'New Brunswick High School Diploma' },
              { k: 'University', t: 'Next step', d: 'Direct entry to Year 1' },
            ].map((step, i) => (
              <li key={step.k} className="relative grid gap-1 rounded-xl border border-rule bg-sheet p-5">
                <span className="t-label text-ink-3">{step.t}</span>
                <span className={`font-display text-2xl font-semibold ${i === 3 ? 'text-maroon' : 'text-ink'}`}>{step.k}</span>
                <span className="text-sm text-ink-2">{step.d}</span>
                {i < 4 && (
                  <ArrowRight
                    size={18}
                    aria-hidden
                    className="absolute -right-[15px] top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-ground text-ink-3 sm:block"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Graduation */}
      <section className="gutter pb-16" aria-labelledby="graduation-title">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
          <RevealImage src={graduation} alt="IMAS graduates in caps and gowns celebrating together" aspect="3 / 2" position="50% 35%" />
          <div className="grid gap-4">
            <Eyebrow>Graduation day</Eyebrow>
            <h2 id="graduation-title" className="t-h2">
              Every route ends with a diploma, and a choice of universities.
            </h2>
            <p className="measure text-ink-2">
              Graduates receive the official New Brunswick High School Diploma and apply directly to Year 1 of a bachelor’s degree in Malaysia, Canada and
              around the world. Dual Program graduates also hold the Cambridge IGCSE.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/graduation">What you need to graduate</ButtonLink>
              <ButtonLink to="/universities" variant="secondary">
                Where you can go next
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Recognition */}
      <section className="gutter bg-sheet py-16" aria-labelledby="recognition-title">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="grid content-start gap-4">
            <Eyebrow>Recognition</Eyebrow>
            <h2 id="recognition-title" className="t-h2">
              Recognised in Malaysia and awarded by Canada.
            </h2>
            <p className="measure text-ink-2">
              Graduates receive the official New Brunswick High School Diploma, signed by the province’s Minister of Education. It is the same diploma
              awarded to students in New Brunswick.
            </p>
            <div className="plate w-fit px-4 py-3">
              <img src={nb} alt="New Brunswick, Canada" width={170} height={72} className="h-14 w-auto" />
            </div>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2">
            {recognition.map(({ icon: Icon, title, text }) => (
              <li key={title} className="grid content-start gap-2 bg-sheet p-6">
                <Icon size={22} aria-hidden className="text-forest" />
                <p className="t-h3">{title}</p>
                <p className="text-ink-2">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Universities */}
      <section className="gutter py-16" aria-labelledby="unis-title">
        <div className="mx-auto grid max-w-[1180px] gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-2">
              <Eyebrow>After graduation</Eyebrow>
              <h2 id="unis-title" className="t-h2">
                Tuition savings at AEI’s partner universities in Canada.
              </h2>
            </div>
            <ButtonLink to="/universities" variant="quiet">
              Universities & scholarships <ArrowRight size={16} aria-hidden />
            </ButtonLink>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {partners.map((p) => (
              <li key={p.id} className="grid content-start gap-2 rounded-xl border border-rule bg-sheet p-6">
                <p className="font-display text-[2rem] font-semibold leading-none text-forest t-num">{p.figure}</p>
                <p className="text-sm text-ink-2">{p.figure_label}</p>
                <p className="mt-2 font-semibold">{p.name}</p>
                <p className="text-sm text-ink-3">{p.location}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

/** On phones the book is replaced by a plain contents list. */
function MobileContents() {
  return (
    <nav aria-label="Guide contents" className="rounded-2xl border border-rule bg-sheet p-5 sm:hidden">
      <p className="font-display text-xl italic">Contents</p>
      <ol className="mt-3 grid">
        {CHAPTERS.filter((c) => /^[IVX]+$/.test(c.numeral)).map((c) => (
          <li key={c.path} className="border-t border-rule first:border-t-0">
            <Link to={c.path} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 py-3">
              <span className="font-display italic text-ink-3">{c.numeral}</span>
              <span className="font-semibold">{c.short ?? c.title}</span>
              <ArrowRight size={16} aria-hidden className="text-ink-3" />
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
