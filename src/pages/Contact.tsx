import { ExternalLink, Mail, MapPin, Phone, Smartphone } from 'lucide-react';
import { Chapter } from '../components/Chapter';
import { CopyText, ExternalButton, Section } from '../components/ui';
import { useSite } from '../content/useSite';
import { campuses, gmailEnquiryUrl, telHref, type Campus } from '../lib/contact';

export function Contact() {
  const { settings: s } = useSite();
  const list = campuses(s);
  return (
    <Chapter lede="Our admissions teams can talk you through pathways, entry requirements and fees for your entry year.">
      <Section
        eyebrow="Admissions"
        title="Speak to our team"
        intro={
          list.length > 1 ? (
            <p>IMAS has two campuses, each with its own admissions team. Contact the campus you would like to join.</p>
          ) : undefined
        }
      >
        <div className={`grid gap-5 ${list.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {list.map((c) => (
            <CampusCard key={c.id} campus={c} enquiryUrl={c.email ? gmailEnquiryUrl(s, c.email) : ''} />
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

function CampusCard({ campus: c, enquiryUrl }: { campus: Campus; enquiryUrl: string }) {
  const accent = c.id === 'kl' ? 'border-t-forest' : 'border-t-blue';
  const label = (what: string) => `${c.short} admissions ${what}`;
  return (
    <article aria-labelledby={`campus-${c.id}`} className={`flex flex-col gap-5 rounded-2xl border border-t-4 border-rule ${accent} bg-sheet p-6 sm:p-7`}>
      <header className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="t-label text-ink-3">Campus</p>
          <h3 id={`campus-${c.id}`} className="font-display text-3xl font-semibold leading-tight">
            {c.name}
          </h3>
        </div>
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-tint text-blue">
          <MapPin size={20} />
        </span>
      </header>

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
