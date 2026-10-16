import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CHAPTERS, chapterIndex, chapterLabel } from '../chapters';

/** One chapter of the book, printed on its own sheet. */
export function Chapter({ lede, children }: { lede?: ReactNode; children: ReactNode }) {
  // The chapter's own address, kept while the page turns away to a page that isn't a chapter (such as the portal).
  const [pathname] = useState(useLocation().pathname);
  const i = chapterIndex(pathname);
  const c = CHAPTERS[i] ?? { path: pathname, title: '', numeral: '', blurb: '' };

  return (
    <div className="gutter py-6 sm:py-10">
      <article className="sheet mx-auto max-w-[1120px] px-5 py-10 sm:px-10 sm:py-14 lg:px-16">
        <header className="relative mb-12 grid gap-4 border-b border-rule pb-10">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-4 right-0 select-none font-display text-[clamp(4.5rem,11vw,9rem)] italic leading-none text-rule"
          >
            {c.numeral}
          </span>
          <p className="t-label relative text-blue">{chapterLabel(c)}</p>
          <h1 className="t-h1 relative max-w-[20ch]">{c.title}</h1>
          {lede && <div className="t-lede measure relative">{lede}</div>}
        </header>
        <div className="grid gap-16">{children}</div>
        <ChapterNav index={i} />
      </article>
    </div>
  );
}

function ChapterNav({ index }: { index: number }) {
  const prev = index > 0 ? CHAPTERS[index - 1] : null;
  const next = index < CHAPTERS.length - 1 ? CHAPTERS[index + 1] : null;
  return (
    <nav aria-label="Turn the page" className="mt-20 grid gap-3 border-t border-rule pt-8 sm:grid-cols-2">
      {prev ? (
        <Link to={prev.path} className="group grid gap-1 rounded-xl border border-rule p-5 hover:border-blue">
          <span className="t-label flex items-center gap-2 text-ink-3">
            <ArrowLeft size={14} aria-hidden /> Previous
          </span>
          <span className="font-display text-xl font-semibold group-hover:text-blue">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={next.path} className="group grid gap-1 rounded-xl border border-rule p-5 text-right hover:border-blue">
          <span className="t-label flex items-center justify-end gap-2 text-ink-3">
            Next <ArrowRight size={14} aria-hidden />
          </span>
          <span className="font-display text-xl font-semibold group-hover:text-blue">{next.title}</span>
        </Link>
      )}
      <p className="hidden text-center text-sm text-ink-3 sm:col-span-2 sm:block">
        Tip: use the <kbd className="font-mono">←</kbd> and <kbd className="font-mono">→</kbd> keys to turn the pages.
      </p>
    </nav>
  );
}
