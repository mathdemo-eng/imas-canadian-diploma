import { useEffect, useState } from 'react';
import { demo } from './demo-backend';
import { callStudentsFunction } from './server-function';
import { getSupabase, supabaseConfigured, supabaseTarget } from './supabase';

/** Shown when a blocked student tries to sign in. The reason is never shown to the student. */
export const BLOCKED_MESSAGE = 'Your portal access is paused. Please contact the Canadian Diploma office at school.';

/** Student accounts are <Student ID>@imas.edu.my. */
export const SCHOOL_DOMAIN = 'imas.edu.my';

/** "260001" → "260001@imas.edu.my". A full email address is used as typed. */
export function loginEmail(identifier: string) {
  const v = identifier.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${SCHOOL_DOMAIN}`;
}

export interface SignedInUser {
  id: string;
  email: string;
}

export type AuthState = { status: 'loading' } | { status: 'signed-out'; error?: string } | { status: 'signed-in'; user: SignedInUser };

/** How long to wait for the sign-in service before saying it isn't answering. */
const CONNECT_TIMEOUT_MS = 15_000;

/** A plain-language reason the site couldn't reach its database and sign-in service. */
export function connectionProblem(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/supabaseUrl/i.test(msg)) {
    return `The database address saved in Netlify (VITE_SUPABASE_URL) isn’t valid: “${supabaseTarget}”. It should be the Supabase Project URL, which looks like https://abcdefghijkl.supabase.co`;
  }
  if (/supabaseKey/i.test(msg)) return 'The database key saved in Netlify (VITE_SUPABASE_ANON_KEY) is missing.';
  if (/fetch|network|load failed/i.test(msg)) {
    return `The website couldn’t reach its database at ${supabaseTarget}. Check your internet connection, and that the Supabase project isn’t paused.`;
  }
  return `The website couldn’t connect to its database (${supabaseTarget}): ${msg}`;
}

/** Who is signed in. Updates when someone signs in or out. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    if (!supabaseConfigured) {
      const update = () =>
        setState(demo.signedIn ? { status: 'signed-in', user: { id: demo.signedIn.id, email: demo.signedIn.email } } : { status: 'signed-out' });
      update();
      demo.listeners.add(update);
      return () => {
        demo.listeners.delete(update);
      };
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    // Never leave the page on "Checking your sign-in…": say what went wrong instead.
    const timer = setTimeout(() => {
      if (cancelled) return;
      setState((s) =>
        s.status === 'loading'
          ? { status: 'signed-out', error: `The sign-in service at ${supabaseTarget} didn’t answer. Check your internet connection, and that the Supabase project isn’t paused.` }
          : s,
      );
    }, CONNECT_TIMEOUT_MS);
    getSupabase()
      .then(async (sb) => {
        const apply = (s: { user: { id: string; email?: string } } | null) => {
          if (cancelled) return;
          setState(s?.user ? { status: 'signed-in', user: { id: s.user.id, email: s.user.email ?? '' } } : { status: 'signed-out' });
        };
        const { data } = await sb.auth.getSession();
        apply(data.session);
        const sub = sb.auth.onAuthStateChange((_event, session) => apply(session));
        unsubscribe = () => sub.data.subscription.unsubscribe();
      })
      .catch((e: unknown) => {
        console.error('Sign-in service unavailable', e);
        if (!cancelled) setState({ status: 'signed-out', error: connectionProblem(e) });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, []);

  return state;
}

/** Signs in with a Student ID (or staff email) and password. Returns an error message, or null. */
export async function signIn(identifier: string, password: string): Promise<string | null> {
  const email = loginEmail(identifier);
  if (!identifier.trim() || !password) return 'Enter your ID and password.';

  if (!supabaseConfigured) {
    const account = demo.accounts.get(email);
    if (!account || account.password !== password) return 'That ID or password isn’t right. Check them and try again.';
    if (demo.students.find((st) => st.id === account.id)?.blocked) return BLOCKED_MESSAGE;
    demo.signedIn = account;
    demo.notify();
    return null;
  }

  try {
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (!error) return null;
    if (/invalid login credentials/i.test(error.message)) return 'That ID or password isn’t right. Check them and try again.';
    if (/banned/i.test(error.message) || error.code === 'user_banned') return BLOCKED_MESSAGE;
    if (/email not confirmed/i.test(error.message)) return 'This account hasn’t been confirmed yet. In Supabase → Authentication → Users, confirm the user (or add it again with “Auto Confirm User” ticked).';
    if (/fetch|network/i.test(error.message)) return connectionProblem(error);
    if (/invalid api key|no api key|api key/i.test(error.message)) {
      return 'The database key saved in Netlify (VITE_SUPABASE_ANON_KEY) isn’t right. Use the publishable key from Supabase → Project Settings → API Keys, then trigger a new deploy.';
    }
    return `Sign-in didn’t work: ${error.message}`;
  } catch (e) {
    return connectionProblem(e);
  }
}

export async function signOut() {
  if (!supabaseConfigured) {
    demo.signedIn = null;
    demo.notify();
    return;
  }
  const sb = await getSupabase();
  await sb.auth.signOut();
}

/** Rules for a student's own password. Returns the rules that are not met yet. */
export function passwordProblems(password: string, studentId: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push('At least 8 characters');
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) problems.push('Letters and numbers');
  if (studentId && password.toLowerCase().includes(studentId.toLowerCase())) problems.push('Not your Student ID');
  return problems;
}

export const SAME_PASSWORD_MESSAGE = 'Choose a password that is different from your current one.';

/**
 * Saves a new password for the signed-in student. The server function sets it and records
 * that the first password has been replaced, so the portal can't be unlocked any other way.
 */
export async function changePassword(newPassword: string): Promise<string | null> {
  if (!supabaseConfigured) {
    const me = demo.signedIn;
    if (!me) return 'You are not signed in.';
    if (me.password === newPassword) return SAME_PASSWORD_MESSAGE;
    me.password = newPassword;
    const record = demo.students.find((s) => s.id === me.id);
    if (record) record.must_change_password = false;
    demo.notify();
    return null;
  }
  try {
    await callStudentsFunction({ action: 'set-password', password: newPassword });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** Staff change their own password (editors aren't asked to on first sign-in). */
export async function changeStaffPassword(newPassword: string): Promise<string | null> {
  if (newPassword.length < 8) return 'Use at least 8 characters.';
  if (!supabaseConfigured) return null;
  const sb = await getSupabase();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (!error) return null;
  if (/different from the old password/i.test(error.message)) return SAME_PASSWORD_MESSAGE;
  return `Your password wasn’t saved: ${error.message}`;
}
