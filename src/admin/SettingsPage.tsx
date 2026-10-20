import { useState } from 'react';
import type { Settings } from '../content/types';
import { normaliseAcademicYear } from '../lib/academic-year';
import { useAdmin } from './AdminLayout';
import { useContentEditor } from './data';

interface SettingField {
  key: keyof Settings;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'url' | 'email' | 'boolean';
  help?: string;
}

const GROUPS: { title: string; fields: SettingField[] }[] = [
  {
    title: 'Home page',
    fields: [
      { key: 'hero_title', label: 'Headline', type: 'text' },
      { key: 'hero_lede', label: 'Introduction', type: 'textarea' },
    ],
  },
  {
    title: 'Admissions contact',
    fields: [
      { key: 'admissions_phone', label: 'Phone number', type: 'text' },
      { key: 'admissions_email', label: 'Email', type: 'email' },
      { key: 'enquiry_subject', label: 'Enquiry email subject', type: 'text', help: '“Make an enquiry” opens a new Gmail message to the admissions email with this subject.' },
      { key: 'website_selangor', label: 'IMAS Selangor website', type: 'url' },
      { key: 'website_kl', label: 'IMAS Kuala Lumpur website', type: 'url' },
    ],
  },
  {
    title: 'Programme figures',
    fields: [
      { key: 'ielts_min_band', label: 'IELTS band required to graduate', type: 'number' },
      { key: 'ca_weight', label: 'Continuous assessment weight (%)', type: 'number', help: 'Together with the final exam weight, this should make 100.' },
      { key: 'exam_weight', label: 'Final examination weight (%)', type: 'number' },
      { key: 'pass_mark', label: 'Pass mark per course (%)', type: 'number' },
      { key: 'attendance_min', label: 'Minimum attendance (%)', type: 'number' },
      { key: 'total_credit_hours', label: 'Credit-hours to graduate', type: 'number' },
      { key: 'grade12_credit_hours', label: 'Credit-hours required at Grade 12 level', type: 'number' },
    ],
  },
  {
    title: 'Student records',
    fields: [
      {
        key: 'current_academic_year',
        label: 'Current academic year',
        type: 'text',
        help: 'For example 2026-2027. Leave empty to change automatically each September.',
      },
      {
        key: 'repeat_threshold',
        label: 'Suggest repeating a grade when this many courses are not passed',
        type: 'number',
        help: 'Only a suggestion on the Promotion page. You always make the final decision.',
      },
      {
        key: 'feedback_required',
        label: 'Students give course feedback before they see the mark',
        type: 'boolean',
        help: 'Each course’s mark appears once the student has sent feedback on that course.',
      },
    ],
  },
];

export function SettingsPage() {
  const { content } = useAdmin();
  const { saveSiteSettings } = useContentEditor();
  const [draft, setDraft] = useState<Settings>(content.settings);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = { ...draft };
    for (const g of GROUPS) {
      for (const f of g.fields) {
        if (f.type === 'number') {
          const n = Number(next[f.key]);
          if (Number.isNaN(n)) {
            setStatus({ tone: 'error', text: `“${f.label}” must be a number.` });
            return;
          }
          (next as unknown as Record<string, unknown>)[f.key] = n;
        }
      }
    }
    const year = String(next.current_academic_year ?? '').trim();
    if (year && !normaliseAcademicYear(year)) {
      setStatus({ tone: 'error', text: 'The academic year must look like 2026-2027, or be left empty.' });
      return;
    }
    next.current_academic_year = year ? normaliseAcademicYear(year)! : '';
    if (next.ca_weight + next.exam_weight !== 100) {
      setStatus({ tone: 'error', text: 'The two assessment weights must add up to 100.' });
      return;
    }
    setBusy(true);
    try {
      await saveSiteSettings(next);
      setStatus({ tone: 'ok', text: 'Saved. The website now shows these settings.' });
    } catch (err) {
      setStatus({ tone: 'error', text: `Not saved: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-[760px] gap-8" noValidate>
      <div className="grid gap-1">
        <h1 className="t-h1">Site settings</h1>
        <p className="text-ink-2">Key facts used across the website. Change a figure here and every page that mentions it updates.</p>
      </div>
      {GROUPS.map((g) => (
        <fieldset key={g.title} className="grid gap-4 rounded-2xl border border-rule bg-sheet p-5">
          <legend className="px-1 font-display text-xl font-semibold">{g.title}</legend>
          {g.fields.map((f) => {
            const id = `setting-${f.key}`;
            const common = {
              id,
              value: String(draft[f.key] ?? ''),
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                setDraft((d) => ({ ...d, [f.key]: e.target.value }));
                setStatus(null);
              },
              className: 'w-full rounded-lg border border-rule-strong bg-sheet px-3 py-2',
              'aria-describedby': f.help ? `${id}-help` : undefined,
            };
            if (f.type === 'boolean') {
              return (
                <div key={f.key} className="grid gap-1">
                  <label htmlFor={id} className="flex items-center gap-3 font-semibold">
                    <input
                      id={id}
                      type="checkbox"
                      checked={Boolean(draft[f.key])}
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, [f.key]: e.target.checked }));
                        setStatus(null);
                      }}
                      aria-describedby={f.help ? `${id}-help` : undefined}
                      className="h-5 w-5 accent-blue"
                    />
                    {f.label}
                  </label>
                  {f.help && (
                    <p id={`${id}-help`} className="pl-8 text-sm text-ink-3">
                      {f.help}
                    </p>
                  )}
                </div>
              );
            }
            return (
              <div key={f.key} className="grid gap-1.5">
                <label htmlFor={id} className="font-semibold">
                  {f.label}
                </label>
                {f.type === 'textarea' ? <textarea rows={3} {...common} /> : <input type={f.type} {...common} className={`${common.className} min-h-11`} />}
                {f.help && (
                  <p id={`${id}-help`} className="text-sm text-ink-3">
                    {f.help}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>
      ))}
      {status && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${status.tone === 'ok' ? 'bg-green-tint text-green-ink' : 'bg-maroon-tint text-maroon'}`}>
          {status.text}
        </p>
      )}
      <button type="submit" disabled={busy} className="w-fit min-h-11 rounded-full bg-blue px-6 font-semibold text-on-blue hover:bg-blue-deep disabled:opacity-60">
        {busy ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
