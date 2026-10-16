import { AlertTriangle, CheckCircle2, Database, Download } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { contentProblems } from '../content/derive';
import { isPreviewBuild, supabaseConfigured } from '../lib/supabase';
import { useAdmin } from './AdminLayout';
import { COLLECTIONS, COLLECTION_ORDER } from './collections';
import { downloadBackup } from './data';

export function AdminHome() {
  const { content, auth } = useAdmin();
  const problems = contentProblems(content.tracks, content.placements, content.courses);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function backup() {
    setBusy(true);
    setMsg('');
    try {
      await downloadBackup(content);
      setMsg('Backup downloaded. Keep it somewhere safe, such as a Google Drive folder.');
    } catch (e) {
      setMsg(`The backup could not be created: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="t-h1">Dashboard</h1>
        <p className="text-ink-2">
          {auth.status === 'admin' ? `Signed in as ${auth.email}. ` : ''}Choose what you want to edit. Changes appear on the website straight away.
        </p>
      </div>

      <section className="grid gap-3 rounded-2xl border border-rule bg-sheet p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Database size={18} aria-hidden className="text-blue" /> Where the content comes from
        </h2>
        {content.source === 'database' ? (
          <p className="text-ink-2">Connected to the database. Everything you save here is stored and shown to visitors.</p>
        ) : (
          <p className="text-ink-2">
            The website is showing its built-in content.{' '}
            {supabaseConfigured
              ? 'The database could not be reached, so edits cannot be saved right now.'
              : 'Connect the database (see the Hosting & Maintenance Guide) to save edits.'}
          </p>
        )}
        {content.loadError && <p className="text-sm text-maroon">Database error: {content.loadError}</p>}
      </section>

      <section aria-labelledby="sections-title" className="grid gap-3">
        <h2 id="sections-title" className="t-label text-ink-3">
          Content
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <li>
            <Link to="/admin/settings" className="grid h-full gap-1 rounded-xl border border-rule bg-sheet p-5 hover:border-blue">
              <span className="font-semibold">Site settings</span>
              <span className="text-sm text-ink-2">Contact details, IELTS band, assessment weights and other key figures.</span>
            </Link>
          </li>
          {COLLECTION_ORDER.map((k) => (
            <li key={k}>
              <Link to={`/admin/${k}`} className="grid h-full gap-1 rounded-xl border border-rule bg-sheet p-5 hover:border-blue">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{COLLECTIONS[k].title}</span>
                  <span className="font-mono text-sm text-ink-3 t-num">{content[k].length}</span>
                </span>
                <span className="text-sm text-ink-2">{COLLECTIONS[k].description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 rounded-2xl border border-rule bg-sheet p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          {problems.length ? <AlertTriangle size={18} aria-hidden className="text-maroon" /> : <CheckCircle2 size={18} aria-hidden className="text-green-ink" />}
          Content check
        </h2>
        {problems.length === 0 ? (
          <p className="text-ink-2">Every track has subjects, and every subject points to a real course.</p>
        ) : (
          <ul className="grid list-disc gap-1 pl-5 text-ink-2">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3 rounded-2xl border border-rule bg-sheet p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Download size={18} aria-hidden className="text-blue" /> Backup
        </h2>
        <p className="text-ink-2">Download all website content as one file. Do this once a month and before big changes.</p>
        {isPreviewBuild ? (
          <p className="text-sm text-ink-3">Downloads are switched off in this preview. They work on the live website.</p>
        ) : (
          <button
            type="button"
            onClick={backup}
            disabled={busy}
            className="w-fit rounded-full bg-blue px-5 py-2.5 font-semibold text-on-blue hover:bg-blue-deep disabled:opacity-60"
          >
            {busy ? 'Preparing…' : 'Download backup'}
          </button>
        )}
        {msg && (
          <p role="status" className="text-sm text-ink-2">
            {msg}
          </p>
        )}
      </section>
    </div>
  );
}
