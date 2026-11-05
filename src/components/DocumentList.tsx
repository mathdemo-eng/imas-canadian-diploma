import { ExternalLink } from 'lucide-react';
import type { DocumentLink } from '../content/types';

/** Documents as cards that open in a new tab. Batch documents carry a "Your batch" tag. */
export function DocumentList({ documents, batch = false }: { documents: DocumentLink[]; batch?: boolean }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {documents.map((d) => (
        <li key={d.id}>
          <a
            href={d.url}
            target="_blank"
            rel="noreferrer"
            className={`group grid h-full gap-1 rounded-xl border p-4 hover:border-blue ${batch ? 'border-blue/40 bg-blue-tint/40' : 'border-rule'}`}
          >
            <span className="flex flex-wrap items-center gap-2">
              {d.category && <span className="t-label text-ink-3">{d.category}</span>}
              {batch && <span className="rounded-full bg-blue px-2 py-0.5 text-[0.7rem] font-semibold text-on-blue">Your batch</span>}
            </span>
            <span className="flex items-start justify-between gap-2 font-semibold group-hover:text-blue">
              {d.title}
              <ExternalLink size={15} aria-hidden className="mt-1 shrink-0 text-ink-3 group-hover:text-blue" />
            </span>
            {d.description && <span className="text-sm text-ink-2">{d.description}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
