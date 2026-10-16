import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'quiet';

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[0.975rem] font-semibold leading-tight transition-colors duration-150 min-h-11';
const BTN: Record<Variant, string> = {
  primary: `${BTN_BASE} bg-blue text-on-blue hover:bg-blue-deep`,
  secondary: `${BTN_BASE} border border-rule-strong bg-sheet text-ink hover:border-blue hover:text-blue`,
  quiet: `${BTN_BASE} px-2 text-blue hover:underline underline-offset-4`,
};

export function ButtonLink({ to, variant = 'primary', children, className = '' }: { to: string; variant?: Variant; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={`${BTN[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function ExternalButton({ href, variant = 'primary', children, className = '' }: { href: string; variant?: Variant; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`${BTN[variant]} ${className}`}>
      {children}
    </a>
  );
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`t-label text-blue ${className}`}>{children}</p>;
}

/** A titled section inside a chapter. */
export function Section({ id, eyebrow, title, intro, children }: { id?: string; eyebrow?: string; title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section id={id} className="grid gap-6 scroll-mt-24">
      <div className="grid gap-3">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="t-h2">{title}</h2>
        {intro && <div className="measure text-ink-2">{intro}</div>}
      </div>
      {children}
    </section>
  );
}

type Tone = 'blue' | 'forest' | 'maroon' | 'green';
const TONE: Record<Tone, string> = {
  blue: 'bg-blue-tint border-blue',
  forest: 'bg-forest-tint border-forest',
  maroon: 'bg-maroon-tint border-maroon',
  green: 'bg-green-tint border-green',
};

export function Callout({ tone = 'blue', title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <div className={`rounded-r-lg border-l-4 px-5 py-4 ${TONE[tone]}`}>
      {title && <p className="t-h3 mb-1">{title}</p>}
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'blue' | 'green' | 'forest' | 'maroon' }) {
  const tones = {
    neutral: 'bg-sheet-2 text-ink-2 border-rule',
    blue: 'bg-blue-tint text-blue-deep border-transparent',
    green: 'bg-green-tint text-green-ink border-transparent',
    forest: 'bg-forest-tint text-forest border-transparent',
    maroon: 'bg-maroon-tint text-maroon border-transparent',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.8rem] font-semibold leading-5 whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Shows a phone number or email as selectable text with a copy button. */
export function CopyText({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [id] = useState(() => `copy-${label.toLowerCase().replace(/\W+/g, '-')}`);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const el = document.getElementById(id);
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span id={id} className="select-all font-semibold t-num">
        {value}
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1 rounded-full border border-rule px-2.5 py-1 text-sm text-ink-2 hover:border-blue hover:text-blue"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  );
}
