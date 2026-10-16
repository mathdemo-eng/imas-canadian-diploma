import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import mark from '../assets/imas-mark.webp';
import nb from '../assets/nb-wordmark.webp';
import skipsDark from '../assets/photos/skips-dark.webp';
import skipsLight from '../assets/photos/skips-light.webp';
import { CHAPTERS } from '../chapters';
import { useContent } from '../content/hooks';
import { gmailEnquiryUrl, SCHOOL_SITES } from '../lib/contact';
import { CopyText } from './ui';

const SKIPS_ALT = 'Quality Standards of Private Institution Malaysia (SKIPS), four stars, Ministry of Education Malaysia';

export function Footer() {
  const content = useContent();
  const s = content?.settings;
  return (
    <footer className="gutter mt-16 border-t border-rule bg-sheet">
      <div className="mx-auto grid max-w-[1180px] gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div className="grid content-start gap-5">
          <div className="flex items-center gap-3">
            <span className="mark-plate p-1">
              <img src={mark} alt="IMAS International School logo" width={56} height={60} className="h-[60px] w-auto object-contain" />
            </span>
            <p className="leading-tight">
              <span className="block text-sm font-extrabold uppercase tracking-[0.06em] text-blue">IMAS International School</span>
              <span className="block font-display text-xl font-semibold">Canadian Diploma</span>
              <span className="block text-sm text-ink-3">New Brunswick, Canada</span>
            </p>
          </div>
          <p className="measure text-ink-2">
            The first school in Malaysia accredited by New Brunswick, Canada. Approved by the Ministry of Education Malaysia.
          </p>
          <div className="grid gap-3">
            <p className="t-label text-ink-3">Accreditation & quality</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <span className="plate px-3 py-2">
                <img src={nb} alt="New Brunswick, Canada" width={140} height={60} className="h-11 w-auto" />
              </span>
              <span>
                <img src={skipsLight} alt={SKIPS_ALT} width={643} height={243} className="only-light h-[72px] w-auto" />
                <img src={skipsDark} alt={SKIPS_ALT} width={643} height={243} className="only-dark h-[72px] w-auto" />
              </span>
            </div>
          </div>
        </div>

        <nav aria-label="Chapters" className="grid content-start gap-2">
          <p className="t-label text-ink-3">The guide</p>
          <ul className="grid gap-1.5">
            {CHAPTERS.slice(1).map((c) => (
              <li key={c.path}>
                <Link to={c.path} className="text-ink-2 hover:text-blue">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid content-start gap-3">
          <p className="t-label text-ink-3">Admissions</p>
          {s && (
            <>
              <CopyText value={s.admissions_phone} label="admissions phone number" />
              <CopyText value={s.admissions_email} label="admissions email" />
              <a href={gmailEnquiryUrl(s)} target="_blank" rel="noreferrer" className="prose-link inline-flex w-fit items-center gap-1">
                Make an enquiry in Gmail <ExternalLink size={14} aria-hidden />
              </a>
              <p className="t-label mt-3 text-ink-3">IMAS websites</p>
              {SCHOOL_SITES(s).map((site) => (
                <a key={site.label} href={site.href} target="_blank" rel="noreferrer" className="prose-link inline-flex w-fit items-center gap-1">
                  {site.label} <ExternalLink size={14} aria-hidden />
                </a>
              ))}
            </>
          )}
        </div>
      </div>
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 border-t border-rule py-5 text-sm text-ink-3">
        <p>© {new Date().getFullYear()} IMAS International School. Managed and owned by Alnoor Foundation.</p>
        <Link to="/admin" className="hover:text-blue">
          Staff sign-in
        </Link>
      </div>
    </footer>
  );
}
