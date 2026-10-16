import { BookOpen, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CHAPTERS } from '../chapters';

/** The book's table of contents, opened from the header. */
export function ContentsMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full border border-rule-strong bg-sheet px-3 min-[420px]:px-4 text-[0.95rem] font-semibold text-ink hover:border-blue hover:text-blue"
      >
        {open ? <X size={18} aria-hidden /> : <BookOpen size={18} aria-hidden />}
        <span className="sr-only min-[420px]:not-sr-only">Contents</span>
      </button>

      {open && (
        <div
          id={panelId}
          className="fixed inset-x-0 top-[72px] z-50 max-h-[calc(100dvh-72px)] overflow-y-auto border-b border-rule bg-sheet shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[440px] sm:rounded-xl sm:border"
          style={{ paddingLeft: 'var(--gutter-l)', paddingRight: 'var(--gutter-r)' }}
        >
          <nav aria-label="Contents" className="py-4 sm:px-2">
            <p className="t-label mb-2 px-3 text-ink-3">Contents</p>
            <ol className="grid">
              {CHAPTERS.map((c) => {
                const here = c.path === pathname;
                return (
                  <li key={c.path}>
                    <Link
                      to={c.path}
                      aria-current={here ? 'page' : undefined}
                      className={`grid grid-cols-[2.5rem_1fr] items-baseline gap-x-2 rounded-lg px-3 py-2.5 ${here ? 'bg-blue-tint' : 'hover:bg-sheet-2'}`}
                    >
                      <span className="font-display text-lg italic text-ink-3 t-num">{c.numeral || '·'}</span>
                      <span className="min-w-0">
                        <span className={`block font-semibold ${here ? 'text-blue-deep' : 'text-ink'}`}>{c.title}</span>
                        <span className="block text-sm text-ink-3">{c.blurb}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      )}
    </div>
  );
}
