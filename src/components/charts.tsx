import { useState } from 'react';

/**
 * Part-to-whole bar for the assessment split. Two validated series colours,
 * a 2px surface gap between segments, labels in text colours below the bar.
 */
export function SplitBar({ parts, caption }: { parts: { label: string; value: number; detail: string }[]; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = parts.reduce((a, p) => a + p.value, 0);
  const colors = ['var(--viz-1)', 'var(--viz-2)'];
  return (
    <figure className="grid gap-4">
      <div className="relative">
        <div className="flex h-14 w-full gap-[2px] overflow-hidden rounded-[4px] bg-sheet" role="img" aria-label={caption}>
          {parts.map((p, i) => (
            <div
              key={p.label}
              className="h-full transition-opacity"
              style={{ width: `${(p.value / total) * 100}%`, background: colors[i], opacity: hover === null || hover === i ? 1 : 0.55 }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </div>
        {hover !== null && (
          <div
            role="tooltip"
            className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-lg border border-rule bg-sheet px-3 py-2 text-sm shadow-lg"
            style={{ left: `${(parts.slice(0, hover).reduce((a, p) => a + p.value, 0) / total) * 100}%` }}
          >
            <span className="font-semibold t-num">{parts[hover].value}%</span> <span className="text-ink-2">{parts[hover].label}</span>
          </div>
        )}
      </div>
      <div className="flex gap-[2px]">
        {parts.map((p, i) => (
          <div key={p.label} className="grid content-start gap-1 pr-3" style={{ width: `${(p.value / total) * 100}%` }}>
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-3 w-3 rounded-[3px]" style={{ background: colors[i] }} />
              <span className="font-display text-3xl font-semibold text-ink t-num">{p.value}%</span>
            </span>
            <span className="font-semibold">{p.label}</span>
            <span className="text-sm text-ink-2">{p.detail}</span>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}

export interface CreditRow {
  label: string;
  hours: number;
  note?: string;
  indent?: boolean;
}

/**
 * Credit-hours by cluster: one sequential hue, bars drawn to one scale (0–max),
 * value printed beside every bar so colour is never the only cue.
 */
export function CreditBars({ rows, total }: { rows: CreditRow[]; total: number }) {
  const max = Math.max(...rows.map((r) => r.hours));
  const [hover, setHover] = useState<number | null>(null);
  return (
    <figure className="grid gap-3">
      <ul className="grid gap-2.5">
        {rows.map((r, i) => (
          <li
            key={r.label}
            className="relative grid items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(11rem,15rem)_1fr_7.5rem]"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className={`text-[0.95rem] ${r.indent ? 'pl-5 text-ink-2' : 'font-semibold'}`}>
              {r.indent && <span aria-hidden className="mr-1 text-ink-3">↳</span>}
              {r.label}
            </span>
            <span className="relative h-5 rounded-[4px] bg-sheet-2">
              <span
                className="absolute inset-y-0 left-0 rounded-[4px] transition-opacity"
                style={{ width: `${(r.hours / max) * 100}%`, background: r.indent ? 'var(--viz-2)' : 'var(--viz-1)', opacity: hover === null || hover === i ? 1 : 0.6 }}
              />
            </span>
            <span className="text-sm text-ink-2 t-num">
              <span className="font-semibold text-ink">{r.hours}</span> credit-hours
            </span>
            {hover === i && (
              <span
                role="tooltip"
                className="pointer-events-none absolute right-0 top-0 z-10 -translate-y-[110%] rounded-lg border border-rule bg-sheet px-3 py-2 text-sm shadow-lg"
              >
                <span className="font-semibold t-num">{r.hours / 4} courses</span>
                <span className="text-ink-2"> · {Math.round((r.hours / total) * 100)}% of {total} credit-hours</span>
                {r.note && <span className="block text-ink-3">{r.note}</span>}
              </span>
            )}
          </li>
        ))}
      </ul>
      <figcaption className="text-sm text-ink-3">Every course is 4 credit-hours, so 4 credit-hours equals one course.</figcaption>
    </figure>
  );
}

/** The academic year as a 12-month band, September to August. */
export function YearBand() {
  const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const segments = [
    { label: 'Semester 1', range: 'September – February', from: 0, span: 6, color: 'var(--viz-1)' },
    { label: 'Semester 2', range: 'March – July', from: 6, span: 5, color: 'var(--viz-2)' },
  ];
  return (
    <figure className="grid gap-3">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="The academic year, September to August">
        <div className="grid min-w-[560px] gap-2">
          <div className="grid grid-cols-12 gap-[2px]">
            {segments.map((s) => (
              <span key={s.label} className="px-1 font-semibold" style={{ gridColumn: `${s.from + 1} / span ${s.span}` }}>
                {s.label}
              </span>
            ))}
            <span className="text-center text-sm text-ink-3" style={{ gridColumn: '12 / span 1' }}>
              Break
            </span>
          </div>
          <div className="grid grid-cols-12 gap-[2px]" role="img" aria-label="Semester 1 runs from September to February. Semester 2 runs from March to July. August is a break.">
            {segments.map((s) => (
              <div key={s.label} className="h-10 rounded-[4px]" style={{ gridColumn: `${s.from + 1} / span ${s.span}`, background: s.color }} />
            ))}
            <div className="h-10 rounded-[4px] border border-dashed border-rule-strong" style={{ gridColumn: '12 / span 1' }} />
          </div>
          <div className="grid grid-cols-12 gap-[2px]">
            {months.map((m) => (
              <span key={m} className="text-center font-mono text-xs text-ink-3">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-2">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-3 rounded-[3px]" style={{ background: s.color }} />
            {s.label}: {s.range}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Travel times as bars on one scale (minutes), with the time printed beside each bar. */
export function TimeBars({ title, rows, max }: { title: string; rows: { place: string; minutes: number }[]; max: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const fmt = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);
  return (
    <figure className="grid content-start gap-3">
      <figcaption className="t-label text-ink-3">{title}</figcaption>
      <ul className="grid gap-2.5">
        {rows.map((r, i) => (
          <li
            key={r.place}
            className="relative grid grid-cols-[7rem_1fr_5.5rem] items-center gap-3"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="text-[0.95rem] font-semibold">{r.place}</span>
            <span className="relative h-4 rounded-[4px] bg-sheet-2">
              <span
                className="absolute inset-y-0 left-0 rounded-[4px] transition-opacity"
                style={{ width: `${(r.minutes / max) * 100}%`, background: 'var(--viz-1)', opacity: hover === null || hover === i ? 1 : 0.6 }}
              />
            </span>
            <span className="text-sm text-ink-2 t-num">{fmt(r.minutes)}</span>
            {hover === i && (
              <span role="tooltip" className="pointer-events-none absolute right-0 top-0 z-10 -translate-y-[110%] rounded-lg border border-rule bg-sheet px-3 py-1.5 text-sm shadow-lg">
                Sackville → {r.place}: about {fmt(r.minutes)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </figure>
  );
}
