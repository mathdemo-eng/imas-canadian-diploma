import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { getSupabase, supabaseConfigured } from '../lib/supabase';

export type AdminState =
  | { status: 'demo' }
  | { status: 'loading' }
  | { status: 'signed-out'; error?: string }
  | { status: 'not-admin'; email: string }
  | { status: 'admin'; email: string };

/** The school's Google Workspace domain. Sign-in suggests accounts from this domain. */
export const SCHOOL_DOMAIN = 'imas.edu.my';

/**
 * Who is using the admin panel. Without a database the panel runs in demo mode.
 * With one, staff sign in with Google and must be listed in the `admins` table.
 */
export function useAdminAuth() {
  const [state, setState] = useState<AdminState>(supabaseConfigured ? { status: 'loading' } : { status: 'demo' });

  useEffect(() => {
    if (!supabaseConfigured) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    async function check(session: Session | null) {
      if (cancelled) return;
      if (!session?.user.email) return setState({ status: 'signed-out' });
      const email = session.user.email.toLowerCase();
      const sb = await getSupabase();
      const { data } = await sb.from('admins').select('email').eq('email', email).maybeSingle();
      if (!cancelled) setState(data ? { status: 'admin', email } : { status: 'not-admin', email });
    }

    getSupabase()
      .then(async (sb) => {
        const { data } = await sb.auth.getSession();
        await check(data.session);
        // Supabase advises not to call it again inside this callback, so the check runs just after.
        const sub = sb.auth.onAuthStateChange((_event, session) => {
          setTimeout(() => void check(session), 0);
        });
        unsubscribe = () => sub.data.subscription.unsubscribe();
      })
      .catch((e: unknown) => setState({ status: 'signed-out', error: e instanceof Error ? e.message : String(e) }));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async () => {
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin`, queryParams: { hd: SCHOOL_DOMAIN, prompt: 'select_account' } },
    });
    if (error) setState({ status: 'signed-out', error: error.message });
  }, []);

  const signOut = useCallback(async () => {
    const sb = await getSupabase();
    await sb.auth.signOut();
    setState({ status: 'signed-out' });
  }, []);

  return { state, signIn, signOut };
}
