import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { CHAPTERS, chapterIndex } from '../chapters';
import { useAllContent } from '../content/hooks';
import { Footer } from './Footer';
import { Header } from './Header';

/** Keeps the outgoing page on screen while it turns. */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

// Forward: the current page turns away to the left around the spine, revealing the next.
// Back: the previous page swings in from the left and settles on top.
const turn: Variants = {
  initial: (dir: number) => (dir > 0 ? { opacity: 0, rotateY: 0, scale: 0.985 } : { opacity: 0.6, rotateY: -96, scale: 1 }),
  animate: { opacity: 1, rotateY: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 0.8, 0.3, 1] } },
  exit: (dir: number) =>
    dir > 0
      ? { rotateY: -96, opacity: 0.4, transition: { duration: 0.5, ease: [0.55, 0, 0.75, 0.3] } }
      : { opacity: 0, scale: 0.985, transition: { duration: 0.22 } },
};
const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  // Direction of travel through the book, derived during render so the turn starts right away.
  const [turnState, setTurnState] = useState({ path: location.pathname, dir: 1 });
  if (turnState.path !== location.pathname) {
    const dir = chapterIndex(location.pathname) >= chapterIndex(turnState.path) ? 1 : -1;
    setTurnState({ path: location.pathname, dir });
  }

  // ← and → turn the pages, unless the reader is typing or using a control.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select, [contenteditable="true"], [role="tablist"], [role="radiogroup"]') || t.isContentEditable)) return;
      const i = chapterIndex(location.pathname);
      if (i < 0) return;
      if (e.key === 'ArrowRight' && i < CHAPTERS.length - 1) navigate(CHAPTERS[i + 1].path);
      if (e.key === 'ArrowLeft' && i > 0) navigate(CHAPTERS[i - 1].path);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [location.pathname, navigate]);

  const { data, isError } = useAllContent();

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-blue focus:px-4 focus:py-2 focus:text-on-blue"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flip-stage flex-1 overflow-x-clip">
        {!data ? (
          <div className="gutter py-24 text-center text-ink-3" role="status">
            {isError ? 'The guide could not be loaded. Please refresh the page.' : 'Opening the guide…'}
          </div>
        ) : (
        <AnimatePresence mode="wait" custom={turnState.dir} initial={false} onExitComplete={() => window.scrollTo({ top: 0 })}>
          <motion.div
            key={location.pathname}
            custom={turnState.dir}
            variants={reduced ? fade : turn}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ transformOrigin: 'left center', backfaceVisibility: 'hidden' }}
          >
            <FrozenOutlet />
          </motion.div>
        </AnimatePresence>
        )}
      </main>
      <Footer />
    </div>
  );
}
