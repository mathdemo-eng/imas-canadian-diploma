import { ExternalLink, Mail, Phone } from 'lucide-react';
import { Chapter } from '../components/Chapter';
import { CopyText, ExternalButton, Section } from '../components/ui';
import { useSite } from '../content/useSite';
import { gmailEnquiryUrl, SCHOOL_SITES } from '../lib/contact';

export function Contact() {
  const { settings: s } = useSite();
  return (
    <Chapter lede="Our admissions team can talk you through pathways, entry requirements and fees for your entry year.">
      <Section eyebrow="Admissions" title="Speak to our team">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid content-start gap-3 rounded-2xl border border-rule p-6">
            <Phone size={22} aria-hidden className="text-blue" />
            <p className="t-h3">Call admissions</p>
            <CopyText value={s.admissions_phone} label="admissions phone number" />
          </div>
          <div className="grid content-start gap-3 rounded-2xl border border-rule p-6">
            <Mail size={22} aria-hidden className="text-blue" />
            <p className="t-h3">Email admissions</p>
            <CopyText value={s.admissions_email} label="admissions email" />
            <ExternalButton href={gmailEnquiryUrl(s)} className="w-fit">
              Make an enquiry in Gmail <ExternalLink size={16} aria-hidden />
            </ExternalButton>
            <p className="text-sm text-ink-3">Opens a new Gmail message to our admissions team, ready for you to fill in and send. Using another email service? Copy the address above.</p>
          </div>
        </div>
      </Section>

      <Section eyebrow="Our schools" title="IMAS websites">
        <ul className="grid gap-4 sm:grid-cols-2">
          {SCHOOL_SITES(s).map((site) => (
            <li key={site.label}>
              <a
                href={site.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between gap-3 rounded-2xl border border-rule p-6 hover:border-blue"
              >
                <span className="grid gap-1">
                  <span className="font-display text-2xl font-semibold group-hover:text-blue">{site.label}</span>
                  <span className="font-mono text-sm text-ink-3">{site.href.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                </span>
                <ExternalLink size={20} aria-hidden className="shrink-0 text-ink-3 group-hover:text-blue" />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Before you get in touch" title="Helpful to have ready">
        <ul className="grid list-disc gap-2 pl-5 text-ink-2">
          <li>The grade you would join in (Grade 10 or Grade 11)</li>
          <li>Whether you are interested in CAN or the Dual Program, and in the Science or Commerce stream</li>
          <li>Your latest school report and any English test results</li>
        </ul>
      </Section>
    </Chapter>
  );
}
