import { useReducedMotion } from 'framer-motion';
import { ExternalLink, Mail, Phone, Play, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CampusCinema, type CinemaView } from '../components/CampusCinema';
import { Chapter } from '../components/Chapter';
import { CopyText, ExternalButton, Section } from '../components/ui';
import { CAMPUS_FILMS } from '../content/campusFilms';
import { useSite } from '../content/useSite';
import { campuses, gmailEnquiryUrl, telHref, type Campus } from '../lib/contact';

export function Contact() {
  const { settings: s } = useSite();
  const list = campuses(s);
  const reduced = useReducedMotion();
  const [request, setRequest] = useState<{ view: CinemaView; n: number } | null>(null);
  const [showing, setShowing] = useState('');
  const [flash, setFlash] = useState<Campus['id'] | null>(null);
  const flashTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const onShowing = useCallback((ids: Campus['id'][]) => setShowing(ids.join(' ')), []);
  const watch = (id: Campus['id']) => setRequest((r) => ({ view: id, n: (r?.n ?? 0) + 1 }));
  // From the closing card of a film: bring that campus's admissions details into view.
  const contact = useCallback(
    (id: Campus['id']) => {
      const card = document.getElementById(`campus-card-${id}`);
      card?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      card?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
      setFlash(id);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(null), 2400);
    },
    [reduced],
  );

  return (
    <Chapter lede="Our admissions teams can talk you through pathways, entry requirements and fees for your entry year.">
      <Section
        eyebrow="Campus films"
        title="Two campuses, one soundtrack"
        intro={
          <p>
            Take a one-minute tour of each IMAS campus. The two films share the same music and length, so you can play them side by side and switch
            between campuses without missing a beat.
          </p>
        }
      >
        <CampusCinema request={request} onShowing={onShowing} onContact={contact} />
        <p className="text-sm text-ink-3">The films have music and no speech. Each campus card below lists what its film shows.</p>
      </Section>

      <Section
        eyebrow="Admissions"
        title="Speak to our team"
        intro={
          list.length > 1 ? (
            <p>IMAS has two campuses, each with its own admissions team. Contact the campus you would like to join.</p>
          ) : undefined
        }
      >
        <div className={`grid gap-6 ${list.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {list.map((c) => (
            <CampusCard
              key={c.id}
              campus={c}
              enquiryUrl={c.email ? gmailEnquiryUrl(s, c.email) : ''}
              showing={showing.split(' ').includes(c.id)}
              highlight={flash === c.id}
              onWatch={() => watch(c.id)}
            />
          ))}
        </div>
        <p className="text-sm text-ink-3">
          <strong className="font-semibold text-ink-2">Make an enquiry in Gmail</strong> opens a new message to that campus’s admissions team, ready for you to fill
          in and send. Using another email service? Copy the address instead.
        </p>
      </Section>

      <Section eyebrow="Before you get in touch" title="Helpful to have ready">
        <ul className="grid list-disc gap-2 pl-5 text-ink-2">
          <li>The campus you would like to join</li>
          <li>The grade you would join in (Grade 10 or Grade 11)</li>
          <li>Whether you are interested in CAN or the Dual Program, and in the Science or Commerce stream</li>
          <li>Your latest school report and any English test results</li>
        </ul>
      </Section>
    </Chapter>
  );
}

function CampusCard({
  campus: c,
  enquiryUrl,
  showing,
  highlight,
  onWatch,
}: {
  campus: Campus;
  enquiryUrl: string;
  showing: boolean;
  highlight: boolean;
  onWatch: () => void;
}) {
  const film = CAMPUS_FILMS[c.id];
  const label = (what: string) => `${c.short} admissions ${what}`;
  return (
    <article
      id={`campus-card-${c.id}`}
      aria-labelledby={`campus-${c.id}`}
      className={`flex flex-col overflow-hidden rounded-2xl border bg-sheet transition-[border-color,box-shadow] duration-500 ${
        showing || highlight ? 'border-blue shadow-[0_0_0_4px_var(--blue-tint)]' : 'border-rule'
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sheet-2 sm:aspect-[16/9]">
        <img src={film.poster} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04090f]/85 via-[#04090f]/30 to-transparent" />
        {showing && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-[#04090f]/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <span className="eq" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            Now showing
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 grid justify-items-start gap-3 p-5 sm:p-6">
          <div className="grid gap-0.5">
            <p className="t-label text-white/80">Campus</p>
            <h3 id={`campus-${c.id}`} tabIndex={-1} className="font-display text-[clamp(1.6rem,1.2vw+1.2rem,2rem)] font-semibold leading-[1.08] text-white">
              {c.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onWatch}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold shadow transition-transform hover:scale-[1.03]"
            style={{ color: '#0d2033' }}
          >
            <Play size={14} fill="currentColor" aria-hidden /> Watch the film<span className="sr-only"> of {c.name}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-6 sm:p-7">
        <dl className="grid gap-4">
          {c.phone && (
            <ContactRow icon={Phone} term="Phone">
              <CopyText value={c.phone} label={label('phone number')} />
              <a href={telHref(c.phone)} className="prose-link text-sm">
                Call
              </a>
            </ContactRow>
          )}
          {c.mobile && (
            <ContactRow icon={Smartphone} term="Mobile">
              <CopyText value={c.mobile} label={label('mobile number')} />
              <a href={telHref(c.mobile)} className="prose-link text-sm">
                Call
              </a>
            </ContactRow>
          )}
          {c.email && (
            <ContactRow icon={Mail} term="Email">
              <CopyText value={c.email} label={label('email')} />
            </ContactRow>
          )}
        </dl>

        <div className="grid gap-2">
          <p className="t-label text-ink-3">In the film</p>
          <ul className="flex flex-wrap gap-1.5" aria-label={`What the ${c.name} film shows`}>
            {film.inFilm.map((x) => (
              <li key={x} className="rounded-full border border-rule bg-sheet-2 px-2.5 py-0.5 text-[0.8rem] text-ink-2">
                {x}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-rule pt-5">
          {enquiryUrl && (
            <ExternalButton href={enquiryUrl} className="w-fit">
              Make an enquiry in Gmail <ExternalLink size={16} aria-hidden />
            </ExternalButton>
          )}
          {c.website && (
            <a href={c.website} target="_blank" rel="noreferrer" className="prose-link inline-flex items-center gap-1 font-semibold">
              {c.name} website <ExternalLink size={14} aria-hidden />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function ContactRow({ icon: Icon, term, children }: { icon: typeof Phone; term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="flex items-center gap-2 t-label text-ink-3">
        <Icon size={15} aria-hidden className="text-blue" /> {term}
      </dt>
      <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">{children}</dd>
    </div>
  );
}
