import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, LogOut } from 'lucide-react';
import { createContext, useContext, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import crest from '../assets/imas-mark.webp';
import { PasswordInput } from '../components/PasswordInput';
import { useAllContent } from '../content/hooks';
import type { ContentBundle } from '../content/types';
import { signIn, signOut } from '../lib/auth';
import { isPreviewBuild } from '../lib/supabase';
import { useAdminAuth, type AdminState } from './auth';
import { COLLECTIONS, COLLECTION_ORDER } from './collections';

const AdminContext = createContext<{ content: ContentBundle; auth: AdminState } | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside the admin panel');
  return ctx;
}

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/settings', label: 'Site settings', end: false },
  { to: '/admin/students', label: 'Students', end: false },
  ...COLLECTION_ORDER.map((k) => ({ to: `/admin/${k}`, label: COLLECTIONS[k].title, end: false })),
];

export function AdminLayout() {
  const state = useAdminAuth();
  const { data: content } = useAllContent();
  const qc = useQueryClient();
  const leave = async () => {
    await signOut();
    qc.removeQueries({ queryKey: ['students'] });
  };

  return (
    <div className="flex min-h-full flex-col bg-ground">
      <header className="gutter sticky z-30 border-b border-rule bg-sheet" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3">
          <img src={crest} alt="" className="h-8 w-8 object-contain" />
          <p className="min-w-0 truncate font-display text-lg font-semibold">
            Canadian Diploma <span className="font-body text-sm font-normal text-ink-3">· Admin</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-ink-2 hover:text-blue">
              View site <ExternalLink size={14} aria-hidden />
            </Link>
            {state.status === 'admin' && (
              <button
                type="button"
                onClick={leave}
                className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-sm font-semibold text-ink-2 hover:border-blue hover:text-blue"
              >
                <LogOut size={14} aria-hidden /> Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {state.status === 'demo' && (
        <div className="gutter border-b border-rule bg-maroon-tint">
          <p className="mx-auto max-w-[1280px] py-3 text-sm text-ink">
            <strong>{isPreviewBuild ? 'Preview' : 'Demo mode'}:</strong>{' '}
            {isPreviewBuild
              ? 'try the editors freely. Your changes show on the site until you reload, but they are not saved anywhere.'
              : 'this site is not connected to its database yet, so changes last only until you reload. The Hosting & Maintenance Guide explains how to connect it.'}
          </p>
        </div>
      )}

      <div className="gutter flex-1">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 py-6 lg:grid-cols-[230px_1fr]">
          {state.status === 'admin' || state.status === 'demo' ? (
            <>
              <nav aria-label="Admin" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
                <ul className="flex gap-1 overflow-x-auto pb-2 lg:grid lg:overflow-visible lg:pb-0">
                  {NAV.map((n) => (
                    <li key={n.to} className="shrink-0">
                      <NavLink
                        to={n.to}
                        end={n.end}
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-2 text-[0.95rem] font-semibold ${isActive ? 'bg-blue text-on-blue' : 'text-ink-2 hover:bg-sheet hover:text-blue'}`
                        }
                      >
                        {n.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
              <main className="min-w-0">
                {content ? (
                  <AdminContext.Provider value={{ content, auth: state }}>
                    <Outlet />
                  </AdminContext.Provider>
                ) : (
                  <p role="status" className="text-ink-3">
                    Loading content…
                  </p>
                )}
              </main>
            </>
          ) : (
            <div className="lg:col-span-2">
              <Gate state={state} onSignOut={leave} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Gate({ state, onSignOut }: { state: AdminState; onSignOut: () => void }) {
  return (
    <div className="mx-auto grid max-w-[480px] gap-4 rounded-2xl border border-rule bg-sheet p-6 sm:p-8">
      {state.status === 'loading' && (
        <p role="status" className="text-center">
          Checking your sign-in…
        </p>
      )}
      {state.status === 'signed-out' && state.error && (
        <div role="alert" className="grid gap-2 rounded-xl border-l-4 border-maroon bg-maroon-tint px-4 py-3 text-sm">
          <p className="font-semibold text-ink">The website can’t connect to its database</p>
          <p className="text-ink-2">{state.error}</p>
          <p className="text-ink-2">
            To fix it: in Netlify open <strong>Project configuration → Environment variables</strong>, check that <code className="font-mono">VITE_SUPABASE_URL</code> is
            the Supabase Project URL and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> is the publishable key, then go to{' '}
            <strong>Deploys → Trigger deploy → Deploy project</strong>.
          </p>
        </div>
      )}
      {state.status === 'signed-out' && <StaffSignIn />}
      {(state.status === 'not-admin' || state.status === 'error') && (
        <>
          <h1 className="t-h2">No editing access</h1>
          <p className="text-ink-2">
            You are signed in as <strong className="text-ink">{state.email}</strong>, but this account can’t edit the website. Student accounts can’t open
            the admin panel. If you are staff, ask an editor to add your email to the editors list (see the Hosting &amp; Maintenance Guide).
          </p>
          {state.status === 'error' && <p className="text-sm text-maroon">Database error: {state.message}</p>}
          <button type="button" onClick={onSignOut} className="w-fit rounded-full border border-rule px-5 py-2 font-semibold hover:border-blue">
            Sign out
          </button>
        </>
      )}
    </div>
  );
}

function StaffSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err.replace('That ID', 'That email'));
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-1">
        <h1 className="t-h2">Staff sign-in</h1>
        <p className="text-ink-2">Sign in with your IMAS email to edit the Canadian Diploma website.</p>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="staff-email" className="font-semibold">
          Email
        </label>
        <input
          id="staff-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          placeholder="name@imas.edu.my"
          className="min-h-11 rounded-lg border border-rule-strong bg-sheet px-3"
        />
      </div>
      <PasswordInput id="staff-password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
      {error && (
        <p role="alert" className="rounded-lg bg-maroon-tint px-3 py-2 text-sm text-maroon">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="min-h-11 w-fit rounded-full bg-blue px-6 font-semibold text-on-blue hover:bg-blue-deep disabled:opacity-60">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-sm text-ink-3">Forgotten your password? Another editor can set a new one for you in Supabase (see the guide).</p>
    </form>
  );
}
