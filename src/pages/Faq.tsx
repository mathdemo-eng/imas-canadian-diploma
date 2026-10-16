import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Chapter } from '../components/Chapter';
import type { Audience } from '../content/types';
import { useSite } from '../content/useSite';

const FILTERS: { value: Audience; label: string }[] = [
  { value: 'all', label: 'All questions' },
  { value: 'new', label: 'New students & parents' },
  { value: 'current', label: 'Current students' },
];

export function Faq() {
  const { faqs } = useSite();
  const [filter, setFilter] = useState<Audience>('all');
  const shown = faqs.filter((f) => filter === 'all' || f.audience === filter || f.audience === 'all');

  return (
    <Chapter lede="Short answers to the questions students and parents ask most often.">
      <div className="grid gap-6">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Show questions for</legend>
          {FILTERS.map((f) => (
            <label
              key={f.value}
              className={`cursor-pointer rounded-full border px-4 py-2 text-[0.95rem] font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue ${filter === f.value ? 'border-blue bg-blue text-on-blue' : 'border-rule-strong text-ink-2 hover:border-blue'}`}
            >
              <input type="radio" name="faq-filter" value={f.value} checked={filter === f.value} onChange={() => setFilter(f.value)} className="sr-only" />
              {f.label}
            </label>
          ))}
        </fieldset>

        <ul className="grid divide-y divide-rule border-y border-rule">
          {shown.map((f) => (
            <li key={f.id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[1.1rem] font-semibold marker:hidden hover:text-blue [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <ChevronDown size={20} aria-hidden className="shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
                </summary>
                <p className="measure pb-6 text-ink-2">{f.answer}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </Chapter>
  );
}
