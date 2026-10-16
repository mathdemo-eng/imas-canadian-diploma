import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import crest from '../assets/imas-mark.webp';
import nb from '../assets/nb-wordmark.webp';
import { CHAPTERS } from '../chapters';

/**
 * The guide as a closed book that opens on arrival: the cover swings over the spine
 * and becomes the inside cover, revealing the contents page.
 */
export function BookCover() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(Boolean(reduced));

  useEffect(() => {
    if (reduced) {
      setOpen(true);
      return;
    }
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [reduced]);

  const chapters = CHAPTERS.filter((c) => /^[IVX]+$/.test(c.numeral));

  return (
    <div className="relative mx-auto aspect-[1.45/1] w-full max-w-[600px]" style={{ perspective: 2000 }}>
      {/* page shadow under the spread */}
      <div aria-hidden className="absolute inset-x-6 -bottom-3 h-6 rounded-[50%] bg-ink/15 blur-xl" />

      {/* Right page: contents */}
      <nav
        aria-label="Guide contents"
        className="absolute inset-y-0 right-0 flex w-1/2 flex-col rounded-r-md border border-l-0 border-rule bg-sheet px-[6%] py-[6%]"
        style={{ boxShadow: 'inset 18px 0 24px -18px rgb(var(--shadow) / 0.25)' }}
      >
        <p className="font-display text-[clamp(1.1rem,2vw,1.6rem)] italic text-ink">Contents</p>
        <ol className="mt-[4%] grid flex-1 content-between">
          {chapters.map((c) => (
            <li key={c.path}>
              <Link
                to={c.path}
                className="group grid grid-cols-[1.8rem_1fr_auto] items-baseline gap-1 rounded py-0.5 text-[clamp(0.72rem,1.1vw,0.9rem)] leading-snug"
              >
                <span className="font-display italic text-ink-3">{c.numeral}</span>
                <span className="truncate font-semibold text-ink group-hover:text-blue">{c.short ?? c.title}</span>
                <ArrowRight size={13} aria-hidden className="text-ink-3 group-hover:text-blue" />
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      {/* The cover: front face over the right page, inside face lands on the left */}
      <motion.div
        className="absolute inset-y-0 left-1/2 w-1/2 cursor-pointer"
        style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
        initial={false}
        animate={{ rotateY: open ? -180 : 0 }}
        transition={{ duration: reduced ? 0 : 1.5, ease: [0.62, 0.02, 0.24, 1] }}
        onClick={() => setOpen(true)}
      >
        <div
          className="cover absolute inset-0 flex flex-col items-center justify-between rounded-r-md px-[8%] py-[9%] text-center"
          style={{ backfaceVisibility: 'hidden', boxShadow: 'inset 6px 0 10px -4px rgb(0 0 0 / 0.35)' }}
          aria-hidden={open}
        >
          <div className="grid justify-items-center gap-3">
            <span className="plate grid h-[clamp(3.5rem,8vw,5.5rem)] w-[clamp(3.5rem,8vw,5.5rem)] place-items-center rounded-full p-1.5">
              <img src={crest} alt="" className="h-full w-full object-contain" />
            </span>
            <span className="h-px w-16 bg-[var(--foil)]/50" />
          </div>
          <p className="font-display text-[clamp(1.1rem,2.3vw,1.9rem)] font-semibold leading-tight text-[var(--foil)]">
            Canadian
            <br />
            High School
            <br />
            Diploma
          </p>
          <p className="text-[clamp(0.6rem,0.9vw,0.72rem)] font-semibold uppercase tracking-[0.18em] text-[var(--foil)]/80">
            New Brunswick · IMAS
          </p>
        </div>

        <div
          className="absolute inset-0 flex flex-col justify-between rounded-l-md border border-r-0 border-rule bg-sheet-2 px-[8%] py-[8%]"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(var(--shadow) / 0.08) 1px, transparent 0), linear-gradient(var(--sheet-2), var(--sheet-2))',
            backgroundSize: '14px 14px, auto',
            boxShadow: 'inset -18px 0 24px -18px rgb(var(--shadow) / 0.25)',
          }}
        >
          <div className="grid gap-2 rounded-md border border-rule bg-sheet p-[8%]">
            <p className="t-label text-[0.62rem] text-maroon">Accredited offshore school</p>
            <p className="font-display text-[clamp(0.85rem,1.4vw,1.1rem)] font-semibold leading-snug">
              The New Brunswick High School Diploma, taught at IMAS International School, Malaysia.
            </p>
          </div>
          <div className="plate w-fit self-center px-3 py-2">
            <img src={nb} alt="New Brunswick, Canada" className="h-[clamp(1.6rem,3.2vw,2.5rem)] w-auto" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
