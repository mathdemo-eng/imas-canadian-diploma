import { ExternalLink, LogOut } from 'lucide-react';
import { createContext, useContext } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import crest from '../assets/imas-mark.webp';
import { useAllContent } from '../content/hooks';
import type { ContentBundle } from '../content/types';
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
  ...COLLECTION_ORDER.map((k) => ({ to: `/admin/${k}`, label: COLLECTIONS[k].title, end: false })),
];

export function AdminLayout() {
  const { state, signIn, signOut } = useAdminAuth();
  const { data: content } = useAllContent();

  return (
    <div className="flex min-h-full flex-col bg-ground">
      <header className="gutter sticky z-30 border-b border-rule bg-sheet" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3">
          <img src={crest} alt="" className="h-8 w-8 object-contain" />
          <p className="font-display text-lg font-semibold">
            Canadian Diploma <span className="font-body text-sm font-normal text-ink-3">· Admin</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-2 hover:text-blue">
              View site <ExternalLink size={14} aria-hidden />
            </Link>
            {state.status === 'admin' && (
              <button
                type="button"
                onClick={signOut}
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
        <div className="mx-auto grid max-w-[1280px] gap-6 py-6 lg:grid-cols-[230px_1fr]">
          {state.status === 'admin' || state.status === 'demo' ? (
            <>
              <nav aria-label="Admin" className="lg:sticky lg:top-20 lg:self-start">
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
              <Gate state={state} onSignIn={signIn} onSignOut={signOut} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Gate({ state, onSignIn, onSignOut }: { state: AdminState; onSignIn: () => void; onSignOut: () => void }) {
  return (
    <div className="mx-auto grid max-w-[480px] gap-4 rounded-2xl border border-rule bg-sheet p-8 text-center">
      {state.status === 'loading' && <p role="status">Checking your sign-in…</p>}
      {state.status === 'signed-out' && (
        <>
          <h1 className="t-h2">Staff sign-in</h1>
          <p className="text-ink-2">Sign in with your IMAS Google account to edit the Canadian Diploma website.</p>
          <button
            type="button"
            onClick={onSignIn}
            className="mx-auto inline-flex min-h-11 items-center rounded-full bg-blue px-6 font-semibold text-on-blue hover:bg-blue-deep"
          >
            Sign in with Google
          </button>
          {state.error && <p className="text-sm text-maroon">Sign-in didn’t work: {state.error}</p>}
        </>
      )}
      {state.status === 'not-admin' && (
        <>
          <h1 className="t-h2">No editing access yet</h1>
          <p className="text-ink-2">
            You are signed in as <strong className="text-ink">{state.email}</strong>, but this account is not an editor. Ask an existing editor to add
            your email under <em>Admins</em> in Supabase, then sign in again.
          </p>
          <button type="button" onClick={onSignOut} className="mx-auto rounded-full border border-rule px-5 py-2 font-semibold hover:border-blue">
            Sign out
          </button>
        </>
      )}
    </div>
  );
}
