import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';

const EASE = [0.22, 0.8, 0.3, 1] as const;

/**
 * A photo that unfolds as it scrolls into view: the frame opens from a slight inset
 * while the picture settles from a gentle zoom. It is visible from the start, so
 * nothing is hidden if the animation never runs.
 */
export function RevealImage({
  src,
  alt,
  aspect = '3 / 2',
  position = 'center',
  caption,
  className = '',
  edge = false,
  children,
}: {
  src: string;
  alt: string;
  aspect?: string;
  position?: string;
  caption?: ReactNode;
  className?: string;
  /** A hairline edge, for photos whose corners are nearly white and would fade into the page. */
  edge?: boolean;
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <figure className={`grid gap-3 ${className}`}>
      <motion.div
        className="relative w-full max-w-full overflow-hidden rounded-2xl bg-sheet-2"
        style={{ aspectRatio: aspect }}
        initial={reduced ? false : { clipPath: 'inset(5% 5% 5% 5% round 24px)' }}
        whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 16px)' }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 1.1, ease: EASE }}
      >
        <motion.img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: position }}
          initial={reduced ? false : { scale: 1.14 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 1.6, ease: EASE }}
        />
        {edge && <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-ink/15" />}
        {children}
      </motion.div>
      {caption && <figcaption className="text-sm text-ink-3">{caption}</figcaption>}
    </figure>
  );
}

/** A wide banner photo that drifts slightly as the page scrolls. */
export function ParallaxBanner({
  src,
  alt,
  aspect = '21 / 9',
  position = 'center',
  sizeClass,
  children,
}: {
  src: string;
  alt: string;
  aspect?: string;
  position?: string;
  /** Tailwind aspect classes, e.g. "aspect-[4/3] sm:aspect-[2/1]", for a taller banner on phones. */
  sizeClass?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-7%', '7%']);
  return (
    <div
      ref={ref}
      className={`relative isolate w-full max-w-full overflow-hidden rounded-2xl bg-sheet-2 ${sizeClass ?? ''}`}
      style={sizeClass ? undefined : { aspectRatio: aspect }}
    >
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-x-0 -top-[8%] h-[116%] w-full object-cover"
        style={{ y, objectPosition: position }}
      />
      {children}
    </div>
  );
}

/** A dark band along the bottom of a photo so white captions stay readable. */
export function PhotoCaption({ title, text }: { title: string; text?: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 grid gap-1 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-5 pb-5 pt-16 sm:px-8 sm:pb-7">
      <p className="font-display text-[clamp(1.25rem,2.4vw,2rem)] font-semibold leading-tight text-white">{title}</p>
      {text && <p className="max-w-[60ch] text-[0.95rem] text-white/90">{text}</p>}
    </div>
  );
}

/**
 * A poster that floats gently, with a soft glow of its own colours behind it.
 * `glow` sets how strong the glow is (0–1).
 */
export function FloatingPoster({ src, alt, glow = 0.35 }: { src: string; alt: string; glow?: number }) {
  const reduced = useReducedMotion();
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div
        aria-hidden
        className="absolute inset-[6%] -z-0 rounded-[28px] blur-3xl"
        style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: glow }}
      />
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="relative w-full rounded-[22px] shadow-[0_24px_60px_-28px_rgb(var(--shadow)/0.55)] ring-1 ring-rule"
        initial={reduced ? false : { y: 16, scale: 0.98 }}
        whileInView={reduced ? undefined : { y: [0, -8, 0], scale: 1 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={reduced ? undefined : { y: { duration: 7, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 0.8, ease: EASE } }}
      />
    </div>
  );
}

// A simplified maple leaf, drawn in a unit box centred on 0,0 (stem pointing down).
const LEAF_RIGHT: [number, number][] = [
  [0, -1],
  [0.13, -0.62],
  [0.38, -0.76],
  [0.3, -0.34],
  [0.72, -0.5],
  [0.62, -0.2],
  [0.96, -0.06],
  [0.56, 0.18],
  [0.64, 0.42],
  [0.18, 0.32],
  [0.06, 0.56],
  [0.04, 0.96],
];
// Made on first use: Path2D exists only in browsers, and pages are also rendered at build time.
let leafPath: Path2D | null = null;
const leafShape = () =>
  (leafPath ??= new Path2D(
    [...LEAF_RIGHT, ...LEAF_RIGHT.slice().reverse().map(([x, y]) => [-x, y] as [number, number])]
      .map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`)
      .join(' ') + 'Z',
  ));
const LEAF_COLOURS = ['#c8102e', '#d9452b', '#e2702f', '#e9a23b', '#b8321e'];

const LEAF_D =
  [...LEAF_RIGHT, ...LEAF_RIGHT.slice().reverse().map(([x, y]) => [-x, y] as [number, number])]
    .map(([x, y], i) => `${i ? 'L' : 'M'}${(x * 12 + 12).toFixed(2)} ${(y * 12 + 12).toFixed(2)}`)
    .join(' ') + 'Z';

/** The same maple leaf as an icon (24 × 24), filled with the current text colour. */
export function MapleLeafIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <path d={LEAF_D} fill="currentColor" />
    </svg>
  );
}

/** Maple leaves drifting down over a photo. Pauses when off screen; still when motion is reduced. */
export function MapleLeaves({ count = 16 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const leaves = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: rand(9, 18),
      rot: rand(0, Math.PI * 2),
      spin: rand(-0.012, 0.012),
      fall: rand(0.0007, 0.0016),
      sway: rand(0.4, 1.2),
      phase: rand(0, Math.PI * 2),
      colour: LEAF_COLOURS[Math.floor(Math.random() * LEAF_COLOURS.length)],
      flip: rand(0, Math.PI * 2),
    }));

    function resize() {
      const r = canvas!.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
    }
    function draw(t: number) {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);
      for (const l of leaves) {
        const x = l.x * w + Math.sin(t / 1400 + l.phase) * 22 * l.sway;
        const y = l.y * h;
        ctx!.save();
        ctx!.translate(x, y);
        ctx!.rotate(l.rot);
        ctx!.scale(l.size * Math.max(0.35, Math.abs(Math.cos(t / 900 + l.flip))), l.size);
        ctx!.globalAlpha = 0.88;
        ctx!.fillStyle = l.colour;
        ctx!.fill(leafShape());
        ctx!.restore();
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    if (reduced) {
      draw(0);
      return () => ro.disconnect();
    }

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (visible) {
        for (const l of leaves) {
          l.y += l.fall * dt * 0.06;
          l.rot += l.spin * dt * 0.06;
          if (l.y > 1.08) {
            l.y = -0.08;
            l.x = Math.random();
          }
        }
        draw(now);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [count, reduced]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
