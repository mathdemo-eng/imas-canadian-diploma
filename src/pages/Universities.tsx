import { motion, useReducedMotion } from 'framer-motion';
import { ExternalLink, Flower2, HeartPulse, Info, Leaf, MapPin, Plane, Snowflake, Sun } from 'lucide-react';
import stuCampus from '../assets/photos/stu-campus.webp';
import { Chapter } from '../components/Chapter';
import { TimeBars } from '../components/charts';
import { MapleLeafIcon, MapleLeaves, ParallaxBanner, PhotoCaption } from '../components/media';
import { Callout, CopyText, Section } from '../components/ui';
import type { Partner } from '../content/types';
import { useSite } from '../content/useSite';

const EASE = [0.22, 0.8, 0.3, 1] as const;

const SEASONS = [
  {
    icon: Leaf,
    name: 'Autumn',
    months: 'September – November',
    text: 'Forests turn red, orange and gold. This is the season of the maple leaf, and the start of the university year.',
    art: 'linear-gradient(160deg, #f6c35b 0%, #e2702f 45%, #a8321f 100%)',
  },
  {
    icon: Snowflake,
    name: 'Winter',
    months: 'December – March',
    text: 'Snow-covered campuses, skating and skiing, then warm cafés and libraries.',
    art: 'linear-gradient(160deg, #f3f8fd 0%, #b9d7f0 50%, #5d8fc4 100%)',
  },
  {
    icon: Flower2,
    name: 'Spring',
    months: 'April – May',
    text: 'The snow melts, the days grow longer, and the academic year comes to a close.',
    art: 'linear-gradient(160deg, #e9f6d8 0%, #9fd38a 50%, #3f9a52 100%)',
  },
  {
    icon: Sun,
    name: 'Summer',
    months: 'June – August',
    text: 'Long sunny days on the Atlantic coast and the Bay of Fundy, home of the highest tides in the world.',
    art: 'linear-gradient(160deg, #fde9b8 0%, #7cc4e6 55%, #1f6fae 100%)',
  },
];

const CITIES = [
  {
    city: 'Fredericton',
    region: 'Capital of New Brunswick',
    home: 'St. Thomas University',
    points: [
      'Ranked the #2 city to live in Canada (Maclean’s, 2021)',
      'STU tuition includes a city-wide transit pass',
      'Internships and part-time work in a lively capital',
    ],
  },
  {
    city: 'Sackville',
    region: 'New Brunswick',
    home: 'Mount Allison University',
    points: [
      'A safe, welcoming small town surrounded by nature',
      'Downtown is a five-minute walk from campus',
      'An international airport less than 30 minutes away',
    ],
  },
  {
    city: 'Halifax',
    region: 'Capital of Nova Scotia',
    home: 'Saint Mary’s University',
    points: ['The largest city in Atlantic Canada', 'A historic waterfront on the Atlantic Ocean', 'Universities, festivals and city life'],
  },
];

export function Universities() {
  const { partners } = useSite();
  const reduced = useReducedMotion();
  const appear = (i: number) =>
    reduced
      ? {}
      : {
          initial: { y: 24, opacity: 0.3 },
          whileInView: { y: 0, opacity: 1 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.7, delay: i * 0.08, ease: EASE },
        };

  return (
    <Chapter lede="The diploma is recognised by universities across Canada and around the world. Graduates apply directly to Year 1 of a bachelor’s degree, and AEI’s partner universities in Atlantic Canada offer significant tuition savings.">
      <figure className="grid gap-2">
        <ParallaxBanner src={stuCampus} alt="George Martin Hall at St. Thomas University in autumn, Fredericton" sizeClass="aspect-[4/3] sm:aspect-[16/7]" position="50% 55%">
          <MapleLeaves count={18} />
          <PhotoCaption title="Study in Atlantic Canada" text="Autumn at St. Thomas University, Fredericton, New Brunswick." />
        </ParallaxBanner>
        <figcaption className="text-right text-xs text-ink-3">Photo: St. Thomas University</figcaption>
      </figure>

      <Section
        eyebrow="AEI partner universities"
        title="Tuition savings in Atlantic Canada"
        intro={
          <p>
            Atlantic Education International partners with three universities that offer tuition reductions to graduates of the New Brunswick programme.
            This advantage is not automatically available to other international students. All amounts are in Canadian dollars.
          </p>
        }
      >
        <ul className="grid gap-6">
          {partners.map((p, i) => (
            <motion.li
              key={p.id}
              className="grid overflow-hidden rounded-2xl border border-rule lg:grid-cols-[17rem_1fr]"
              {...appear(i)}
            >
              <PartnerVisual partner={p} tone={TONES[i % TONES.length]} />
              <div className="grid content-start gap-4 p-6 sm:p-8">
                <div className="grid gap-1">
                  <p className="t-label text-ink-3">{p.location}</p>
                  <h3 className="font-display text-[1.75rem] font-semibold leading-tight">{p.name}</h3>
                </div>
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl bg-forest-tint px-4 py-3">
                  <span className="font-display text-[2.1rem] font-semibold leading-none text-forest t-num">{p.figure}</span>
                  <span className="text-ink-2">{p.figure_label}</span>
                </p>
                <p className="text-ink-2">{p.summary}</p>
                <ul className="grid gap-2">
                  {p.highlights.map((h) => (
                    <li key={h} className="grid grid-cols-[1rem_1fr] gap-2">
                      <MapleLeafIcon size={12} className="mt-1.5 text-maroon" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                {p.eligibility_note && (
                  <p className="flex items-start gap-2 rounded-lg bg-maroon-tint px-4 py-3 text-sm text-ink-2">
                    <Info size={16} aria-hidden className="mt-0.5 shrink-0 text-maroon" />
                    {p.eligibility_note}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule pt-4 text-sm">
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noreferrer" className="prose-link inline-flex items-center gap-1">
                      Visit website <ExternalLink size={14} aria-hidden />
                    </a>
                  )}
                  {p.contact_email && (
                    <span className="inline-flex flex-wrap items-center gap-2 text-ink-2">
                      Admissions: <CopyText value={p.contact_email} label={`${p.name} admissions email`} />
                    </span>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      </Section>

      <Section
        eyebrow="Life in Atlantic Canada"
        title="Four seasons, one unforgettable experience"
        intro={<p>Atlantic Canada is a region of forests, coastline and close-knit university towns, with a real change of season every few months.</p>}
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SEASONS.map(({ icon: Icon, name, months, text, art }, i) => (
            <motion.li key={name} className="group grid content-start overflow-hidden rounded-2xl border border-rule bg-sheet" {...appear(i)}>
              <div aria-hidden className="relative grid h-28 place-items-center overflow-hidden" style={{ background: art }}>
                <Icon size={40} className="text-white drop-shadow-[0_2px_6px_rgb(0_0_0/0.25)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
              </div>
              <div className="grid gap-1 p-5">
                <p className="t-label text-ink-3">{months}</p>
                <p className="font-display text-2xl font-semibold">{name}</p>
                <p className="text-ink-2">{text}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Where you would live" title="Three university cities">
        <ul className="grid gap-4 md:grid-cols-3">
          {CITIES.map((c, i) => (
            <motion.li key={c.city} className="grid content-start gap-3 rounded-2xl bg-sheet-2 p-6" {...appear(i)}>
              <span className="flex items-center gap-2 text-forest">
                <MapPin size={18} aria-hidden />
                <span className="t-label">{c.region}</span>
              </span>
              <p className="font-display text-3xl font-semibold">{c.city}</p>
              <p className="text-sm text-ink-3">Home of {c.home}</p>
              <ul className="grid gap-2 text-ink-2">
                {c.points.map((pt) => (
                  <li key={pt} className="grid grid-cols-[1rem_1fr] gap-2">
                    <MapleLeafIcon size={12} className="mt-1.5 text-maroon" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </motion.li>
          ))}
        </ul>
      </Section>

      <Section
        eyebrow="Getting around"
        title="Close to the rest of Canada"
        intro={<p>Travel times from Sackville, home of Mount Allison University, as listed in Mount Allison’s guide for international students.</p>}
      >
        <div className="grid gap-8 rounded-2xl border border-rule p-6 md:grid-cols-2">
          <TimeBars
            title="Nearby"
            max={240}
            rows={[
              { place: 'Moncton', minutes: 30 },
              { place: 'Charlottetown', minutes: 90 },
              { place: 'Fredericton', minutes: 120 },
              { place: 'Halifax', minutes: 120 },
              { place: 'Saint John', minutes: 120 },
            ]}
          />
          <TimeBars
            title="Further afield"
            max={240}
            rows={[
              { place: 'Montreal', minutes: 82 },
              { place: 'Ottawa', minutes: 94 },
              { place: 'Toronto', minutes: 115 },
              { place: 'Boston', minutes: 210 },
              { place: 'New York', minutes: 235 },
            ]}
          />
        </div>
      </Section>

      <Section eyebrow="Studying in New Brunswick" title="Living in Canada">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid content-start gap-2 rounded-xl bg-sheet-2 p-6">
            <HeartPulse size={22} aria-hidden className="text-forest" />
            <p className="t-h3">Free provincial health cover</p>
            <p className="text-ink-2">
              New Brunswick provides Medicare coverage to international students who are enrolled full-time at a New Brunswick university or college.
            </p>
          </div>
          <div className="grid content-start gap-2 rounded-xl bg-sheet-2 p-6">
            <Plane size={22} aria-hidden className="text-forest" />
            <p className="t-h3">Staying after graduation</p>
            <p className="text-ink-2">
              The Atlantic Immigration Program lets graduates with a full-time job offer in an Atlantic province apply for permanent residency sooner.
            </p>
          </div>
        </div>
      </Section>

      <Section eyebrow="Beyond Canada" title="Direct entry worldwide">
        <p className="measure text-ink-2">
          Graduates apply directly to the first year of bachelor’s degrees at universities in Malaysia, the United Kingdom, the United States, Australia and
          beyond, with no foundation year. In Malaysia, the diploma is listed by MQA as an entry qualification for bachelor’s degree programmes.
        </p>
        <Callout tone="blue" title="Planning your applications">
          University requirements vary by course. Talk to your academic counsellor early about the subjects, grades and English scores your chosen
          universities ask for.
        </Callout>
      </Section>
    </Chapter>
  );
}

// Postcard colours, in turn: New Brunswick forest, maroon, IMAS blue.
const TONES = ['bg-forest', 'bg-maroon', 'bg-blue'] as const;

/** A campus photo when one has been added in the admin panel; otherwise a postcard from the university's city. */
function PartnerVisual({ partner: p, tone }: { partner: Partner; tone: (typeof TONES)[number] }) {
  const [city, ...rest] = p.location.split(',').map((x) => x.trim());
  if (p.image_url) {
    return (
      <figure className="relative min-h-56 bg-sheet-2 lg:min-h-full">
        <img src={p.image_url} alt={`${p.name} campus`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {p.image_credit && (
          <figcaption className="absolute bottom-2 right-2 rounded bg-black/55 px-2 py-0.5 text-xs text-white">{p.image_credit}</figcaption>
        )}
      </figure>
    );
  }
  return (
    <div className={`relative grid min-h-56 content-between gap-10 overflow-hidden p-6 text-sheet ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <span className="t-label opacity-85">Greetings from</span>
        <span className="grid h-16 w-14 shrink-0 place-items-center gap-0.5 rounded-sm border-2 border-dashed border-current/60 p-1 text-center">
          <MapleLeafIcon size={26} />
          <span className="font-mono text-[0.55rem] tracking-[0.1em]">CANADA</span>
        </span>
      </div>
      <div className="grid gap-1">
        <p className="font-display text-[2.6rem] font-semibold italic leading-none">{city}</p>
        <p className="text-sm opacity-90">{rest.join(', ')}</p>
      </div>
      <svg aria-hidden viewBox="0 0 200 40" className="pointer-events-none absolute -right-6 top-24 h-10 w-48 opacity-35" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M0 8 Q 25 0 50 8 T 100 8 T 150 8 T 200 8" />
        <path d="M0 20 Q 25 12 50 20 T 100 20 T 150 20 T 200 20" />
        <path d="M0 32 Q 25 24 50 32 T 100 32 T 150 32 T 200 32" />
      </svg>
    </div>
  );
}
