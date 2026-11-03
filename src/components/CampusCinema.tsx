import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeftRight, LoaderCircle, MapPin, Maximize2, Minimize2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { BEAT, CAMPUS_FILMS, FILM_ORDER, FILM_SECONDS, type CampusFilm } from '../content/campusFilms';
import { beatPulse, followerCorrection, formatTime } from '../lib/filmSync';

type Id = CampusFilm['id'];
/** One campus on its own, or both side by side. */
export type CinemaView = Id | 'both';

const other = (id: Id): Id => (id === 'kl' ? 'selangor' : 'kl');
const onScreen = (v: CinemaView): Id[] => (v === 'both' ? FILM_ORDER : [v]);
const LENGTH = formatTime(FILM_SECONDS);
/** Width (desktop) or height (phone) of the strip that the other campus folds into. */
const STRIP = { wide: 72, narrow: 52 };
const GAP = 3;
/** Panes widen and fold with a CSS transition (switched off when motion is reduced). */
const SIZE_EASE = 'transition-[flex-grow,flex-basis] duration-[650ms] ease-[cubic-bezier(0.22,0.8,0.3,1)]';
// The screen is always dark, whatever the page theme, so its colours are fixed.
const NIGHT = '#04090f';
const INK = '#0d2033';

const VIEWS: { v: CinemaView; short: string; long: string }[] = [
  { v: FILM_ORDER[0], short: CAMPUS_FILMS[FILM_ORDER[0]].place, long: CAMPUS_FILMS[FILM_ORDER[0]].place },
  { v: 'both', short: 'Both', long: 'Side by side' },
  { v: FILM_ORDER[1], short: FILM_ORDER[1] === 'kl' ? 'KL' : CAMPUS_FILMS[FILM_ORDER[1]].place, long: CAMPUS_FILMS[FILM_ORDER[1]].place },
];

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/** True when the visitor has asked their browser to save data. */
function useSaveData() {
  const [save, setSave] = useState(false);
  useEffect(() => setSave(!!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData), []);
  return save;
}

/**
 * The campus films: two short films with one soundtrack, shown as a split screen.
 * Before anything plays, each half shows a silent preview of its campus. Visitors can watch one
 * campus, or both side by side in time, and switch campus mid-film without the music stopping.
 */
export function CampusCinema({
  request,
  onShowing,
  onContact,
}: {
  /** Starts a film from elsewhere on the page (the admissions cards). `n` makes each request new. */
  request?: { view: CinemaView; n: number } | null;
  /** The campuses on screen while a film plays (empty when nothing is playing). */
  onShowing?: (ids: Id[]) => void;
  /** "Contact" on the closing card. */
  onContact?: (id: Id) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const wide = useMediaQuery('(min-width: 640px)');
  const saveData = useSaveData();

  const [view, setView] = useState<CinemaView>('both');
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hover, setHover] = useState<Id | null>(null);
  const [previewsOn, setPreviewsOn] = useState(true);
  const [inView, setInView] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [size, setSize] = useState({ width: 0, shellHeight: 0, controls: 0 });

  const shellRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const films = useRef<Record<Id, HTMLVideoElement | null>>({ kl: null, selangor: null });
  const loops = useRef<Record<Id, HTMLVideoElement | null>>({ kl: null, selangor: null });
  /** The film whose sound is heard (and whose clock the other follows) when both play. */
  const lead = useRef<Id>(FILM_ORDER[0]);
  /** Side by side: films waiting for data, and films paused to wait for them. */
  const stalled = useRef(new Set<Id>());
  const held = useRef(new Set<Id>());
  // The latest state, for media events that fire between renders.
  const live = useRef({ view, playing, muted });
  live.current = { view, playing, muted };

  const leadOf = (v: CinemaView) => (v === 'both' ? lead.current : v);
  const now = () => films.current[leadOf(live.current.view)]?.currentTime ?? 0;

  /** Moves the timeline, beat pulse and clock without re-rendering (called every frame while playing). */
  const paint = useCallback((t: number, pulse = 0) => {
    const tl = timelineRef.current;
    tl?.style.setProperty('--p', Math.min(1, Math.max(0, t / FILM_SECONDS)).toFixed(4));
    tl?.style.setProperty('--beat', pulse.toFixed(3));
    const r = rangeRef.current;
    if (r && !dragging.current) r.value = String(t);
    r?.setAttribute('aria-valuetext', `${formatTime(t)} of ${LENGTH}`);
    if (clockRef.current) clockRef.current.textContent = formatTime(t);
  }, []);

  /** Shows a view at time t, and plays it if asked. */
  const arrange = useCallback(
    async (v: CinemaView, t: number, play: boolean) => {
      if (v !== 'both') lead.current = v;
      const ids = onScreen(v);
      const leadId = v === 'both' ? lead.current : v;
      stalled.current.clear();
      held.current.clear();
      setBuffering(false);
      setView(v);
      for (const id of FILM_ORDER) {
        const el = films.current[id];
        if (!el) continue;
        if (ids.includes(id)) {
          el.preload = 'auto';
          if (Math.abs(el.currentTime - t) > 0.05) {
            try {
              el.currentTime = t;
            } catch {
              /* not loaded yet: it starts from t once it loads */
            }
          }
          el.muted = live.current.muted || id !== leadId;
          el.playbackRate = 1;
        } else {
          el.pause();
          el.muted = true;
        }
      }
      paint(t);
      if (!play) {
        ids.forEach((id) => films.current[id]?.pause());
        setPlaying(false);
        return;
      }
      setPlaying(true);
      setFailed(false);
      const results = await Promise.all(ids.map((id) => films.current[id]?.play().then(() => null, (e: unknown) => e)));
      const err = results.find((e) => e instanceof DOMException && e.name !== 'AbortError') as DOMException | undefined;
      if (err?.name === 'NotAllowedError') {
        // The browser would not start with sound: start muted instead.
        setMuted(true);
        ids.forEach((id) => {
          const el = films.current[id];
          if (el) el.muted = true;
        });
        await Promise.all(ids.map((id) => films.current[id]?.play().catch(() => undefined)));
      } else if (err) {
        setFailed(true);
        setPlaying(false);
      }
    },
    [paint],
  );

  const start = (v: CinemaView, from?: number) => {
    const t = from ?? (started && !ended ? now() : 0);
    setStarted(true);
    setEnded(false);
    setHover(null);
    void arrange(v, t, true);
  };
  const startRef = useRef(start);
  startRef.current = start;

  /** Picks what to show: before playing it changes the layout; while playing it keeps the music going. */
  const choose = (v: CinemaView) => {
    if (v === view) return;
    if (!started) {
      if (v !== 'both') lead.current = v;
      setView(v);
      return;
    }
    if (ended) {
      setEnded(false);
      void arrange(v, 0, false);
      return;
    }
    void arrange(v, now(), playing);
  };

  const togglePlay = () => {
    if (!started || ended || failed) return start(view, ended || failed ? 0 : undefined);
    if (playing) {
      onScreen(view).forEach((id) => films.current[id]?.pause());
      setPlaying(false);
      paint(now());
    } else {
      void arrange(view, now(), true);
    }
  };

  const seek = (t: number) => {
    onScreen(view).forEach((id) => {
      const el = films.current[id];
      if (el) el.currentTime = t;
    });
    if (ended) setEnded(false);
    paint(t);
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    const el = films.current[leadOf(view)];
    if (el) el.muted = m;
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    const shell = shellRef.current;
    if (document.fullscreenEnabled && shell?.requestFullscreen) {
      void shell.requestFullscreen().catch(() => undefined);
      return;
    }
    // iPhone: only a video can go full screen.
    if (!started) start(view);
    (films.current[leadOf(view)] as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null)?.webkitEnterFullscreen?.();
  };

  // Media events
  const onEnded = (id: Id) => {
    const s = live.current;
    if (id !== leadOf(s.view)) return;
    onScreen(s.view).forEach((i) => films.current[i]?.pause());
    setPlaying(false);
    setEnded(true);
    paint(FILM_SECONDS);
  };
  // Side by side, a film that runs out of data holds the other one; when neither is waiting, both carry on together.
  const onWaiting = (id: Id) => {
    const s = live.current;
    if (!s.playing || !onScreen(s.view).includes(id)) return;
    setBuffering(true);
    if (s.view !== 'both') return;
    stalled.current.add(id);
    const o = films.current[other(id)];
    if (o && !o.paused) {
      o.pause();
      held.current.add(other(id));
    }
  };
  const onReady = (id: Id) => {
    stalled.current.delete(id);
    if (stalled.current.size) return;
    setBuffering(false);
    const s = live.current;
    if (!s.playing || s.view !== 'both' || !held.current.size) return;
    const clock = films.current[held.current.has(lead.current) ? id : lead.current];
    for (const h of held.current) {
      const el = films.current[h];
      if (!el) continue;
      if (clock && el !== clock && Math.abs(el.currentTime - clock.currentTime) > 0.25) el.currentTime = clock.currentTime;
      el.play().catch(() => undefined);
    }
    held.current.clear();
  };
  const onFilmError = (id: Id) => {
    if (!onScreen(live.current.view).includes(id) || !live.current.playing) return;
    setFailed(true);
    setPlaying(false);
  };

  // Every frame while playing: move the timeline, pulse on the beat, keep side-by-side films together.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const s = live.current;
      const leadId = s.view === 'both' ? lead.current : s.view;
      const l = films.current[leadId];
      if (l) {
        const t = l.currentTime;
        paint(t, reduced || l.paused ? 0 : beatPulse(t, BEAT));
        if (s.view === 'both' && !l.paused) {
          const f = films.current[other(leadId)];
          if (f && !f.paused) {
            const c = followerCorrection(t, f.currentTime);
            if (c.seekTo !== undefined) f.currentTime = c.seekTo;
            if (f.playbackRate !== c.rate) f.playbackRate = c.rate;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, paint]);

  // Silent previews play only before a film starts, while on screen, and when motion and data allow.
  const previews = previewsOn && !reduced && !saveData && inView && !started;
  useEffect(() => {
    for (const id of FILM_ORDER) {
      const el = loops.current[id];
      if (!el) continue;
      if (previews) {
        el.preload = 'auto';
        el.play().catch(() => undefined);
      } else el.pause();
    }
  }, [previews]);

  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() =>
      setSize({
        width: stageRef.current?.clientWidth ?? 0,
        shellHeight: shell.clientHeight,
        controls: controlsRef.current?.offsetHeight ?? 0,
      }),
    );
    ro.observe(shell);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const video = films.current[FILM_ORDER[0]] as (HTMLVideoElement & { webkitEnterFullscreen?: unknown }) | null;
    setCanFullscreen(!!(document.fullscreenEnabled && shellRef.current?.requestFullscreen) || typeof video?.webkitEnterFullscreen === 'function');
    const update = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  useEffect(() => {
    onShowing?.(started && !ended ? onScreen(view) : []);
  }, [started, ended, view, onShowing]);

  useEffect(() => {
    if (!request) return;
    shellRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    startRef.current(request.view, 0);
    // Only a new request (a new n) starts a film.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.n]);

  // Stop the films if the page is left.
  useEffect(
    () => () => {
      FILM_ORDER.forEach((id) => films.current[id]?.pause());
    },
    [],
  );

  // Layout
  const solo = view !== 'both';
  const pane = (id: Id) => {
    if (!solo) return { flexGrow: wide && !started && hover === id ? 1.5 : 1, flexBasis: '0px' };
    return view === id ? { flexGrow: 1, flexBasis: '0px' } : { flexGrow: 0, flexBasis: `${wide ? STRIP.wide : STRIP.narrow}px` };
  };
  const { width } = size;
  const stageHeight = fullscreen
    ? Math.max(200, size.shellHeight - size.controls - 24)
    : !width
      ? undefined
      : wide
        ? (width * 9) / 16
        : ended || failed
          ? Math.max(width * 0.95, 300) // room for the closing card
          : solo
            ? (width * 9) / 16 + STRIP.narrow + GAP
            : width * 1.25;
  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 170, damping: 26, mass: 0.9 };
  const g0 = pane(FILM_ORDER[0]).flexGrow;
  const seam = g0 / (g0 + pane(FILM_ORDER[1]).flexGrow);
  const playLabel = playing
    ? 'Pause'
    : view === 'both'
      ? 'Play both films'
      : `Play the ${CAMPUS_FILMS[view].name} film`;

  function onRadioKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + VIEWS.length) % VIEWS.length;
    choose(VIEWS[next].v);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  }

  return (
    <div className="relative isolate">
      {/* Ambient light: the campus colours glow softly around the screen. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-[4%] -bottom-5 top-[12%] -z-10 flex opacity-50 blur-[44px] saturate-150">
        {FILM_ORDER.map((id) => (
          <div
            key={id}
            className={`h-full bg-cover bg-center ${SIZE_EASE}`}
            style={{ backgroundImage: `url(${CAMPUS_FILMS[id].poster})`, ...pane(id) }}
          />
        ))}
      </div>

      <div
        ref={shellRef}
        data-view={view}
        className={`relative bg-[#0a1520] text-white ring-1 ring-white/5 ${
          fullscreen ? 'flex h-full flex-col justify-center p-3' : 'rounded-[22px] p-1.5 shadow-[0_30px_80px_-40px_rgba(4,9,15,0.9)] sm:p-2'
        }`}
      >
        <div
          ref={stageRef}
          className={`relative flex overflow-hidden rounded-[16px] transition-[height] duration-500 ease-[cubic-bezier(0.22,0.8,0.3,1)] ${
            wide ? 'flex-row' : 'flex-col'
          } ${stageHeight === undefined ? 'aspect-[4/5] sm:aspect-video' : ''}`}
          style={{ gap: GAP, background: NIGHT, height: stageHeight }}
        >
          {FILM_ORDER.map((id, i) => {
            const f = CAMPUS_FILMS[id];
            const open = !solo || view === id;
            const folded = solo && view !== id;
            const showFilm = started && open;
            return (
              <div
                key={id}
                className={`relative min-h-0 min-w-0 overflow-hidden ${SIZE_EASE}`}
                style={{ background: NIGHT, ...pane(id) }}
                onPointerEnter={(e) => e.pointerType === 'mouse' && !started && setHover(id)}
                onPointerLeave={() => setHover(null)}
              >
                <video
                  ref={(el) => {
                    loops.current[id] = el;
                    if (el) el.muted = true;
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                  poster={f.poster}
                  muted
                  loop
                  playsInline
                  preload="none"
                  aria-hidden
                  tabIndex={-1}
                >
                  <source src={f.loop.webm} type='video/webm; codecs="vp9"' />
                  <source src={f.loop.mp4} type="video/mp4" />
                </video>
                <video
                  ref={(el) => {
                    films.current[id] = el;
                  }}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${showFilm ? 'opacity-100' : 'opacity-0'}`}
                  poster={f.poster}
                  playsInline
                  preload="none"
                  aria-label={`${f.name} campus film`}
                  aria-hidden={!showFilm}
                  data-campus={id}
                  onEnded={() => onEnded(id)}
                  onWaiting={() => onWaiting(id)}
                  onCanPlay={() => onReady(id)}
                  onPlaying={() => onReady(id)}
                >
                  <source src={f.film.webm} type='video/webm; codecs="vp9, opus"' />
                  <source src={f.film.mp4} type="video/mp4" onError={() => onFilmError(id)} />
                </video>

                {/* While playing: tap a film to pause it, or (side by side) to watch it on its own. */}
                {started && open && (
                  <div
                    className={`absolute inset-0 ${solo ? 'cursor-pointer' : 'cursor-zoom-in'}`}
                    onClick={() => (solo ? togglePlay() : choose(id))}
                    title={solo ? undefined : `Watch ${f.name} on its own`}
                  />
                )}

                {/* The other campus, folded into a strip: tap it to switch. */}
                <AnimatePresence>
                  {folded && (
                    <motion.div
                      key="strip"
                      className="absolute inset-0 grid cursor-pointer place-items-center bg-[#04090f]/60 transition-colors hover:bg-[#04090f]/35"
                      onClick={() => choose(id)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <span
                        className={`flex items-center gap-2 whitespace-nowrap text-[0.8rem] font-semibold tracking-wide text-white ${
                          wide ? 'rotate-180 [writing-mode:vertical-rl]' : ''
                        }`}
                      >
                        <ArrowLeftRight size={14} aria-hidden className={wide ? 'rotate-90' : ''} /> {f.name}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Before playing: the campus title card. */}
                <AnimatePresence>
                  {!started && open && (
                    <motion.div
                      key="title"
                      className="pointer-events-none absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.25 } }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-[#04090f]/90 via-[#04090f]/25 to-[#04090f]/5" />
                      <div className="pointer-events-auto absolute inset-x-0 bottom-0 grid justify-items-start gap-1.5 p-4 sm:gap-2 sm:p-6 lg:p-8">
                        <p className="t-label flex items-center gap-1.5 text-white/80">
                          <MapPin size={13} aria-hidden /> 0{i + 1} · {f.place}
                        </p>
                        <h3 className="font-display text-[clamp(1.45rem,2.4vw+0.7rem,2.75rem)] font-semibold leading-[1.02] text-white">{f.name}</h3>
                        {wide && <p className="max-w-[40ch] text-[0.95rem] leading-snug text-white/85">{f.tagline}</p>}
                        <button
                          type="button"
                          onClick={() => start(id, 0)}
                          className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-[0.95rem] font-semibold shadow-lg transition-transform hover:scale-[1.03]"
                          style={{ color: INK }}
                        >
                          <Play size={16} fill="currentColor" aria-hidden /> Watch {f.place}
                          <span className="t-num font-normal text-[#5b6e86]">{LENGTH}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* While playing: which campus this is. */}
                {showFilm && (
                  <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-[#04090f]/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                    <span className="eq" data-paused={!playing || undefined} aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                    {f.name}
                  </div>
                )}
              </div>
            );
          })}

          {/* Before playing, side by side: one button plays both, sitting on the seam. */}
          <AnimatePresence>
            {!started && view === 'both' && wide && (
              <motion.div
                key="both"
                className="pointer-events-none absolute z-10 grid -translate-y-1/2 justify-items-center gap-2"
                style={{ top: '44%', x: '-50%' }}
                initial={{ opacity: 0, scale: 0.9, left: `${seam * 100}%` }}
                animate={{ opacity: 1, scale: 1, left: `${seam * 100}%` }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={spring}
              >
                <button
                  type="button"
                  onClick={() => start('both', 0)}
                  className="pointer-events-auto relative grid h-[84px] w-[84px] place-items-center rounded-full bg-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.7)] transition-transform hover:scale-105"
                  style={{ color: INK }}
                  aria-label="Play both films side by side"
                >
                  <span aria-hidden className="cinema-ping absolute -inset-2 rounded-full border-2 border-white/60" />
                  <Play size={30} fill="currentColor" className="translate-x-[2px]" aria-hidden />
                </button>
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">Play both · {LENGTH}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!started && !reduced && !saveData && (
            <button
              type="button"
              onClick={() => setPreviewsOn(!previewsOn)}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-[#04090f]/55 text-white backdrop-blur-sm transition-colors hover:bg-[#04090f]/80"
              aria-label={previewsOn ? 'Pause the moving previews' : 'Play the moving previews'}
            >
              {previewsOn ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
            </button>
          )}

          {buffering && playing && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center" role="status" aria-label="Loading">
              <LoaderCircle size={36} className="animate-spin text-white/85" aria-hidden />
            </div>
          )}

          <AnimatePresence>
            {(ended || failed) && (
              <motion.div
                key="end"
                className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-[#04090f]/80 p-4 text-center backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {failed ? (
                  <div className="grid justify-items-center gap-3 text-white">
                    <p className="font-display text-xl sm:text-2xl">The film could not be played just now.</p>
                    <button type="button" onClick={() => start(view, 0)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold" style={{ color: INK }}>
                      <RotateCcw size={15} aria-hidden /> Try again
                    </button>
                  </div>
                ) : (
                  <div className="grid max-w-lg justify-items-center gap-3 text-white sm:gap-4">
                    <p className="t-label text-white/70">Thanks for watching</p>
                    <p className="font-display text-[clamp(1.2rem,2.2vw+0.6rem,2.1rem)] leading-tight">
                      {solo ? `Come and see ${CAMPUS_FILMS[view].name} for yourself` : 'Which campus will you join?'}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {(solo ? [view] : FILM_ORDER).map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onContact?.(id)}
                          className="min-h-10 rounded-full bg-white px-4 py-1.5 text-sm font-semibold"
                          style={{ color: INK }}
                        >
                          Contact {CAMPUS_FILMS[id].place}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => start(view, 0)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/45 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        <RotateCcw size={15} aria-hidden /> Watch again
                      </button>
                      {solo && (
                        <button
                          type="button"
                          onClick={() => start(other(view), 0)}
                          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/45 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
                        >
                          <Play size={14} fill="currentColor" aria-hidden /> Watch {CAMPUS_FILMS[other(view)].place}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div ref={controlsRef} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1.5 pb-1 pt-2 sm:flex-nowrap sm:px-2 sm:pb-0.5 sm:pt-2.5">
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white transition-transform hover:scale-105"
            style={{ color: INK }}
            aria-label={playLabel}
          >
            {playing ? <Pause size={18} fill="currentColor" aria-hidden /> : <Play size={18} fill="currentColor" className="translate-x-px" aria-hidden />}
          </button>

          <div ref={timelineRef} className="relative flex h-11 min-w-0 flex-1 items-center" style={{ '--p': '0', '--beat': '0' } as CSSProperties}>
            <input
              ref={rangeRef}
              type="range"
              min={0}
              max={FILM_SECONDS}
              step={0.1}
              defaultValue={0}
              disabled={!started}
              onChange={(e) => seek(Number(e.target.value))}
              onPointerDown={() => (dragging.current = true)}
              onPointerUp={() => (dragging.current = false)}
              onBlur={() => (dragging.current = false)}
              aria-label="Position in the film"
              aria-valuetext={`0:00 of ${LENGTH}`}
              className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
            />
            <div className="relative h-1 w-full rounded-full bg-white/20 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[6px] peer-focus-visible:outline-white">
              <div className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-[#7ab8ef] to-white" style={{ transform: 'scaleX(var(--p))' }} />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.14)]"
              style={{ left: 'calc(var(--p) * 100%)', transform: 'translate(-50%, -50%) scale(calc(1 + var(--beat) * 0.55))' }}
            />
          </div>

          <span className="t-num shrink-0 text-sm text-white/80">
            <span ref={clockRef}>0:00</span> / {LENGTH}
          </span>

          <div className="flex w-full items-center gap-1.5 sm:w-auto">
            <div role="radiogroup" aria-label="What to show" className="flex flex-1 rounded-full bg-white/10 p-1 sm:flex-none">
              {VIEWS.map((o, i) => {
                const on = view === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => choose(o.v)}
                    onKeyDown={(e) => onRadioKey(e, i)}
                    className={`relative min-h-9 flex-1 whitespace-nowrap rounded-full px-3 text-[0.85rem] font-semibold transition-colors sm:flex-none ${
                      on ? '' : 'text-white/80 hover:text-white'
                    }`}
                    style={on ? { color: INK } : undefined}
                  >
                    {on && <motion.span layoutId="cinema-view" className="absolute inset-0 rounded-full bg-white" transition={spring} />}
                    <span className="relative">
                      <span className="sm:hidden">{o.short}</span>
                      <span className="hidden sm:inline">{o.long}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={toggleMute}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/85 hover:bg-white/10 hover:text-white"
              aria-label={muted ? 'Turn the sound on' : 'Mute'}
            >
              {muted ? <VolumeX size={19} aria-hidden /> : <Volume2 size={19} aria-hidden />}
            </button>
            {canFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/85 hover:bg-white/10 hover:text-white"
                aria-label={fullscreen ? 'Leave full screen' : 'Full screen'}
              >
                {fullscreen ? <Minimize2 size={18} aria-hidden /> : <Maximize2 size={18} aria-hidden />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
