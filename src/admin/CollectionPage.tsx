import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TERM_LABEL } from '../content/labels';
import type { CollectionKey, ContentBundle } from '../content/types';
import { useAdmin } from './AdminLayout';
import { COLLECTIONS, slugify, type CollectionConfig, type Field } from './collections';
import { useContentEditor } from './data';

type Row = { id: string } & Record<string, unknown>;

export function CollectionPage() {
  const { collection } = useParams();
  const config = COLLECTIONS[collection as CollectionKey];
  if (!config) {
    return (
      <p className="text-ink-2">
        This section doesn’t exist. <Link to="/admin" className="prose-link">Back to the dashboard</Link>
      </p>
    );
  }
  return <CollectionEditor key={config.key} config={config} />;
}

const TERM_ORDER: Record<string, number> = { FY: 0, S1: 1, S2: 2 };

function CollectionEditor({ config }: { config: CollectionConfig }) {
  const { content } = useAdmin();
  const rows = content[config.key] as unknown as Row[];
  const filterOptions = config.filterBy?.options(content) ?? [];
  const [filter, setFilter] = useState(filterOptions[0]?.value ?? '');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  // The form reopens on an item once it has been added, so it says "Saved" there.
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !config.filterBy || r[config.filterBy.field] === filter)
      .filter((r) => {
        if (!q) return true;
        const s = config.summary(r, content);
        return `${s.title} ${s.meta}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (config.key === 'placements') {
          return (
            Number(a.grade) - Number(b.grade) || TERM_ORDER[String(a.term)] - TERM_ORDER[String(b.term)] || Number(a.slot) - Number(b.slot)
          );
        }
        if (config.key === 'announcements') return String(b.published_at).localeCompare(String(a.published_at));
        return Number(a.sort ?? 0) - Number(b.sort ?? 0);
      });
  }, [rows, filter, query, config, content]);

  function startNew() {
    const base: Row = { id: '', ...structuredClone(config.defaults) };
    if (config.filterBy) base[config.filterBy.field] = filter;
    setDraft(base);
    setIsNew(true);
    setJustSaved(null);
  }

  // Placements are grouped under “Grade 11 · Semester 1” headings.
  const groups = useMemo(() => {
    if (config.key !== 'placements') return [{ heading: '', rows: visible }];
    const out: { heading: string; rows: Row[] }[] = [];
    for (const r of visible) {
      const heading = `Grade ${r.grade} · ${TERM_LABEL[r.term as keyof typeof TERM_LABEL]}`;
      const g = out.find((x) => x.heading === heading);
      if (g) g.rows.push(r);
      else out.push({ heading, rows: [r] });
    }
    return out;
  }, [visible, config.key]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="t-h1">{config.title}</h1>
          <p className="measure text-ink-2">{config.description}</p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-blue px-5 font-semibold text-on-blue hover:bg-blue-deep"
        >
          <Plus size={18} aria-hidden /> Add {config.singular}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {config.filterBy && (
          <label className="grid gap-1 text-sm font-semibold">
            {config.filterBy.label}
            <select
              id={`filter-${config.key}`}
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setDraft(null);
              }}
              className="min-h-11 rounded-lg border border-rule-strong bg-sheet px-3 font-normal"
            >
              {filterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="grid flex-1 gap-1 text-sm font-semibold">
          Search
          <span className="relative">
            <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              id={`search-${config.key}`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}`}
              className="min-h-11 w-full rounded-lg border border-rule-strong bg-sheet pl-9 pr-3 font-normal"
            />
          </span>
        </label>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_440px]">
        <div className="grid gap-5">
          {visible.length === 0 && (
            <p className="rounded-xl border border-dashed border-rule-strong p-6 text-ink-3">
              Nothing here yet. Use “Add {config.singular}” to create the first one.
            </p>
          )}
          {groups.map((g) => (
            <section key={g.heading || 'all'} className="grid gap-2">
              {g.heading && <h2 className="t-label text-ink-3">{g.heading}</h2>}
              <ul className="grid gap-px overflow-hidden rounded-xl border border-rule bg-rule">
                {g.rows.map((r) => {
                  const s = config.summary(r, content);
                  const active = draft?.id === r.id && !isNew;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(structuredClone(r));
                          setIsNew(false);
                          setJustSaved(null);
                        }}
                        aria-current={active ? 'true' : undefined}
                        className={`grid w-full gap-0.5 px-4 py-3 text-left ${active ? 'bg-blue-tint' : 'bg-sheet hover:bg-sheet-2'}`}
                      >
                        <span className="font-semibold">{s.title}</span>
                        <span className="text-sm text-ink-3">{s.meta}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="xl:sticky xl:top-20">
          {draft ? (
            <EditorForm
              key={`${draft.id}-${isNew}`}
              config={config}
              initial={draft}
              isNew={isNew}
              content={content}
              existingIds={rows.map((r) => r.id)}
              saved={justSaved !== null && justSaved === draft.id}
              onDone={(saved) => {
                setDraft(saved);
                setIsNew(false);
                setJustSaved(saved?.id ?? null);
              }}
              onClose={() => setDraft(null)}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-rule-strong p-6 text-ink-3">Select an item to edit it, or add a new one.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EditorForm({
  config,
  initial,
  isNew,
  content,
  existingIds,
  saved = false,
  onDone,
  onClose,
}: {
  config: CollectionConfig;
  initial: Row;
  isNew: boolean;
  content: ContentBundle;
  existingIds: string[];
  /** Just added: start with the "Saved" message. */
  saved?: boolean;
  onDone: (row: Row | null) => void;
  onClose: () => void;
}) {
  const { save, remove } = useContentEditor();
  // Rows saved before a field existed get its default (e.g. older documents are for everyone).
  const [row, setRow] = useState<Row>(() => ({ ...structuredClone(config.defaults), ...initial }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(
    saved ? { tone: 'ok', text: 'Saved. The website now shows this change.' } : null,
  );
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set(key: string, value: unknown) {
    setRow((r) => ({ ...r, [key]: value }));
    setStatus(null);
  }

  function validate(): Row | null {
    const errs: Record<string, string> = {};
    const out: Row = { ...row };
    for (const f of config.fields) {
      // A field that isn't shown (e.g. the batch for a document for everyone) goes back to its default.
      if (f.showIf && !f.showIf(out)) {
        out[f.key] = structuredClone(config.defaults[f.key]);
        continue;
      }
      const v = out[f.key];
      if (f.type === 'checks') out[f.key] = (Array.isArray(v) ? v : []).map((x) => (f.numeric ? Number(x) : String(x)));
      if (f.type === 'list') out[f.key] = (Array.isArray(v) ? (v as string[]) : []).map((x) => x.trim()).filter(Boolean);
      if (f.type === 'number' && (v === '' || v === null || Number.isNaN(Number(v)))) {
        errs[f.key] = 'Enter a number.';
        continue;
      }
      if (f.type === 'number') out[f.key] = Number(v);
      if (f.required && (v === '' || v === null || v === undefined)) errs[f.key] = 'This is required.';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return null;
    if (isNew) {
      if (config.idFrom) {
        const base = slugify(String(out[config.idFrom] ?? '')) || config.singular;
        let id = base;
        for (let n = 2; existingIds.includes(id); n++) id = `${base}-${n}`;
        out.id = id;
      } else {
        out.id = crypto.randomUUID();
      }
    }
    return out;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const out = validate();
    if (!out) {
      setStatus({ tone: 'error', text: 'Please fix the highlighted fields.' });
      return;
    }
    setBusy(true);
    try {
      await save(config.key, out);
      setStatus({ tone: 'ok', text: 'Saved. The website now shows this change.' });
      onDone(out);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // The database hasn't had the one-time update that adds batches to documents yet.
      const needsUpdate = config.key === 'documents' && /audience|for_tracks|for_grades/.test(msg);
      setStatus({
        tone: 'error',
        text: needsUpdate
          ? 'Not saved: the database needs a one-time update before documents can be given to batches. In Supabase → SQL Editor, run the file supabase/migrations/0004_document_batches.sql (see the hosting guide, “Documents for chosen batches”), then save again.'
          : `Not saved: ${msg}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    try {
      await remove(config.key, row.id);
      onDone(null);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // The database keeps a course while students have it in their records, so their history is never lost.
      const inRecords = config.key === 'courses' && /student_courses/.test(msg);
      setStatus({
        tone: 'error',
        text: inRecords
          ? 'Not deleted: some students have this course in their records. To stop teaching it, remove it from the cohort plans (Subjects in tracks), then from students’ records (Subjects & grades → Subjects for a group → Remove). You can keep the course here for later: it only shows on the website where a cohort plan uses it.'
          : `Not deleted: ${msg}`,
      });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSave} className="grid gap-4 rounded-2xl border border-rule bg-sheet p-5" noValidate>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">{isNew ? `New ${config.singular}` : `Edit ${config.singular}`}</h2>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-semibold text-ink-3 hover:text-blue">
          Close
        </button>
      </div>

      {config.fields
        .filter((f) => !f.showIf || f.showIf(row))
        .map((f) => (
          <FieldInput key={f.key} config={config} field={f} value={row[f.key]} error={errors[f.key]} content={content} onChange={(v) => set(f.key, v)} />
        ))}

      {config.note && (
        <p className="rounded-lg border-l-4 border-blue bg-blue-tint px-3 py-2 text-sm text-ink-2" aria-live="polite">
          {config.note(row, content)}
        </p>
      )}

      {status && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${status.tone === 'ok' ? 'bg-green-tint text-green-ink' : 'bg-maroon-tint text-maroon'}`}>
          {status.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-blue px-6 font-semibold text-on-blue hover:bg-blue-deep disabled:opacity-60">
          {busy ? 'Saving…' : isNew ? `Add ${config.singular}` : 'Save changes'}
        </button>
        {!isNew &&
          (confirmDelete ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-2">
                Delete this {config.singular}?
                {config.key === 'courses' && ' It will also be removed from every track that uses it.'}
                {config.key === 'tracks' && ' Its subject list will be deleted too.'}
              </span>
              <button type="button" onClick={onDelete} disabled={busy} className="rounded-full bg-maroon px-4 py-2 font-semibold text-sheet">
                Yes, delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full px-3 py-2 font-semibold text-ink-2">
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full px-4 py-2 text-sm font-semibold text-maroon hover:bg-maroon-tint">
              Delete
            </button>
          ))}
      </div>
    </form>
  );
}

function FieldInput({
  config,
  field: f,
  value,
  error,
  content,
  onChange,
}: {
  config: CollectionConfig;
  field: Field;
  value: unknown;
  error?: string;
  content: ContentBundle;
  onChange: (v: unknown) => void;
}) {
  const id = `field-${config.key}-${f.key}`;
  const describedBy = [f.help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  const inputClass = `w-full rounded-lg border bg-sheet px-3 py-2 ${error ? 'border-maroon' : 'border-rule-strong'}`;

  let control: React.ReactNode;
  switch (f.type) {
    case 'textarea':
      control = <textarea id={id} rows={4} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} className={inputClass} />;
      break;
    case 'list':
      control = (
        <textarea
          id={id}
          rows={5}
          value={(Array.isArray(value) ? (value as string[]) : []).join('\n')}
          onChange={(e) => onChange(e.target.value.split('\n'))}
          aria-describedby={describedBy}
          className={inputClass}
        />
      );
      break;
    case 'boolean':
      return (
        <label htmlFor={id} className="flex items-center gap-3 font-semibold">
          <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[var(--blue)]" />
          {f.label}
        </label>
      );
    case 'radio':
    case 'checks': {
      const options = typeof f.options === 'function' ? f.options(content) : (f.options ?? []);
      const picked = new Set((Array.isArray(value) ? value : []).map(String));
      return (
        <fieldset className="grid gap-2" aria-describedby={describedBy}>
          <legend className="mb-1 font-semibold">{f.label}</legend>
          {options.map((o) => {
            const optionId = `${id}-${o.value}`;
            const checked = f.type === 'radio' ? String(value ?? '') === o.value : picked.has(o.value);
            return (
              <label
                key={o.value}
                htmlFor={optionId}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${checked ? 'border-blue bg-blue-tint' : 'border-rule hover:border-blue'}`}
              >
                <input
                  id={optionId}
                  type={f.type === 'radio' ? 'radio' : 'checkbox'}
                  name={id}
                  value={o.value}
                  checked={checked}
                  onChange={(e) => {
                    if (f.type === 'radio') return onChange(o.value);
                    const next = new Set(picked);
                    if (e.target.checked) next.add(o.value);
                    else next.delete(o.value);
                    // Keep the order of the list, not the order of ticking.
                    onChange(options.filter((x) => next.has(x.value)).map((x) => (f.numeric ? Number(x.value) : x.value)));
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--blue)]"
                />
                <span>{o.label}</span>
              </label>
            );
          })}
          {f.help && (
            <p id={`${id}-help`} className="text-sm text-ink-3">
              {f.help}
            </p>
          )}
          {error && (
            <p id={`${id}-error`} className="text-sm text-maroon">
              {error}
            </p>
          )}
        </fieldset>
      );
    }
    case 'select': {
      const options = typeof f.options === 'function' ? f.options(content) : (f.options ?? []);
      control = (
        <select
          id={id}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => {
            const v = e.target.value;
            onChange(f.numeric ? Number(v) : f.nullable && v === '' ? null : v);
          }}
          aria-describedby={describedBy}
          className={`${inputClass} min-h-11`}
        >
          {!options.some((o) => o.value === '') && <option value="">Choose…</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    }
    default:
      control = (
        <input
          id={id}
          type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : 'text'}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          className={`${inputClass} min-h-11`}
        />
      );
  }

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {f.label}
        {f.required && <span className="text-maroon"> *</span>}
      </label>
      {control}
      {f.help && (
        <p id={`${id}-help`} className="text-sm text-ink-3">
          {f.help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-maroon">
          {error}
        </p>
      )}
    </div>
  );
}
